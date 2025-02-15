import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LoginDto, PayloadDto, RegisterDto } from './dto';
import { User } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class AuthService {
  constructor(
    private prismaService: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mailService: MailService,
  ) {}

  // Create a new user with role Tutor
  async register(dto: RegisterDto) {
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
      let emailSent = false;
      try {
        await this.mailService.sendUserConfirmation(dto);
        emailSent = true;
      } catch (error) {
        console.error('Failed to send confirmation email:', error);
      }

      return { user, emailSent };
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

  async login(dto: LoginDto) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: {
          email: dto.email,
        },
      });

      if (!user) {
        throw new UnauthorizedException('Credentials incorrect');
      }

      const passwordMatches = await argon.verify(user.password, dto.password);
      if (!passwordMatches) {
        throw new UnauthorizedException('Credentials incorrect');
      }

      if (user.status === 'SUSPENDED') {
        throw new UnauthorizedException('Your account has been suspended');
      }

      return this.signToken(user);
    } catch (error) {
      throw error;
    }
  }

  getRolename(roleId: number): string {
    switch (roleId) {
      case 1:
        return 'ADMIN';
      case 2:
        return 'TUTOR';
      default:
        return 'LEARNER';
    }
  }

  async signToken(user: User) {
    const payload: PayloadDto = {
      sub: user.id,
      email: user.email,
      status: user.status,
      companyName: user.companyName,
      role: this.getRolename(user.roleId),
    };
    const token = await this.jwt.signAsync(payload, {
      expiresIn: '12h',
      secret: this.config.get('JWT_SECRET'),
    });
    return {
      token,
      user: {
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        companyName: user.companyName,
        status: user.status,
        role: this.getRolename(user.roleId),
      },
    };
  }
}
