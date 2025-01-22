import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { MailModule } from './mail/mail.module';
import { PrismaModule } from './database/prisma.module';
import { CourseModule } from './course/course.module';
import { CollaborationModule } from './collaboration/collaboration.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { EnrollmentModule } from './enrollment/enrollment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/course/files',
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    MailModule,
    CourseModule,
    CollaborationModule,
    EnrollmentModule,
  ],
})
export class AppModule {}
