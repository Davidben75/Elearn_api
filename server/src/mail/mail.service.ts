import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { RegisterDto } from '../auth/dto';
import { ISendLearnerCredentials } from '../common/interfaces';
import { ISendMail } from 'src/common/interfaces/send-mail.interface';

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

  async sendLearnerCredentials(dto: ISendLearnerCredentials) {
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
      console.error('Detailed error in  sendLearnerCredentials :', error);
      throw new Error(`Failed to send email to ${dto.email}`);
    }
  }

  async sendUserInformationHasBeenUpdated(
    info: ISendMail,
    passwordUpdated: boolean = false,
  ) {
    try {
      console.log('Preparing to send email to:', info.email);

      const subject = passwordUpdated
        ? 'Your password has been updated'
        : 'Your account information has been updated';

      const template = passwordUpdated ? 'password-updated' : 'info-updated';

      return await this.mailerService.sendMail({
        to: info.email,
        from: 'noreply@lms.com',
        subject,
        template,
        context: {
          name: info.name,
          lastName: info.lastName,
        },
      });
    } catch (error) {
      console.error('Detailed error in sendLearnerCredentials:', error);
      throw new Error(`Error sending learner credentials email ; ${error}`);
    }
  }
}
