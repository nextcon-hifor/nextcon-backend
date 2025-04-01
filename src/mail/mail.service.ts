import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailVerification } from './emailVerification.entity';
// 이메일 전송에 필요한 데이터 타입 정의
export interface CreateParticipantEmailData {
  hostName: string;      // 호스트 이름
  eventTitle: string;    // 이벤트 제목
  eventDate: string;     // 이벤트 날짜 (필요 시 포맷 변환 고려)
  eventLocation: string; // 이벤트 장소
  participantName: string; // 참가자 이름
  eventId: number;       // 이벤트 ID (관리 페이지 링크 생성용)
}
@Injectable()
export class EmailService {
  private transporter;
  private mailOptions;

  constructor(private readonly configService: ConfigService,
              @InjectRepository(EmailVerification)
              private readonly emailRepo: Repository<EmailVerification>,) {

    // SMTP 설정
    this.transporter = nodemailer.createTransport({
      host: 'smtp.naver.com', // 네이버 SMTP 서버
      port: 587, // SMTP 포트 (SSL 보안 사용 시 465, 아니면 587)
      secure: false, // SSL 보안 여부
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // 전역 mailOptions 기본 설정
    this.mailOptions = {
      from: process.env.EMAIL_USER, // 발신자 이메일 주소
    };
  }

  // Generate and Send Email Verification Code
  async sendVerificationEmail(email: string): Promise<{ message: string }> {
    // Generate 6-character random code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Delete any existing verification code for this email
    await this.emailRepo.delete({ email });

    // Save new verification code
    const verification = this.emailRepo.create({ email, code });
    await this.emailRepo.save(verification);

    // Email sending options
    const mailOptions = {
      from: this.configService.get<string>('EMAIL_USER'),
      to: email,
      subject: 'Email Verification Code',
      text: `Your verification code is: ${code}. Please enter this code within 10 minutes.`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Verification code sent to ${email}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Failed to send verification email. Please try again.');
    }

    return { message: 'A verification code has been sent to your email.' };
  }

// Send reset password email
  async sendResetPasswordEmail(recipientEmail: string, newPassword: string): Promise<void> {
    const mailOptions = {
      ...this.mailOptions,
      to: recipientEmail, // Recipient email address
      subject: 'Password Reset Instructions',
      text: `Your temporary password: ${newPassword}\nPlease log in and change your password immediately.`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Temporary password email sent to ${recipientEmail}`);
    } catch (error) {
      console.error('Failed to send reset password email:', error);
      throw new Error('Failed to send password reset email. Please try again.');
    }
  }
// Send contact form email
async sendContactEmail(
  title: string,
  phone: string,
  email: string,
  message: string,
  file?: Express.Multer.File,
): Promise<void> {
  const mailOptions: nodemailer.SendMailOptions = {
    ...this.mailOptions,
    from: process.env.EMAIL_USER, // Sender email
    to: process.env.EMAIL_USER, // Recipient (self)
    subject: `Inquiry: ${title}`,
    text: `Inquiry Details:\n\n
  Subject: ${title}\n
  Phone: ${phone}\n
  Email: ${email}\n
  Message:\n${message}\n
  `,
    attachments: file
      ? [
        {
          filename: file.originalname,
          content: Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer), // Convert Buffer
        },
      ]
      : [],
  };

  try {
    await this.transporter.sendMail(mailOptions);
    console.log(`Inquiry email sent successfully.`);
  } catch (error) {
    console.error('Failed to send inquiry email:', error);
    throw new Error('Failed to send inquiry email. Please try again.');
  }
}

// 승인 이메일 전송 메서드
async sendApprovedEmail(
  recipientEmail: string,
  emailData: {
    guestName: string;
    eventTitle: string;
    eventDate: string;
    eventLocation: string;
    eventId: number;
  },
): Promise<void> {
  const { guestName, eventTitle, eventDate, eventLocation, eventId } = emailData;
  const frontendUrl = this.configService.get<string>('FRONTEND_URL');
  const mailOptions = {
    ...this.mailOptions,
    to: recipientEmail,
    subject: '[HiFor] Your event participation is approved!',
    // HTML 템플릿(텍스트 템플릿도 가능)
    html: `
      <p>Hello ${guestName},</p>
      <p>Great news! Your participation for the event has been approved.</p>
      <p>
        <strong>Event:</strong> ${eventTitle}<br/>
        <strong>Date:</strong> ${eventDate}<br/>
        <strong>Location:</strong> ${eventLocation}
      </p>
      <p>You're all set! See you at the event.</p>
      <br>
      <p>
        <a href="${frontendUrl}/gathering/${eventId}" style="padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none;">View Event Details</a>
      </p>
      <br>
      <p>Best,<br/>The HiFor Team</p>
    `,
  };

  try {
    await this.transporter.sendMail(mailOptions);
    console.log(`Approved email sent to ${recipientEmail}`);
  } catch (error) {
    console.error('Error sending approved email:', error);
    throw new Error('Error sending approved email');
  }
}

// 거절 이메일 전송 메서드
async sendRejectedEmail(
  recipientEmail: string,
  emailData: { guestName: string; eventTitle: string },
): Promise<void> {
  const frontendUrl = this.configService.get<string>('FRONTEND_URL');
  const { guestName, eventTitle } = emailData;
  const mailOptions = {
    ...this.mailOptions,
    to: recipientEmail,
    subject: '[HiFor] Your event application was declined',
    html: `
      <p>Hello ${guestName},</p>
      <p>Unfortunately, your application for <strong>${eventTitle}</strong> was not approved this time.</p>
      <p>Don't worry—there are plenty of other events waiting for you on HiFor.</p>
      <br>
      <p>
        <a href="${frontendUrl}" style="padding: 10px 20px; background-color: #28a745; color: #fff; text-decoration: none;">Find Other Events</a>
      </p>
      <br>
      <p>Best,<br/>The HiFor Team</p>
    `,
  };

  try {
    await this.transporter.sendMail(mailOptions);
    console.log(`Rejected email sent to ${recipientEmail}`);
  } catch (error) {
    console.error('Error sending rejected email:', error);
    throw new Error('Error sending rejected email');
  }
}

async sendCreatePartiEmail(
  recipientEmail: string,
  data: CreateParticipantEmailData,
): Promise<void> {
  const { hostName, eventTitle, eventDate, eventLocation, participantName, eventId } = data;

  // 메일 제목
  const subject = '[HiFor] A new participant has signed up!';


  // HTML 포맷의 메일 본문 작성
  const htmlContent = `
    <p>Hello ${hostName},</p>
    <p>A new participant has just signed up for your event!</p>
    <p><strong>Event:</strong> ${eventTitle}</p>
    <p><strong>Participant:</strong> ${participantName}</p>
    <p>You can now approve or decline their request. Check your event dashboard and welcome your new member!</p>
    <br>
    <br>
    <p>Best,<br/>The HiFor Team</p>
  `;

  // 메일 옵션 설정
  const mailOptions = {
    ...this.mailOptions,
    to: recipientEmail,
    subject,
    html: htmlContent,
  };

  // 메일 전송
  try {
    await this.transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${recipientEmail}`);
  } catch (error) {
    console.error('Error sending create participant email:', error);
    throw error;
  }
}

async sendEventDeletionEmail(email: string, reason: string): Promise<void> {
  try {
    await this.transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email, // 수신자 이메일
      subject: 'Event Deletion Notification',
      text: `The event you were registered for has been deleted for the following reason:\n\n${reason}\n\nWe apologize for the inconvenience.`,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email.');
  }
}
}
