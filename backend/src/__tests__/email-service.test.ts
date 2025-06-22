import { EmailService } from '../email-service';

// Mock the logger to prevent console output during tests
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  }
}));

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
      (emailService as any).verificationCodes.set(email, { code, expires, attempts: 0 });
      
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
      (emailService as any).verificationCodes.set(email, { code, expires, attempts: 0 });
      
      // Verify with wrong code
      const isValid = emailService.verifyCode(email, '5678');
      expect(isValid).toBe(false);
      
      // Code should still be there
      expect((emailService as any).verificationCodes.has(email)).toBe(true);
      
      // Attempts should be incremented
      expect((emailService as any).verificationCodes.get(email).attempts).toBe(1);
    });
    
    it('should reject an expired code', () => {
      const email = 'test@example.com';
      
      // Manually set an expired verification code
      const code = '1234';
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() - 1); // Expired 1 minute ago
      (emailService as any).verificationCodes.set(email, { code, expires, attempts: 0 });
      
      // Verify the code
      const isValid = emailService.verifyCode(email, code);
      expect(isValid).toBe(false);
      
      // Expired code should be removed
      expect((emailService as any).verificationCodes.has(email)).toBe(false);
    });
    
    it('should fail after exceeding maximum verification attempts', () => {
      const email = 'test@example.com';
      
      // Manually set a verification code
      const code = '1234';
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 15);
      (emailService as any).verificationCodes.set(email, { code, expires, attempts: 0 });
      
      // Default max attempts is 3
      expect(emailService.getMaxVerificationAttempts()).toBe(3);
      
      // First attempt - wrong code
      let isValid = emailService.verifyCode(email, '5678');
      expect(isValid).toBe(false);
      expect((emailService as any).verificationCodes.get(email).attempts).toBe(1);
      
      // Second attempt - wrong code
      isValid = emailService.verifyCode(email, '9876');
      expect(isValid).toBe(false);
      expect((emailService as any).verificationCodes.get(email).attempts).toBe(2);
      
      // Third attempt - wrong code, should reach max attempts
      isValid = emailService.verifyCode(email, '4321');
      expect(isValid).toBe(false);
      
      // Code should be removed after max attempts
      expect((emailService as any).verificationCodes.has(email)).toBe(false);
      
      // Even with correct code, verification should fail as code is deleted
      isValid = emailService.verifyCode(email, code);
      expect(isValid).toBe(false);
    });
  });
  
  describe('maxVerificationAttempts', () => {
    it('should have default max verification attempts set to 3', () => {
      expect(emailService.getMaxVerificationAttempts()).toBe(3);
    });
    
    it('should allow setting custom max verification attempts', () => {
      emailService.setMaxVerificationAttempts(5);
      expect(emailService.getMaxVerificationAttempts()).toBe(5);
    });
    
    it('should not allow setting max attempts less than 1', () => {
      expect(() => emailService.setMaxVerificationAttempts(0)).toThrow('Max verification attempts must be at least 1');
      expect(() => emailService.setMaxVerificationAttempts(-1)).toThrow('Max verification attempts must be at least 1');
    });
    
    it('should respect custom max verification attempts', () => {
      // Set max attempts to 2
      emailService.setMaxVerificationAttempts(2);
      
      const email = 'test@example.com';
      const code = '1234';
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 15);
      (emailService as any).verificationCodes.set(email, { code, expires, attempts: 0 });
      
      // First attempt - wrong code
      let isValid = emailService.verifyCode(email, '5678');
      expect(isValid).toBe(false);
      expect((emailService as any).verificationCodes.get(email).attempts).toBe(1);
      
      // Second attempt - wrong code, should reach max attempts with only 2 tries
      isValid = emailService.verifyCode(email, '9876');
      expect(isValid).toBe(false);
      
      // Code should be removed after max attempts
      expect((emailService as any).verificationCodes.has(email)).toBe(false);
    });
  });
  
  describe('getVerificationAttempts', () => {
    it('should return the number of attempts made', () => {
      const email = 'test@example.com';
      
      // No verification in progress
      expect(emailService.getVerificationAttempts(email)).toBe(-1);
      
      // With verification in progress but no attempts
      const code = '1234';
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 15);
      (emailService as any).verificationCodes.set(email, { code, expires, attempts: 0 });
      expect(emailService.getVerificationAttempts(email)).toBe(0);
      
      // After an invalid attempt
      emailService.verifyCode(email, '5678');
      expect(emailService.getVerificationAttempts(email)).toBe(1);
    });
  });
  
  describe('getAttemptsRemaining', () => {
    it('should return the number of attempts remaining', () => {
      const email = 'test@example.com';
      
      // No verification in progress
      expect(emailService.getAttemptsRemaining(email)).toBe(-1);
      
      // With verification in progress but no attempts
      const code = '1234';
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 15);
      (emailService as any).verificationCodes.set(email, { code, expires, attempts: 0 });
      expect(emailService.getAttemptsRemaining(email)).toBe(3); // Default max is 3
      
      // After an invalid attempt
      emailService.verifyCode(email, '5678');
      expect(emailService.getAttemptsRemaining(email)).toBe(2);
      
      // After another invalid attempt
      emailService.verifyCode(email, '5678');
      expect(emailService.getAttemptsRemaining(email)).toBe(1);
      
      // After max attempts reached
      emailService.verifyCode(email, '5678');
      expect(emailService.getAttemptsRemaining(email)).toBe(-1); // No more attempts, code deleted
    });
  });
});
