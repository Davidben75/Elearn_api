import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as argon from 'argon2';
import { AuthService } from '../auth.service';
import { UserService } from '../../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../database/prisma.service';
import { UserStatus } from '@prisma/client';

describe('AuthService - login', () => {
  let authService: AuthService;
  let userService: UserService;

  const mockPrismaService = {}; // Mock of prismaService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            findUserByMail: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {},
        },
        {
          provide: MailService,
          useValue: {
            sendUserConfirmation: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
  });

  it('should throw ForbiddenException if user does not exist', async () => {
    // Mock findUserByMail should return null (no user found)
    jest.spyOn(userService, 'findUserByMail').mockResolvedValue(null);

    const dto = { email: 'test@example.com', password: 'password123' };

    await expect(authService.login(dto)).rejects.toThrow(
      new ForbiddenException('Credentials incorrect'),
    );
  });

  it('should throw ForbiddenException if password is incorrect', async () => {
    const hashedPassword = await argon.hash('password123');

    const mockUser = {
      id: 1,
      name: 'Jhon',
      lastName: 'Doe',
      email: 'test@example.com',
      password: hashedPassword,
      status: UserStatus.ACTIVE,
      companyName: 'Test Company',
      roleId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock findUserByMail should return a user
    jest.spyOn(userService, 'findUserByMail').mockResolvedValue(mockUser);

    // Mock argon.verify should return false (wrong password)
    jest.spyOn(argon, 'verify').mockResolvedValue(false);

    const dto = { email: 'test@example.com', password: 'wrongPassword' };

    await expect(authService.login(dto)).rejects.toThrow(
      new ForbiddenException('Credentials incorrect'),
    );
  });

  it('should throw UnauthorizedException if user account is suspended', async () => {
    const hashedPassword = await argon.hash('password123');

    const mockUser = {
      id: 1,
      name: 'Jhon',
      lastName: 'Doe',
      email: 'test@example.com',
      password: hashedPassword,
      status: UserStatus.SUSPENDED,
      companyName: 'Test Company',
      roleId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    jest.spyOn(userService, 'findUserByMail').mockResolvedValue(mockUser);

    // Mock argon.verify return true (password match)
    jest.spyOn(argon, 'verify').mockResolvedValue(true);

    const dto = { email: 'test@example.com', password: 'password123' };

    await expect(authService.login(dto)).rejects.toThrow(
      new UnauthorizedException('Your account has been suspended'),
    );
  });

  it('should return a signed token if credentials are valid', async () => {
    const hashedPassword = await argon.hash('password123');

    const mockUser = {
      id: 1,
      name: 'Jhon',
      lastName: 'Doe',
      email: 'test@example.com',
      password: hashedPassword,
      status: UserStatus.ACTIVE,
      companyName: 'Test Company',
      roleId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    jest.spyOn(userService, 'findUserByMail').mockResolvedValue(mockUser);

    // Mock argon.verify pour retourner true (mot de passe correct)
    jest.spyOn(argon, 'verify').mockResolvedValue(true);

    // Mock result
    const mockTokenAndUser = {
      token: 'token123',
      user: {
        name: 'Jhon',
        lastName: 'Doe',
        email: 'test@example.com',
        companyName: 'Test Company',
        role: 'admin',
      },
    };
    jest.spyOn(authService, 'signToken').mockResolvedValue(mockTokenAndUser);

    const dto = { email: 'test@example.com', password: 'password123' };

    const result = await authService.login(dto);

    expect(userService.findUserByMail).toHaveBeenCalledWith(dto.email);

    expect(result).toHaveProperty('token');
  });
});
