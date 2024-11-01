import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { UserWithRole } from '../dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private prismaService: PrismaService,
    private readonly config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  async validate(payload): Promise<UserWithRole | null> {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: payload.sub,
        status: 'active',
      },
    });

    if (!user) {
      return null;
    }

    const userWithRole: UserWithRole = { ...user, isTutor: user.role_id === 1 };
    return userWithRole;
  }
}
