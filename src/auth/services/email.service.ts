import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private fromEmail: string;
  private appUrl: string;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    this.fromEmail = this.configService.get<string>('SMTP_FROM', 'noreply@meditory.com');
    this.appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');

    // Create transporter
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: user && pass ? {
        user,
        pass,
      } : undefined,
    });
  }

  /**
   * Send email verification link
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${this.appUrl}/auth/verify?token=${token}`;

    await this.transporter.sendMail({
      from: this.fromEmail,
      to: email,
      subject: 'Verify Your Email - Meditory ERP',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
            <h2 style="color: #2c3e50; margin-top: 0;">Verify Your Email Address</h2>
            <p>Thank you for registering with Meditory ERP. Please click the button below to verify your email address:</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}"
                 style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Email
              </a>
            </div>

            <p style="color: #7f8c8d; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${verificationUrl}" style="color: #3498db; word-break: break-all;">${verificationUrl}</a>
            </p>

            <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
              This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        Verify Your Email Address

        Thank you for registering with Meditory ERP. Please verify your email address by clicking the link below:

        ${verificationUrl}

        This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
      `,
    });
  }

  /**
   * Send password reset link
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${this.appUrl}/auth/reset-password?token=${token}`;

    await this.transporter.sendMail({
      from: this.fromEmail,
      to: email,
      subject: 'Reset Your Password - Meditory ERP',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
            <h2 style="color: #2c3e50; margin-top: 0;">Reset Your Password</h2>
            <p>We received a request to reset your password for your Meditory ERP account. Click the button below to reset it:</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}"
                 style="background-color: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
              </a>
            </div>

            <p style="color: #7f8c8d; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #e74c3c; word-break: break-all;">${resetUrl}</a>
            </p>

            <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
              This link will expire in 24 hours. If you didn't request a password reset, you can safely ignore this email.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        Reset Your Password

        We received a request to reset your password for your Meditory ERP account. Click the link below to reset it:

        ${resetUrl}

        This link will expire in 24 hours. If you didn't request a password reset, you can safely ignore this email.
      `,
    });
  }

  /**
   * Test email connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}
