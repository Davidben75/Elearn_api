import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MailModule } from 'src/mail/mail.module';
import { PrismaModule } from 'src/database/prisma.module';
import { CollaborationModule } from 'src/collaboration/collaboration.module';

@Module({
  imports: [MailModule, PrismaModule, CollaborationModule],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
