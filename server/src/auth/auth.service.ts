import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LoginDto, PayloadDto, RegisterDto } from './dto';
import { User } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { MailService } from '../mail/mail.service';
import * as argon from 'argon2';

@Injectable()
export class AuthService {
  constructor(
    private prismaService: PrismaService,
    private userService: UserService,
    private jwt: JwtService,
    private config: ConfigService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const newTutor = await this.userService.createTutor(dto);
    try {
      await this.mailService.sendUserConfirmation(dto);
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
    }
    return newTutor;
  }

  async login(dto: LoginDto) {
    try {
      const user = await this.userService.findUserByMail(dto.email);

      if (!user) {
        throw new ForbiddenException('Credentials incorrect');
      }

      const passwordMatches = await argon.verify(user.password, dto.password);
      if (!passwordMatches) {
        throw new ForbiddenException('Credentials incorrect');
      }

      return this.signToken(user);
    } catch (error) {
      throw error;
    }
  }

  async signToken(user: User): Promise<{ access_token: string }> {
    const payload: PayloadDto = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      status: user.status,
      companyName: user.companyName,
    };
    const token = await this.jwt.signAsync(payload, {
      expiresIn: '12h',
      secret: this.config.get('JWT_SECRET'),
    });
    return {
      access_token: token,
    };
  }
}
