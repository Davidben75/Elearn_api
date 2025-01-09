import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as argon from 'argon2';
import { RegisterDto } from '../auth/dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { generate } from 'generate-password-ts';
import { LearnerRegisterDto, UpdatePasswordDto, UpdateUserDto } from './dto';
import { MailService } from '../mail/mail.service';
import { ISendLearnerCredentials } from '../common/interfaces';
import { IUserWithRole } from '../common/interfaces';
import { CollaborationService } from '../collaboration/collaboration.service';
import { UserStatus } from '@prisma/client';
import { ISendMail } from 'src/common/interfaces/send-mail.interface';

@Injectable()
export class UserService {
  constructor(
    private prismaService: PrismaService,
    private mailService: MailService,
    private collaborationService: CollaborationService,
  ) {}

  // Create a new user with role Tutor
  async createTutor(dto: RegisterDto) {
    try {
      const hash = await argon.hash(dto.password);
      dto.password = hash;
      const user = await this.prismaService.user.create({
        data: {
          name: dto.name,
          lastName: dto.lastName,
          email: dto.email,
          password: dto.password,
          companyName: dto.companyName,
          roleId: 2,
          status: 'ACTIVE',
        },
      });
      delete user.password;
      return user;
    } catch (error) {
      console.log('error USER SERVICE' + error);
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Email already in use');
        }
        throw Error('Unable to register the new user');
      }
      throw error;
    }
  }

  // Create a new user with role Learner
  async createLearner(data: LearnerRegisterDto, tutor: IUserWithRole) {
    const temporaryPassword = await this.generatePassword();
    const hash = await argon.hash(temporaryPassword);
    data.password = hash;

    try {
      const user = await this.prismaService.user.create({
        data: {
          name: data.name,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
          companyName: tutor.companyName,
          roleId: 3,
          status: 'INACTIVE',
        },
      });

      delete user.password;
      console.log('User created:', user);

      let emailSent = false;

      // Sent email to learner
      try {
        const mailInfo: ISendLearnerCredentials = {
          name: data.name,
          lastName: data.lastName,
          email: data.email,
          temporaryPassword,
          tutorName: tutor.name,
          tutorLastName: tutor.lastname,
        };
        console.log(mailInfo);
        await this.mailService.sendLearnerCredentials(mailInfo);
        console.log('Email sent successfully to:', mailInfo.email);
        emailSent = true;
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Email sending failed, but we'll continue without throwing an error
      }

      // Add new collaboration
      await this.collaborationService.addNewCollaboration({
        learnerId: user.id,
        tutorId: tutor.id,
      });

      return {
        user,
        // Only for testing
        //temporaryPassword,
        emailSent,
      };
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ForbiddenException('Email already in use');
      }
      console.error('Error in createLearner:', error);
      throw new Error('Failed to create learner');
    }
  }

  // Change password
  async updatePassword(dto: UpdatePasswordDto, id: number) {
    try {
      const user = await this.findUserById(id);

      const passwordMatches = await argon.verify(
        user.password,
        dto.oldPassword,
      );

      if (!passwordMatches) {
        throw new ForbiddenException('Old password is incorrect');
      }

      if (dto.newPassword === dto.oldPassword) {
        throw new BadRequestException(
          'New password cannot be the same as the old password',
        );
      }

      const newstatus = this.updateStatus(user.status);

      const hash = await argon.hash(dto.newPassword);
      const updatedUser = await this.prismaService.user.update({
        where: {
          id: user.id,
        },
        data: {
          password: hash,
          status: newstatus,
        },
      });

      delete updatedUser.password;
      delete user.roleId;

      // Send when password has been updated
      let emailSent = false;
      try {
        const emailData: ISendMail = {
          email: updatedUser.email,
          name: updatedUser.name,
          lastName: updatedUser.lastName,
        };
        await this.mailService.sendUserInformationHasBeenUpdated(
          emailData,
          true,
        );
        emailSent = true;
      } catch (emailError) {
        console.log(emailError);
      }
      return { updatedUser, emailSent };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      console.error('Error in updatePassword:', error);
      throw new BadRequestException(
        'Something went wrong when changing password',
      );
    }
  }

  private updateStatus(currentStatus: UserStatus): UserStatus {
    return currentStatus === 'INACTIVE' ? 'ACTIVE' : currentStatus;
  }

  // Find user by email
  async findUserByMail(email: string) {
    return await this.prismaService.user.findUnique({
      where: {
        email: email,
      },
    });
  }

  //Update userInfo
  async updateUserInfo(id: number, dto: UpdateUserDto) {
    try {
      const currentUser = await this.findUserById(id);
      const updatedUser: Partial<UpdateUserDto> = {};

      Object.keys(dto).forEach((key) => {
        if (dto[key] !== '' && dto[key] !== undefined && dto[key] !== null) {
          updatedUser[key] = dto[key];
        }
      });

      if (Object.keys(updatedUser).length === 0) {
        delete currentUser.password;
        delete currentUser.roleId;
        return currentUser;
      }

      const user = await this.prismaService.user.update({
        where: {
          id: id,
        },
        data: {
          ...updatedUser,
        },
      });

      delete user.password;
      delete user.roleId;

      // Send the mail
      let emailSent = false;

      try {
        const emailData: ISendMail = {
          name: user.name,
          lastName: user.lastName,
          email: user.email,
        };
        await this.mailService.sendUserInformationHasBeenUpdated(emailData);
        emailSent = true;
      } catch (errorMail) {
        console.log(errorMail);
      }
      return { user, emailSent };
    } catch (error) {
      console.error('Error in updateUserInfo:', error);
      throw new BadRequestException('Something went wrong');
    }
  }

  // Find user by id
  async findUserById(id: number) {
    return await this.prismaService.user.findUnique({
      where: {
        id: id,
      },
    });
  }

  // Delete user by id
  async deleteUser(id: number, user: IUserWithRole) {
    try {
      if (user.role === 'ADMIN') {
        await this.prismaService.user.delete({
          where: {
            id: id,
          },
        });
      } else if (user.role === 'TUTOR' || user.role === 'LEARNER') {
        if (user.id === id) {
          await this.prismaService.user.delete({
            where: {
              id: id,
            },
          });
        }
      } else {
        throw new ForbiddenException(
          'You are not authorized to perform this action',
        );
      }
    } catch (error) {
      console.error('Error in deleteById:', error);
      throw new BadRequestException('Something went wrong');
    }
  }

  // Learner delete account

  // Tutor delete account

  // Admin delete account

  // Generate password
  async generatePassword(): Promise<string> {
    return await generate({
      length: 10,
      numbers: true,
      uppercase: true,
      lowercase: true,
      symbols: true,
    });
  }
}
