import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { PayloadDto, UserWithRole } from '../dto';

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

  async validate(payload: PayloadDto): Promise<UserWithRole | null> {
    const user = await this.prismaService.findUserActiveByID(payload.sub);

    if (!user) {
      return null;
    }

    const userWithRole: UserWithRole = {
      id: user.id,
      name: user.name,
      lastname: user.lastname,
      email: user.email,
      status: user.status,
      companyName: user.company_name,
      isTutor: user.role_id === 2,
      isAdmin: user.role_id === 1,
      createdAt: user.created_at,
    };
    return userWithRole;
  }
}
