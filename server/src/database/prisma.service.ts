import {
  ForbiddenException,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
  async findById(id: number) {
    return await this.user.findUnique({
      where: {
        id: id,
      },
    });
  }

  async findUserActiveByID(id: number) {
    const user = await this.user.findUnique({
      where: {
        id: id,
      },
    });
    if (user.status === 'SUSPENDED') {
      throw new ForbiddenException('Your account has been suspended');
    }
    return user;
  }
}
