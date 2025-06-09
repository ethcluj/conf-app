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
    // Check if email is configured
    this.emailEnabled = !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
    
    if (this.emailEnabled) {
      console.log('Email service initialized with user:', process.env.EMAIL_USER);
      
      // Create a transporter using Google Workspace
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // use SSL
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
    } else {
      console.warn('Email service is not fully configured. Running in development mode with console logs.');
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
    // Generate a new verification code
    const code = this.generateVerificationCode();
    
    // Store the code with expiration (15 minutes)
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15);
    this.verificationCodes.set(email, { code, expires });
    
    // If email is not configured, log the code to console (for development)
    if (!this.emailEnabled) {
      console.log(`=== DEVELOPMENT MODE: Verification code for ${email} is ${code} ===`);
      return code;
    }
    
    // Email content
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"ETHCluj Conference" <noreply@ethcluj.org>',
      to: email,
      subject: 'Your ETHCluj Conference Verification Code',
      text: `Your verification code is: ${code}\n\nThis code will expire in 15 minutes.\n\nIf you didn't request this code, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e53e3e;">ETHCluj Conference</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #f7fafc; padding: 20px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
            ${code}
          </div>
          <p>This code will expire in 15 minutes.</p>
          <p style="color: #718096; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `
    };
    
    // Send the email
    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Verification email sent to ${email}`);
      return code;
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw new Error('Failed to send verification email');
    }
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
