import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { logger } from './logger';

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
    
    logger.info('Initializing email service', { 
      emailUserProvided: !!emailUser, 
      emailPasswordProvided: !!emailPassword,
      emailFrom
    });
    
    if (emailUser && emailPassword) {
      try {
        this.emailEnabled = true;
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: emailUser,
            pass: emailPassword
          },
          // Add debug option to get more information
          debug: process.env.DEBUG === 'true'
        });
        
        logger.info(`Email service initialized with user: ${emailUser} (sending as ${emailFrom})`);
      } catch (error) {
        logger.error('Failed to initialize email transporter', error);
        this.emailEnabled = false;
      }
    } else {
      logger.info('Email service running in development mode (emails will be logged to console)');
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
    logger.info('Sending verification code', { email });
    
    const code = this.generateVerificationCode();
    
    // Store the code with expiration
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15); // Code expires in 15 minutes
    this.verificationCodes.set(email, { code, expires });
    
    if (this.emailEnabled) {
      try {
        logger.debug('Preparing to send email', { 
          emailEnabled: this.emailEnabled,
          transporterInitialized: !!this.transporter
        });
        
        // Send email with verification code
        const emailFrom = process.env.EMAIL_FROM || '"ETHCluj Conference" <noreply@ethcluj.org>';
        const mailOptions = {
          from: emailFrom,
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
        };
        
        logger.debug('Sending mail with options', { mailOptions: { ...mailOptions, html: '[HTML content]' } });
        
        // Track the email sending attempt before sending
        const transporterConfig = this.transporter?.options || {};
        
        try {
          const info = await this.transporter.sendMail(mailOptions);
          logger.info(`Verification code sent to ${email}`, { messageId: info.messageId });
        } catch (emailError) {
          throw emailError; // Re-throw for handling in the route
        }
      } catch (error) {
        logger.error(`Error sending verification email to ${email}`, error);
        throw error; // Re-throw to handle in the route
      }
    } else {
      // In development mode, just log the code
      logger.info(`DEVELOPMENT MODE: Verification code for ${email} is ${code}`);
    }
    
    return code;
  }

  /**
   * Verify a code for a given email
   */
  verifyCode(email: string, code: string): boolean {
    logger.info('Verifying code', { email, codeProvided: !!code });
    
    const storedData = this.verificationCodes.get(email);
    
    // Check if code exists and is not expired
    if (!storedData) {
      logger.info('No verification code found for email', { email });
      return false;
    }
    
    if (new Date() > storedData.expires) {
      // Code expired, remove it
      logger.info('Verification code expired', { email, expiredAt: storedData.expires });
      this.verificationCodes.delete(email);
      return false;
    }
    
    // Check if code matches
    const isValid = storedData.code === code;
    
    if (isValid) {
      logger.info('Verification code valid', { email });
      // Remove the code (one-time use)
      this.verificationCodes.delete(email);
    } else {
      logger.info('Invalid verification code provided', { 
        email, 
        providedCode: code,
        expectedCode: storedData.code 
      });
    }
    
    return isValid;
  }
}

// Create a singleton instance
// Create and export a singleton instance
export const emailService = new EmailService();
