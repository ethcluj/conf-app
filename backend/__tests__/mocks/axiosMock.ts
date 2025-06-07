// Mock for axios
import { mockCSVData, mockSpeakerCSVData } from './googleSheetsMock';

const axiosMock = {
  get: jest.fn().mockImplementation((url: string) => {
    if (url.includes('tqx=out:csv')) {
      // Determine if it's a speaker sheet or schedule sheet based on URL
      if (url.includes('sheet=Speakers') || url.includes('sheet=test-speakers-sheet')) {
        return Promise.resolve({
          status: 200,
          data: mockSpeakerCSVData
        });
      } else {
        return Promise.resolve({
          status: 200,
          data: mockCSVData
        });
      }
    }
    
    // Default error case
    return Promise.reject(new Error('URL not mocked'));
  })
};

export default axiosMock;
