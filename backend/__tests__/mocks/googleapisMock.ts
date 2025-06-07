// Mock for googleapis
import { mockGoogleSheetsResponse } from './googleSheetsMock';

const googleapisMock = {
  google: {
    sheets: jest.fn(({ version, auth }) => ({
      spreadsheets: {
        values: {
          get: jest.fn().mockResolvedValue(mockGoogleSheetsResponse)
        }
      }
    }))
  }
};

export default googleapisMock;
