import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { PayloadDto } from '../dto';
import { IUserWithRole } from '../../common/interfaces';

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

  async validate(payload: PayloadDto): Promise<IUserWithRole> {
    const user = await this.prismaService.findUserActiveByID(payload.sub);

    if (!user) {
      throw new Error('User not found');
    }

    const UserWithRole: IUserWithRole = {
      id: user.id,
      name: user.name,
      lastname: user.lastName,
      email: user.email,
      status: payload.status,
      companyName: payload.companyName,
      role: payload.role,
      createdAt: user.createdAt,
    };
    return UserWithRole;
  }
}
