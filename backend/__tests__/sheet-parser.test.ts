import { 
  processSpeakers, 
  validateSessionTrack
} from '../src/sheet-parser';
import { SessionLevel } from '../src/sessions';

describe('Sheet Parser Module', () => {
  describe('processSpeakers', () => {
    it('should return an empty array for empty input', () => {
      expect(processSpeakers('')).toEqual([]);
      expect(processSpeakers(undefined as any)).toEqual([]);
    });

    it('should process a single speaker correctly', () => {
      const result = processSpeakers('John Doe');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John Doe');
      expect(result[0].image).toBe('/placeholder.svg?height=40&width=40');
    });

    it('should process multiple speakers correctly', () => {
      const result = processSpeakers('John Doe; Jane Smith;Alice Johnson');
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('John Doe');
      expect(result[1].name).toBe('Jane Smith');
      expect(result[2].name).toBe('Alice Johnson');
    });

    it('should handle whitespace in speaker names', () => {
      const result = processSpeakers('  John Doe  ;  Jane Smith  ');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('John Doe');
      expect(result[1].name).toBe('Jane Smith');
    });
  });

  describe('validateSessionTrack', () => {
    it('should return correct track for valid inputs', () => {
      expect(validateSessionTrack('Ethereum Roadmap')).toBe('Ethereum Roadmap');
      expect(validateSessionTrack('DeFi')).toBe('DeFi');
    });

    it('should return undefined for invalid tracks', () => {
      expect(validateSessionTrack('Invalid Track')).toBeUndefined();
      expect(validateSessionTrack('')).toBeUndefined();
    });
  });
});
