import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as argon from 'argon2';
import { AuthService } from '../auth.service';
import { UserService } from '../../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../database/prisma.service';

describe('AuthService - login', () => {
  let authService: AuthService;
  let userService: UserService;

  const mockPrismaService = {}; // Mock minimal pour PrismaService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            findUserByMail: jest.fn(), // Mock de la méthode findUserByMail
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
          provide: PrismaService, // Fournir PrismaService comme dépendance mockée
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
  });

  it('should throw ForbiddenException if user does not exist', async () => {
    // Mock findUserByMail pour retourner null (utilisateur non trouvé)
    jest.spyOn(userService, 'findUserByMail').mockResolvedValue(null);

    const dto = { email: 'test@example.com', password: 'password123' };

    await expect(authService.login(dto)).rejects.toThrow(
      new ForbiddenException('Credentials incorrect'),
    );
  });

  it('should throw ForbiddenException if password is incorrect', async () => {
    // Mock findUserByMail pour retourner un utilisateur
    jest
      .spyOn(userService, 'findUserByMail')
      .mockResolvedValue({ password: 'hashedPassword' } as any);

    // Mock argon.verify pour retourner false (mot de passe incorrect)
    jest.spyOn(argon, 'verify').mockResolvedValue(false);

    const dto = { email: 'test@example.com', password: 'wrongPassword' };

    await expect(authService.login(dto)).rejects.toThrow(
      new ForbiddenException('Credentials incorrect'),
    );
  });

  it('should throw UnauthorizedException if user account is suspended', async () => {
    jest
      .spyOn(userService, 'findUserByMail')
      .mockResolvedValue({ status: 'SUSPENDED' } as any);

    // Mock argon.verify pour retourner true (mot de passe correct)
    jest.spyOn(argon, 'verify').mockResolvedValue(true);

    const dto = { email: 'test@example.com', password: 'password123' };

    await expect(authService.login(dto)).rejects.toThrow(
      new UnauthorizedException('Your account has been suspended'),
    );
  });

  it('should return a signed token if credentials are valid', async () => {
    // Mock findUserByMail pour retourner un utilisateur valide

    jest
      .spyOn(userService, 'findUserByMail')
      .mockResolvedValue({ email: 'hello@world.com' } as any);

    // Mock argon.verify pour retourner true (mot de passe correct)
    jest.spyOn(argon, 'verify').mockResolvedValue(true);

    // Mock signToken pour retourner un token fictif
    const mockToken = { token: 'fake-jwt-token' };
    jest.spyOn(authService, 'signToken').mockResolvedValue(mockToken as any);

    const dto = { email: 'hello@world.com', password: '123456789' };

    // Appel de la méthode login
    const result = await authService.login(dto);

    // Vérifiez que findUserByMail a été appelé
    expect(userService.findUserByMail).toHaveBeenCalledWith(dto.email);

    // Vérifiez que le résultat contient une clé `access_token`
    expect(result).toHaveProperty('token');
  });
});
