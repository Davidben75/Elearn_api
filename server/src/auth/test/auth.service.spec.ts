import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import * as argon from 'argon2';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../mail/mail.service'; // Ajouter MailService
import { UserStatus } from '@prisma/client';

describe('AuthService - login', () => {
  let authService: AuthService;
  let prismaService: PrismaService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('token123'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mocked_jwt_secret'),
          },
        },
        {
          provide: MailService,
          useValue: { sendUserConfirmation: jest.fn() },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should throw UnauthorizedException if user does not exist', async () => {
    jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

    const dto = { email: 'test@example.com', password: 'password123' };

    await expect(authService.login(dto)).rejects.toThrow(
      new UnauthorizedException('Credentials incorrect'),
    );
  });

  it('should throw UnauthorizedException if password is incorrect', async () => {
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

    jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);
    jest.spyOn(argon, 'verify').mockResolvedValue(false);

    const dto = { email: 'test@example.com', password: 'wrongPassword' };

    await expect(authService.login(dto)).rejects.toThrow(
      new UnauthorizedException('Credentials incorrect'),
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

    jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);
    jest.spyOn(argon, 'verify').mockResolvedValue(true);

    const dto = { email: 'test@example.com', password: 'password123' };

    await expect(authService.login(dto)).rejects.toThrow(
      new UnauthorizedException('Your account has been suspended'),
    );
  });

  it('should return a signed token and user if credentials are valid', async () => {
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

    jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser);
    jest.spyOn(argon, 'verify').mockResolvedValue(true);
    jest.spyOn(authService, 'getRolename').mockReturnValue('ADMIN');

    const dto = { email: 'test@example.com', password: 'password123' };

    const result = await authService.login(dto);

    expect(prismaService.user.findUnique).toHaveBeenCalledWith({
      where: { email: dto.email },
    });

    expect(result).toEqual({
      token: 'token123',
      user: {
        name: 'Jhon',
        lastName: 'Doe',
        email: 'test@example.com',
        companyName: 'Test Company',
        role: 'ADMIN',
        status: UserStatus.ACTIVE,
      },
    });
  });
});
