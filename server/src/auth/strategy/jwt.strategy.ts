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

  async validate(payload: PayloadDto): Promise<IUserWithRole | null> {
    const user = await this.prismaService.findUserActiveByID(payload.sub);

    if (!user) {
      return null;
    }

    const UserWithRole: IUserWithRole = {
      id: user.id,
      name: user.name,
      lastname: user.lastname,
      email: user.email,
      status: user.status,
      companyName: user.company_name,
      role: this.getRolename(user.role_id),
      createdAt: user.created_at,
    };
    return UserWithRole;
  }

  private getRolename(roleId: number): string {
    switch (roleId) {
      case 1:
        return 'ADMIN';
      case 2:
        return 'TUTOR';
      default:
        return 'LEARNER';
    }
  }
}
//  Create a decorator that check if the isTutor if not go find the collaborator table and check if the collaborator is active and retriev the tutorId
