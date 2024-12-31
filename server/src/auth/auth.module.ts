import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategy';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from 'src/database/prisma.module';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [JwtModule.register({}), MailModule, PrismaModule, UserModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
