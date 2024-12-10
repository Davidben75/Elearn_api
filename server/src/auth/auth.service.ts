import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { LoginDto, PayloadDto, RegisterDto } from './dto';
import * as argon from 'argon2';
import { User } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
@Injectable()
export class AuthService {
  constructor(
    private prismaService: PrismaService,
    private userService: UserService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    try {
      const hash = await argon.hash(dto.password);
      dto.password = hash;
      const user = await this.userService.createTutor(dto);
      delete user.password;
      return user;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Email already in use');
        }
      }
      throw error;
    }
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
      roleId: user.role_id,
      status: user.status,
      companyName: user.company_name,
    };
    const token = await this.jwt.signAsync(payload, {
      expiresIn: '1h',
      secret: this.config.get('JWT_SECRET'),
    });
    return {
      access_token: token,
    };
  }
}
