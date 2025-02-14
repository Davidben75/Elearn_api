import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as argon from 'argon2';
import { RegisterDto } from '../auth/dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { generate } from 'generate-password-ts';
import { LearnerRegisterDto, UpdatePasswordDto, UpdateUserDto } from './dto';
import { MailService } from '../mail/mail.service';
import { ICollaboration, ISendLearnerCredentials } from '../common/interfaces';
import { IUserWithRole } from '../common/interfaces';
import { CollaborationService } from '../collaboration/collaboration.service';
import { ISendMail } from 'src/common/interfaces/send-mail.interface';
import { Prisma } from '@prisma/client';

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
    const temporaryPassword = this.generatePassword();
    const hash = await argon.hash(temporaryPassword);
    data.password = hash;

    try {
      const result = await this.prismaService.$transaction(async (prisma) => {
        // New user creation
        const user = await prisma.user.create({
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

        const collaborationInfo: ICollaboration = {
          learnerId: user.id,
          tutorId: tutor.id,
          status: 'ACTIVE',
        };

        // Add new collaboration
        await this.collaborationService.addNewCollaboration(
          collaborationInfo,
          prisma,
        );

        return user;
      });

      delete result.password;
      console.log('User created:', result);

      let emailSent = false;

      // Sent email with temporary password
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
      }

      return {
        user: result,
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

      const newstatus = user.status === 'INACTIVE' ? 'ACTIVE' : user.status;

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
      if (!currentUser) {
        throw new NotFoundException('User not found');
      }
      const updatedUser: Prisma.UserUpdateInput = {
        name: dto.name,
        lastName: dto.lastName,
        companyName: dto.companyName,
        email: dto.email,
      };

      Object.keys(updatedUser).forEach(
        (key) => updatedUser[key] === undefined && delete updatedUser[key],
      );

      if (Object.keys(updatedUser).length === 0) {
        throw new BadRequestException('No valid fields to update');
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
      if (error instanceof BadRequestException || NotFoundException) {
        throw error;
      }
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

  // DELETE
  private async deleteUserById(id: number) {
    await this.prismaService.user.delete({
      where: { id },
    });
  }

  async deleteUserAccount(id: number, user: IUserWithRole) {
    try {
      switch (user.role) {
        case 'LEARNER':
          await this.learnerDeleteAccount(id, user.id);
          break;
        case 'TUTOR':
          await this.tutorDeleteAccount(id, user.id);
          break;
        case 'ADMIN':
          if (id === user.id) {
            throw new ForbiddenException('Admin can not delete himself');
          }
          await this.deleteUserById(id);
          break;
        default:
          throw new ForbiddenException('Your role is not defined');
      }
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException('Unable to delete the user account');
    }
  }

  private async learnerDeleteAccount(id: number, userId: number) {
    if (id !== userId) {
      throw new ForbiddenException(
        'You are not allowed to perform this action',
      );
    }
    await this.deleteUserById(id);
  }

  private async tutorDeleteAccount(id: number, userId: number) {
    const isSelfDelete = id === userId;
    if (!isSelfDelete) {
      const collaboration = await this.prismaService.collaboration.findFirst({
        where: {
          tutorId: userId,
          learnerId: id,
        },
      });
      if (!collaboration) {
        throw new NotFoundException(
          'User does not exist or is not associated with this tutor',
        );
      }
    }
    await this.deleteUserById(id);
  }

  // ADMIN SUSPEND USER
  async toggleUserSuspension(userToToggleId: number, admin: IUserWithRole) {
    try {
      // Prevent self-suspension

      if (userToToggleId === admin.id) {
        throw new BadRequestException(
          'Administrators cannot suspend/unsuspend themselves',
        );
      }

      const userToToggle = await this.findUserById(userToToggleId);
      if (!userToToggle) {
        throw new NotFoundException('User not found');
      }

      // Determine the new status
      const newStatus =
        userToToggle.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';

      // Perform the status toggle
      const user = await this.prismaService.user.update({
        where: { id: userToToggleId },
        data: { status: newStatus },
        select: {
          id: true,
          name: true,
          lastName: true,
          email: true,
          status: true,
        },
      });

      const message = `User ${newStatus === 'ACTIVE' ? 'unsuspended' : 'suspended'} successfully`;
      return { user, message };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new BadRequestException('Error toggling user suspension status');
    }
  }

  // ADMIN GET ALL USERS
  async getAllUsers() {
    try {
      const users = await this.prismaService.user.findMany({
        where: {
          role: {
            id: {
              in: [2, 3],
            },
          },
        },
        select: {
          name: true,
          lastName: true,
          email: true,
          status: true,
          role: {
            select: {
              name: true,
            },
          },
        },
      });

      console.log(users);
      return users;
    } catch (error) {
      console.log('ERROR in getAllUsers', error);
      throw new BadRequestException('Errror fetching users');
    }
  }

  // Generate password
  generatePassword(): string {
    return generate({
      length: 12,
      numbers: true,
      uppercase: true,
      lowercase: true,
      strict: true,
      symbols: '!@#$%^&*()',
    });
  }
}
