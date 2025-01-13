import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TutorIdGuard implements CanActivate {
  constructor(private prismaService: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (user.role === 'TUTOR' || user.role === 'ADMIN') {
      request.tutorId = user.id;
    } else {
      const collaboration = await this.prismaService.collaboration.findFirst({
        where: {
          learnerId: user.id,
        },
        select: {
          tutorId: true,
        },
      });
      if (collaboration) {
        request.tutorId = collaboration.tutorId;
      } else {
        throw new ForbiddenException('You are not link to a tutor');
      }
    }
    return true;
  }
}
