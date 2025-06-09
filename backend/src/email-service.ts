import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Email Service for sending verification codes
 */
export class EmailService {
  private transporter!: nodemailer.Transporter; // Using definite assignment assertion
  private verificationCodes: Map<string, { code: string, expires: Date }> = new Map();
  private emailEnabled: boolean;

  constructor() {
    this.emailEnabled = false;
    
    // Load environment variables
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;
    const emailFrom = process.env.EMAIL_FROM || "ETHCluj Conference <noreply@ethcluj.org>";
    
    if (emailUser && emailPassword) {
      this.emailEnabled = true;
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPassword
        }
      });
      console.log(`Email service initialized with user: ${emailUser} (sending as ${emailFrom})`);
    } else {
      console.log('Email service running in development mode (emails will be logged to console)');
    }
  }

  /**
   * Generate a random 4-digit verification code
   */
  private generateVerificationCode(): string {
    // Generate a random 4-digit code
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Send a verification code to the user's email
   */
  async sendVerificationCode(email: string): Promise<string> {
    const code = this.generateVerificationCode();
    
    // Store the code with expiration
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15); // Code expires in 15 minutes
    this.verificationCodes.set(email, { code, expires });
    
    if (this.emailEnabled) {
      try {
        // Send email with verification code
        await this.transporter.sendMail({
          from: process.env.EMAIL_FROM || '"ETHCluj Conference" <noreply@ethcluj.org>',
          to: email,
          subject: 'Your ETHCluj Conference Verification Code',
          text: `Your verification code is: ${code}\n\nThis code will expire in 15 minutes.\n\nETHCluj Conference Team`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #e53e3e;">ETHCluj Conference</h2>
              <p style="font-size: 16px;">Your verification code is:</p>
              <p style="font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; padding: 10px; background-color: #f7fafc; border-radius: 4px; text-align: center;">${code}</p>
              <p style="font-size: 14px; color: #718096;">This code will expire in 15 minutes.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
              <p style="font-size: 14px; color: #718096;">ETHCluj Conference Team</p>
            </div>
          `
        });
        console.log(`Verification code sent to ${email}`);
      } catch (error) {
        console.error('Error sending verification email:', error);
      }
    } else {
      // In development mode, just log the code
      console.log(`=== DEVELOPMENT MODE: Verification code for ${email} is ${code} ===`);
    }
    
    return code;
  }

  /**
   * Verify a code for a given email
   */
  verifyCode(email: string, code: string): boolean {
    const storedData = this.verificationCodes.get(email);
    
    // Check if code exists and is not expired
    if (!storedData) {
      return false;
    }
    
    if (new Date() > storedData.expires) {
      // Code expired, remove it
      this.verificationCodes.delete(email);
      return false;
    }
    
    // Check if code matches
    const isValid = storedData.code === code;
    
    // If valid, remove the code (one-time use)
    if (isValid) {
      this.verificationCodes.delete(email);
    }
    
    return isValid;
  }
}

// Create a singleton instance
export const emailService = new EmailService();
