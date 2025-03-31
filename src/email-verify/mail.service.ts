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

}
