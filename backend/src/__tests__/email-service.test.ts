import { EmailService } from '../email-service';

describe('EmailService', () => {
  let emailService: EmailService;

  beforeEach(() => {
    // Create a new instance for each test
    emailService = new EmailService();
  });

  describe('generateVerificationCode', () => {
    it('should generate a 4-digit code', () => {
      // Access the private method using type assertion
      const code = (emailService as any).generateVerificationCode();
      
      // Check that it's a string with 4 digits
      expect(typeof code).toBe('string');
      expect(code.length).toBe(4);
      expect(/^\d{4}$/.test(code)).toBe(true);
    });
  });

  describe('verifyCode', () => {
    it('should verify a valid code', async () => {
      const email = 'test@example.com';
      
      // Manually set a verification code
      const code = '1234';
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 15);
      (emailService as any).verificationCodes.set(email, { code, expires });
      
      // Verify the code
      const isValid = emailService.verifyCode(email, code);
      expect(isValid).toBe(true);
      
      // Code should be removed after verification
      expect((emailService as any).verificationCodes.has(email)).toBe(false);
    });
    
    it('should reject an invalid code', () => {
      const email = 'test@example.com';
      
      // Manually set a verification code
      const code = '1234';
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 15);
      (emailService as any).verificationCodes.set(email, { code, expires });
      
      // Verify with wrong code
      const isValid = emailService.verifyCode(email, '5678');
      expect(isValid).toBe(false);
      
      // Code should still be there
      expect((emailService as any).verificationCodes.has(email)).toBe(true);
    });
    
    it('should reject an expired code', () => {
      const email = 'test@example.com';
      
      // Manually set an expired verification code
      const code = '1234';
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() - 1); // Expired 1 minute ago
      (emailService as any).verificationCodes.set(email, { code, expires });
      
      // Verify the code
      const isValid = emailService.verifyCode(email, code);
      expect(isValid).toBe(false);
      
      // Expired code should be removed
      expect((emailService as any).verificationCodes.has(email)).toBe(false);
    });
  });
});
