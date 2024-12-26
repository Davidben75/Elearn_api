import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { RegisterDto } from '../auth/dto';
import { SendLearnerCredentialsDto } from './dto/send-learner-credentials.interface';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendUserConfirmation(registerDto: RegisterDto) {
    try {
      const loginUrl = `http://localhost:3000/auth/login`;
      await this.mailerService.sendMail({
        to: registerDto.email,
        from: 'noreply@lms.com',
        subject: 'Welcome to LMS!',
        template: 'welcome',
        context: {
          name: registerDto.name,
          lastName: registerDto.lastName,
          loginUrl,
        },
      });
    } catch (error) {
      throw new Error(`Error sending welcome email ; ${error}`);
    }
  }

  async sendLearnerCredentials(dto: SendLearnerCredentialsDto) {
    console.log('Received DTO in MailService:', JSON.stringify(dto, null, 2));
    try {
      const loginUrl = `http://localhost:3000/auth/login`;
      console.log('Preparing to send email to:', dto.email);
      await this.mailerService.sendMail({
        to: dto.email,
        from: 'noreply@lms.com',
        subject: 'Welcome to LMS!',
        template: 'learner-credentials',
        context: {
          name: dto.name,
          lastName: dto.lastName,
          loginUrl,
          email: dto.email,
          temporaryPassword: dto.temporaryPassword,
          tutorName: dto.tutorName,
          tutorLastName: dto.tutorLastName,
        },
      });
      console.log('Email sent successfully');
    } catch (error) {
      console.error('Detailed error in sendLearnerCredentials:', error);
      throw new Error(`Error sending learner credentials email ; ${error}`);
    }
  }
}
