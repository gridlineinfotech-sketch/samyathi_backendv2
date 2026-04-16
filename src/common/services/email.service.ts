import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const provider = process.env.EMAIL_PROVIDER || 'smtp';

    switch (provider) {
      case 'sendgrid':
        this.transporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY },
        });
        break;
      case 'ses':
        this.transporter = nodemailer.createTransport({
          host: process.env.AWS_SES_HOST || 'email-smtp.us-east-1.amazonaws.com',
          port: 587,
          auth: { user: process.env.AWS_SES_ACCESS_KEY_ID, pass: process.env.AWS_SES_SECRET_ACCESS_KEY },
        });
        break;
      case 'mailgun':
        this.transporter = nodemailer.createTransport({
          host: 'smtp.mailgun.org',
          port: 587,
          auth: { user: process.env.MAILGUN_USER, pass: process.env.MAILGUN_API_KEY },
        });
        break;
      default:
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
    }
  }

  async sendEmail(options: Mail.Options): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM || '"Pilgrim App" <no-reply@pilgrim.com>',
        ...options,
      });
      this.logger.log(`Email sent to ${options.to}`);
    } catch (error) {
      this.logger.error('Failed to send email:', error.message);
      throw error;
    }
  }

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Your Login OTP - Pilgrim App',
      text: `Your OTP: ${otp}\nValid for 5 minutes.`,
      html: `<p>Your OTP: <b>${otp}</b></p><p>Valid for 5 minutes.</p>`,
    });
  }
}
