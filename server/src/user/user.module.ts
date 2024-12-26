import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaService } from 'src/database/prisma.service';
import { MailService } from 'src/mail/mail.service';

@Module({
  providers: [UserService, PrismaService, MailService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
