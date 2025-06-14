// Mock data for Google Sheets API responses
import { RawScheduleRow } from '../../src/sheet-parser';
import { SpeakerDetails } from '../../src/speakers';

// Mock raw schedule data that would come from Google Sheets
export const mockRawScheduleData: RawScheduleRow[] = [
  {
    timeSlot: '26 June 09:00',
    visible: true,
    stage: 'NA',
    title: 'Doors Open',
    speakers: '',
    description: 'Registration starts',
    type: 'NA',
    track: 'NA',
    level: 'For everyone',
    notes: ''
  },
  {
    timeSlot: '26 June 10:00',
    visible: true,
    stage: 'Main',
    title: 'Opening Keynote',
    speakers: 'John Doe',
    description: 'Welcome to ETHCluj',
    type: 'Keynote',
    track: 'Ethereum Roadmap',
    level: 'For everyone',
    notes: ''
  },
  {
    timeSlot: '26 June 11:00',
    visible: true,
    stage: 'Tech',
    title: 'Scaling Solutions',
    speakers: 'Jane Smith',
    description: 'Technical deep dive',
    type: 'Workshop',
    track: 'Development',
    level: 'Intermediate',
    notes: ''
  },
  {
    timeSlot: '26 June 12:00',
    visible: true,
    stage: 'NA',
    title: 'Lunch',
    speakers: '',
    description: 'Lunch break',
    type: 'NA',
    track: 'NA',
    level: 'For everyone',
    notes: ''
  },
  {
    timeSlot: '26 June 13:00',
    visible: true,
    stage: 'Biz',
    title: 'DeFi Panel',
    speakers: 'Alice Johnson;Bob Williams',
    description: 'Industry leaders discuss DeFi',
    type: 'Panel',
    track: 'DeFi',
    level: 'Beginner',
    notes: ''
  },
  {
    timeSlot: '26 June 13:00',
    visible: false, // This one should be filtered out
    stage: 'Work',
    title: 'Hidden Workshop',
    speakers: 'Hidden Speaker',
    description: 'This should not appear',
    type: 'Workshop',
    track: 'Development',
    level: 'Advanced',
    notes: ''
  }
];

// Mock CSV data as it would be returned from the direct fetch
export const mockCSVData = `"Time Slot","Visible","Stage","Title","Speakers","Description","Type","Track","Notes"
"26 June 09:00","true","NA","Doors Open","","Registration starts","NA","NA",""
"26 June 10:00","true","Main","Opening Keynote","John Doe","Welcome to ETHCluj","Keynote","Ethereum Roadmap",""
"26 June 11:00","true","Tech","Scaling Solutions","Jane Smith","Technical deep dive","Workshop","Development",""
"26 June 12:00","true","NA","Lunch","","Lunch break","NA","NA",""
"26 June 13:00","true","Biz","DeFi Panel","Alice Johnson;Bob Williams","Industry leaders discuss DeFi","Panel","DeFi",""
"26 June 13:00","false","Work","Hidden Workshop","Hidden Speaker","This should not appear","Workshop","Development",""`;

// Mock speaker data
export const mockSpeakerData: SpeakerDetails[] = [
  {
    name: 'John Doe',
    org: 'Ethereum Foundation',
    social: '@johndoe',
    photo: 'https://example.com/john.jpg',
    visible: true,
    bio: 'Ethereum researcher'
  },
  {
    name: 'Jane Smith',
    org: 'ConsenSys',
    social: '@janesmith',
    photo: 'https://example.com/jane.jpg',
    visible: true,
    bio: 'Smart contract developer'
  },
  {
    name: 'Alice Johnson',
    org: 'DeFi Protocol',
    social: '@alice',
    photo: 'https://example.com/alice.jpg',
    visible: true,
    bio: 'DeFi expert'
  },
  {
    name: 'Hidden Speaker',
    org: 'Secret Org',
    social: '@hidden',
    photo: 'https://example.com/hidden.jpg',
    visible: false, // This one should be filtered out
    bio: 'Should not be visible'
  }
];

// Mock CSV speaker data
export const mockSpeakerCSVData = `"Name","Organization","Social","Photo URL","Visible","Bio"
"John Doe","Ethereum Foundation","@johndoe","https://example.com/john.jpg","true","Ethereum researcher"
"Jane Smith","ConsenSys","@janesmith","https://example.com/jane.jpg","true","Smart contract developer"
"Alice Johnson","DeFi Protocol","@alice","https://example.com/alice.jpg","true","DeFi expert"
"Hidden Speaker","Secret Org","@hidden","https://example.com/hidden.jpg","false","Should not be visible"`;

// Mock Google Sheets API response
export const mockGoogleSheetsResponse = {
  data: {
    values: [
      ['Time Slot', 'Visible', 'Stage', 'Title', 'Speakers', 'Description', 'Type', 'Track', 'Notes'],
      ['26 June 09:00', 'true', 'NA', 'Doors Open', '', 'Registration starts', 'NA', 'NA', ''],
      ['26 June 10:00', 'true', 'Main', 'Opening Keynote', 'John Doe', 'Welcome to ETHCluj', 'Keynote', 'Ethereum Roadmap', ''],
      ['26 June 11:00', 'true', 'Tech', 'Scaling Solutions', 'Jane Smith', 'Technical deep dive', 'Workshop', 'Development', ''],
      ['26 June 12:00', 'true', 'NA', 'Lunch', '', 'Lunch break', 'NA', 'NA', ''],
      ['26 June 13:00', 'true', 'Biz', 'DeFi Panel', 'Alice Johnson;Bob Williams', 'Industry leaders discuss DeFi', 'Panel', 'DeFi', ''],
      ['26 June 13:00', 'false', 'Work', 'Hidden Workshop', 'Hidden Speaker', 'This should not appear', 'Workshop', 'Development', '']
    ]
  }
};
