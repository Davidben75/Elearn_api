import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MailModule } from 'src/mail/mail.module';
import { PrismaModule } from 'src/database/prisma.module';
import { CollaborationModule } from 'src/collaboration/collaboration.module';
import { AuthService } from 'src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [MailModule, PrismaModule, CollaborationModule],
  providers: [UserService, AuthService, JwtService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
