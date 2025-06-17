/**
 * Speaker Session Notification System
 * 
 * This script sends personalized emails to speakers about their sessions at the ETHCluj conference.
 * It fetches data from Google Sheets, processes it, and sends formatted emails to each speaker.
 * 
 * Safety features:
 * - Tracks which speakers have already received emails to prevent duplicate sending
 * - Requires explicit flags for sending to real speakers
 * - Supports limiting to the first N speakers
 * - Requires explicit confirmation to send to all remaining speakers
 */
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { fetchSheetData, validateGoogleSheetsConfig } from '../google-sheets';
import { RawScheduleRow } from '../sheet-parser';
import { Session, Speaker } from '../sessions';
import { getSessionsFromGoogleSheet } from '../schedule-manager';

// Load environment variables
dotenv.config();

// Define interfaces
// Extended speaker interface for panels that includes role information
interface PanelSpeaker extends Speaker {
  role?: string;
}

interface SpeakerWithEmail {
  name: string;
  email?: string;
  phone?: string;
  org?: string;
  social?: string;
  photo?: string;
  bio?: string;
}

interface EmailTracker {
  lastSent: string;
  sent: SentEmailRecord[];
}

interface SentEmailRecord {
  speakerEmail?: string;
  speakerPhone?: string;
  speakerName: string;
  sentAt: string;
  sessionIds: string[];
}

interface StageManager {
  name: string;
  telegram: string;
  email: string;
  stages: string[];
}

interface SessionWithDetails extends Session {
  formattedDateTime?: string;
  formattedDuration?: string;
  stageManager?: StageManager;
}

// Configuration
const DEFAULT_STAGE_MANAGER: StageManager = {
  name: "Conference Support",
  telegram: "@ethcluj_support",
  email: "support@ethcluj.org",
  stages: ["NA"]
};

// Path to the email tracker file
const TRACKER_FILE_PATH = path.join(__dirname, 'sent-emails-tracker.json');

// Load the email tracker
function loadEmailTracker(): EmailTracker {
  try {
    if (fs.existsSync(TRACKER_FILE_PATH)) {
      const data = fs.readFileSync(TRACKER_FILE_PATH, 'utf8');
      return JSON.parse(data) as EmailTracker;
    }
  } catch (error) {
    console.error('Error loading email tracker file:', error);
  }
  
  // Return default tracker if file doesn't exist or there's an error
  return {
    lastSent: new Date().toISOString(),
    sent: []
  };
}

// Save the email tracker
function saveEmailTracker(tracker: EmailTracker): void {
  try {
    fs.writeFileSync(TRACKER_FILE_PATH, JSON.stringify(tracker, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving email tracker file:', error);
  }
}

// Record that an email was sent to a speaker
function recordSentEmail(speaker: SpeakerWithEmail, sessions: Session[]): void {
  const tracker = loadEmailTracker();
  
  tracker.lastSent = new Date().toISOString();
  
  let existingIndex = -1;
  
  if (speaker.email) {
    existingIndex = tracker.sent.findIndex(record => 
      record.speakerEmail && record.speakerEmail.toLowerCase() === speaker.email?.toLowerCase());
  } else if (speaker.phone) {
    existingIndex = tracker.sent.findIndex(record => 
      record.speakerPhone && record.speakerPhone === speaker.phone);
  }
  
  const sessionIds = sessions.map(session => session.id);
  
  if (existingIndex >= 0) {
    tracker.sent[existingIndex].sentAt = new Date().toISOString();
    tracker.sent[existingIndex].sessionIds = sessionIds;
  } else {
    tracker.sent.push({
      speakerEmail: speaker.email,
      speakerPhone: speaker.phone,
      speakerName: speaker.name,
      sentAt: new Date().toISOString(),
      sessionIds
    });
  }
  
  saveEmailTracker(tracker);
}

// Check if an email was already sent to a speaker
function hasSpeakerReceivedEmail(speaker: SpeakerWithEmail, tracker: EmailTracker): boolean {
  if (speaker.email) {
    return tracker.sent.some(record => 
      record.speakerEmail && record.speakerEmail.toLowerCase() === speaker.email?.toLowerCase());
  } else if (speaker.phone) {
    return tracker.sent.some(record => 
      record.speakerPhone && record.speakerPhone === speaker.phone);
  }
  return false;
}

// Get all speakers who have already received emails
function getSpeakersWithSentEmails(): Set<string> {
  const tracker = loadEmailTracker();
  return new Set(tracker.sent.map(record => record.speakerEmail || record.speakerPhone || ''));
}

// Duration calculations based on session type
function calculateDuration(type: string | undefined): string {
  type = (type || '').toLowerCase();
  
  if (type === 'keynote') {
    return "20 min talk + 5 min Q&A + 5 min stage transition";
  } else if (type === 'panel') {
    return "45 min panel + 10 min Q&A + 5 min transition";
  } else if (type === 'workshop') {
    return "50 min workshop + 10 min transition";
  } else {
    return "30 min session + 5 min transition";
  }
}

// Format date and time for better readability
function formatDateTime(dateTimeString: string): string {
  const date = new Date(dateTimeString);
  return date.toLocaleString('en-US', { 
    weekday: 'long',
    day: 'numeric', 
    month: 'long', 
    year: 'numeric', 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true
  });
}

// Read the email template from file
function getEmailTemplate(): string {
  return fs.readFileSync(
    path.join(__dirname, 'speaker-email-template.html'),
    'utf8'
  );
}

// Read the session details template from file
function getSessionDetailsTemplate(): string {
  return fs.readFileSync(
    path.join(__dirname, 'session-details-template.html'),
    'utf8'
  );
}

// Replace template placeholders with actual values
function replaceTemplatePlaceholders(
  template: string, 
  replacements: Record<string, string>
): string {
  let result = template;
  
  // Replace each placeholder with its value
  for (const [key, value] of Object.entries(replacements)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(placeholder, value || '');
  }
  
  // Handle conditional blocks (like {{#if variable}} content {{/if}})
  const conditionalBlockRegex = /{{#if\s+([^}]+)}}([\s\S]*?){{\/if}}/g;
  result = result.replace(conditionalBlockRegex, (match, variable, content) => {
    // If the variable has a truthy value, include the content, otherwise return empty string
    return replacements[variable] ? content : '';
  });
  
  return result;
}

// Get stage manager for a specific stage
function getStageManagerForStage(
  stage: string, 
  stageManagers: StageManager[]
): StageManager {
  const manager = stageManagers.find(sm => 
    sm.stages.some(s => s.toLowerCase() === stage.toLowerCase())
  );
  
  return manager || DEFAULT_STAGE_MANAGER;
}

// Generate the app link for a session
function generateAppLink(session: Session): string {
  return `https://app.ethcluj.org/session/${session.id}`;
}

// Fetch speakers with emails from Google Sheets
async function fetchSpeakersWithEmails(testMode: boolean = false): Promise<SpeakerWithEmail[]> {
  try {
    console.log("Fetching speakers with emails from Google Sheets...");
    
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = process.env.GOOGLE_SPEAKERS_EMAIL_SHEET_NAME || process.env.GOOGLE_SPEAKERS_SHEET_NAME || 'Speakers';
    const apiKey = process.env.GOOGLE_API_KEY;
    
    // Validate configuration
    if (!spreadsheetId || !apiKey) {
      throw new Error("Missing Google Sheets configuration");
    }
    
    const config = { spreadsheetId, sheetName, apiKey };
    
    if (!validateGoogleSheetsConfig(config)) {
      throw new Error('Invalid Google Sheets configuration');
    }
    
    // Fetch data (adjust column range to include email column)
    const rows = await fetchSheetData(config, 'A:G');
    
    if (!rows || rows.length <= 1) {
      console.warn('No speaker data found');
      return [];
    }
    
    // Get the header row to find the email or phone column index
    const headers = rows[0] || [];
    const emailColumnIndex = headers.findIndex(header => 
      header?.toString().toLowerCase().includes('email'));
    const phoneColumnIndex = headers.findIndex(header => 
      header?.toString().toLowerCase().includes('phone'));
    
    if (emailColumnIndex === -1 && phoneColumnIndex === -1) {
      console.log('No email or phone column found in the speakers sheet.');
      if (!testMode) {
        console.error('Please add an Email or Phone column to send real emails.');
        return [];
      }
    }
    
    // Map the rows to SpeakerWithEmail objects
    const speakers = rows.slice(1).map(row => {
      // Extract data based on standard speaker sheet columns
      const name = row[0]; // Name is typically the first column
      const org = row[1];  // Organization is typically the second column
      const social = row[2]; // Social is typically the third column
      const photo = row[3]; // Photo URL is typically the fourth column
      const visible = row[4]; // Visible flag is typically the fifth column
      const bio = row[5];  // Bio is typically the sixth column
      const email = emailColumnIndex !== -1 ? row[emailColumnIndex] : undefined; // Email from the found column
      const phone = phoneColumnIndex !== -1 ? row[phoneColumnIndex] : undefined; // Phone from the found column
      
      // Skip speakers without emails/phones or marked as not visible
      // In test mode, allow speakers without email/phone for testing specific speakers
      if ((!email && !phone && !testMode) || visible?.toLowerCase() !== 'true') {
        return null;
      }
      
      return {
        name: name?.trim() || '',
        email: email?.trim(),
        phone: phone?.trim(),
        org: org?.trim(),
        social: social?.trim(),
        photo: photo?.trim(),
        bio: bio?.trim()
      } as SpeakerWithEmail;
    }).filter((speaker): speaker is SpeakerWithEmail => speaker !== null);
    
    console.log(`Found ${speakers.length} speakers with valid emails`);
    return speakers;
  } catch (error) {
    console.error("Error fetching speakers with emails:", error);
    throw error;
  }
}

// Fetch stage managers from Google Sheets
async function fetchStageManagers(): Promise<StageManager[]> {
  try {
    console.log("Fetching stage managers from Google Sheets...");
    
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = process.env.GOOGLE_STAGE_MANAGERS_SHEET_NAME || 'StageManagers';
    const apiKey = process.env.GOOGLE_API_KEY;
    
    // Validate configuration
    if (!spreadsheetId || !apiKey) {
      throw new Error("Missing Google Sheets configuration");
    }
    
    const config = { spreadsheetId, sheetName, apiKey };
    
    if (!validateGoogleSheetsConfig(config)) {
      throw new Error('Invalid Google Sheets configuration');
    }
    
    // Fetch data
    const rows = await fetchSheetData(config, 'A:D');
    
    if (!rows || rows.length <= 1) {
      console.warn('No stage manager data found, using defaults');
      return [DEFAULT_STAGE_MANAGER];
    }
    
    // Map the rows to StageManager objects
    // Assuming headers: Name, Telegram, Email, Stages (comma-separated)
    const managers = rows.slice(1).map(row => {
      const [name, telegram, email, stagesString] = row;
      
      if (!name || !email) {
        return null;
      }
      
      return {
        name: name?.trim() || '',
        telegram: telegram?.trim() || '',
        email: email?.trim() || '',
        stages: stagesString?.split(',').map((s: string) => s.trim()) || ['NA']
      };
    }).filter((manager): manager is StageManager => manager !== null);
    
    console.log(`Found ${managers.length} stage managers`);
    return managers.length ? managers : [DEFAULT_STAGE_MANAGER];
  } catch (error) {
    console.error("Error fetching stage managers:", error);
    return [DEFAULT_STAGE_MANAGER];
  }
}

// Group sessions by speaker
function groupSessionsBySpeaker(
  sessions: Session[], 
  speakersWithEmail: SpeakerWithEmail[]
): Map<string, { speaker: SpeakerWithEmail, sessions: Session[] }> {
  const speakerSessions = new Map<string, { speaker: SpeakerWithEmail, sessions: Session[] }>();
  
  // Create a normalized map of speaker names to their full info
  const speakerMap = new Map<string, SpeakerWithEmail>();
  for (const speaker of speakersWithEmail) {
    speakerMap.set(speaker.name.toLowerCase(), speaker);
  }
  
  // Go through all sessions and match speakers
  for (const session of sessions) {
    // Skip sessions without speakers
    if (!session.speakers || session.speakers.length === 0) continue;
    
    for (const sessionSpeaker of session.speakers) {
      // Normalize the speaker name for comparison
      const normalizedName = sessionSpeaker.name.toLowerCase();
      
      // Find the speaker in our email list
      const speakerWithEmail = speakerMap.get(normalizedName);
      if (!speakerWithEmail) continue;
      
      // Add this session to the speaker's sessions list
      if (!speakerSessions.has(normalizedName)) {
        speakerSessions.set(normalizedName, {
          speaker: speakerWithEmail,
          sessions: []
        });
      }
      
      speakerSessions.get(normalizedName)?.sessions.push(session);
    }
  }
  
  return speakerSessions;
}

// Map stage short names to full names
function getFullStageName(stageShortName: string): string {
  const stageMap: Record<string, string> = {
    'Main': 'Main Stage',
    'Tech': 'Tech Stage',
    'Biz': 'Business Room',
    'Work': 'Workshop Room'
  };
  
  return stageMap[stageShortName] || stageShortName;
}

// Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  
  if (j === 1 && k !== 11) {
    return num + 'st';
  }
  if (j === 2 && k !== 12) {
    return num + 'nd';
  }
  if (j === 3 && k !== 13) {
    return num + 'rd';
  }
  return num + 'th';
}

// Format date for Google Calendar
function formatCalendarDate(dateTimeStr: string, sessionType: string): { start: string, end: string } {
  try {
    // Log the input date string for debugging
    console.log('Formatting calendar date from original startTime:', dateTimeStr);
    
    // The startTime is in ISO format (e.g., "2025-06-26T14:30:00.000Z")
    // Parse it directly
    const utcDate = new Date(dateTimeStr);
    
    // Validate the date
    if (isNaN(utcDate.getTime())) {
      console.error('Invalid date format:', dateTimeStr);
      process.exit(1); // Stop the script on error
    }
    
    // Convert to EEST (UTC+3) timezone by adding 3 hours
    const eestDate = new Date(utcDate.getTime() + 3 * 60 * 60 * 1000);
    
    console.log('UTC date:', utcDate.toISOString());
    console.log('EEST date:', eestDate.toISOString());
    
    // Format for Google Calendar (YYYYMMDDTHHMMSS) in EEST timezone
    const formattedYear = eestDate.getUTCFullYear();
    const formattedMonth = String(eestDate.getUTCMonth() + 1).padStart(2, '0');
    const formattedDay = String(eestDate.getUTCDate()).padStart(2, '0');
    const formattedHours = String(eestDate.getUTCHours()).padStart(2, '0');
    const formattedMinutes = String(eestDate.getUTCMinutes()).padStart(2, '0');
    
    const startDateTime = `${formattedYear}${formattedMonth}${formattedDay}T${formattedHours}${formattedMinutes}00`;
    console.log('Formatted start date time (EEST):', startDateTime);
    
    // Set duration based on session type
    const endDate = new Date(eestDate.getTime()); // Clone the date
    const sessionTypeLower = sessionType?.toLowerCase() || '';
    
    if (sessionTypeLower.includes('keynote')) {
      // Keynotes are 30 minutes
      endDate.setTime(endDate.getTime() + 30 * 60 * 1000);
    } else if (sessionTypeLower.includes('panel') || sessionTypeLower.includes('workshop')) {
      // Panels and workshops are 60 minutes
      endDate.setTime(endDate.getTime() + 60 * 60 * 1000);
    } else {
      // Default to 60 minutes for other session types
      endDate.setTime(endDate.getTime() + 60 * 60 * 1000);
    }
    
    const endYear = endDate.getUTCFullYear();
    const endMonth = String(endDate.getUTCMonth() + 1).padStart(2, '0');
    const endDay = String(endDate.getUTCDate()).padStart(2, '0');
    const endHours = String(endDate.getUTCHours()).padStart(2, '0');
    const endMinutes = String(endDate.getUTCMinutes()).padStart(2, '0');
    
    const endDateTime = `${endYear}${endMonth}${endDay}T${endHours}${endMinutes}00`;
    console.log('Formatted end date time (EEST):', endDateTime);
    
    // Log the generated dates for debugging with example URL
    const exampleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Example%20Session&details=Session%20at%20ETHCluj%202025&location=Main%20Stage&dates=${startDateTime}%2F${endDateTime}&ctz=Europe/Bucharest&add=reminder&crm=POPUP&crr=60`;
    console.log('Calendar dates generated (EEST):', { start: startDateTime, end: endDateTime });
    console.log('Example calendar URL:', exampleUrl);
    
    // Return the formatted dates
    return { 
      start: startDateTime, 
      end: endDateTime 
    };
  } catch (error) {
    console.error('Error formatting calendar date:', error);
    // Don't use fallback values, exit the script on error
    console.error('Exiting due to date formatting error');
    process.exit(1);
  }
}

// This function has been removed as we're now directly parsing ISO dates

// Generate HTML email content for a speaker
function generateSpeakerEmailContent(
  speaker: SpeakerWithEmail, 
  sessions: SessionWithDetails[],
  emailTemplate: string,
  sessionDetailsTemplate: string
): string {
  // Sort sessions by type: keynotes first, then workshops, then panels
  const sortedSessions = [...sessions].sort((a, b) => {
    const typeA = (a.type || '').toLowerCase();
    const typeB = (b.type || '').toLowerCase();
    
    if (typeA.includes('keynote') && !typeB.includes('keynote')) return -1;
    if (!typeA.includes('keynote') && typeB.includes('keynote')) return 1;
    if (typeA.includes('workshop') && !typeB.includes('workshop') && !typeB.includes('keynote')) return -1;
    if (!typeA.includes('workshop') && !typeA.includes('keynote') && typeB.includes('workshop')) return 1;
    return 0;
  });
  
  // Generate the session details HTML blocks
  const sessionDetailsHtml = sortedSessions.map((session, index) => {
    // Add session numbering if there are multiple sessions
    let sessionNumbering = '';
    if (sortedSessions.length > 1) {
      const ordinal = getOrdinalSuffix(index + 1);
      sessionNumbering = `<h3 style="font-size: 18px; margin-top: 20px; margin-bottom: 10px; color: #505CD9;">Your ${ordinal} session:</h3>`;
    }
    // Get full stage name
    const stageFull = getFullStageName(session.stage);
    
    // Format calendar dates - use original startTime instead of formatted date
    const { start: calendarStart, end: calendarEnd } = formatCalendarDate(session.startTime || '', session.type || 'Session');
    
    // Clean telegram username for the URL (remove @ if present)
    const telegramUsername = (session.stageManager?.telegram || DEFAULT_STAGE_MANAGER.telegram).replace(/^@/, '');
    
    // Determine if this is a panel and the speaker's role
    let roleHtml = '';
    const sessionType = (session.type || '').toLowerCase();
    if (sessionType.includes('panel')) {
      // Check if speaker is the first one listed in the panel
      const isModerator = session.speakers && session.speakers.length > 0 && 
                         session.speakers[0].name === speaker.name;
      
      if (isModerator) {
        roleHtml = '<p style="margin: 8px 0; font-size: 14px;"><strong>Your Role:</strong> <span style="color: #FE304C; font-weight: bold;">Moderator</span></p>';
      } else {
        roleHtml = '<p style="margin: 8px 0; font-size: 14px;"><strong>Your Role:</strong> <span style="color: white;">Panelist</span></p>';
      }
    }
    
    // Add the session numbering before the session details template
    const sessionTemplateWithNumbering = sortedSessions.length > 1 ? 
      sessionNumbering + sessionDetailsTemplate : 
      sessionDetailsTemplate;
      
    return replaceTemplatePlaceholders(sessionTemplateWithNumbering, {
      sessionTitle: session.title,
      sessionType: session.type || 'Session',
      sessionDateTime: session.formattedDateTime || '',
      sessionStage: session.stage,
      sessionStageFull: stageFull,
      sessionDuration: session.formattedDuration || '',
      sessionTrack: session.track || 'General',
      sessionLevel: session.level || 'All Levels',
      stageManager: session.stageManager?.name || DEFAULT_STAGE_MANAGER.name,
      stageManagerTelegram: '@' + telegramUsername,
      stageManagerTelegramClean: telegramUsername,
      stageManagerEmail: session.stageManager?.email || DEFAULT_STAGE_MANAGER.email,
      appLink: generateAppLink(session),
      calendarStart,
      calendarEnd,
      roleHtml
    });
  }).join('');
  
  // Check if any session is a keynote to conditionally include Note 3
  const hasKeynote = sessions.some(session => 
    (session.type || '').toLowerCase().includes('keynote'));
  
  const keynoteNotice = hasKeynote ? 
    '<p style="font-size: 16px; line-height: 1.5;">Note 3: If you haven\'t already, please reply with your <strong>Google Slides link</strong>, even if it\'s still in progress. If you already sent them, thanks a lot, it helps us to set up things in advance. You\'ll be able to update your slides to 1 day before the conference. If you\'re using PowerPoint or Keynote, please send the full presentation via email or WeTransfer.</p>' : 
    '';
    
  // Check if the speaker is a moderator for any panel to conditionally include Note 4
  const isModerator = sessions.some(session => {
    const sessionType = (session.type || '').toLowerCase();
    if (sessionType.includes('panel')) {
      return session.speakers && session.speakers.length > 0 && 
             session.speakers[0].name === speaker.name;
    }
    return false;
  });
  
  const moderatorNotice = isModerator ? 
    '<p style="font-size: 16px; line-height: 1.5;">Note 4: Thank you for being open to moderating the panel! We\'d love for you to take on the role. We\'ll send you the questions for every panel where you are marked as "Moderator" - a few days before the event to review and confirm.</p>' : 
    '';
  
  // Add a conditional message about the number of sessions (only if more than 1)
  let sessionCountMessage = '';
  if (sortedSessions.length > 1) {
    sessionCountMessage = ` You have opted in and were selected to speak in <strong> ${sortedSessions.length} sessions</strong>.`;
  }
  
  // Replace the placeholders in the email template
  return replaceTemplatePlaceholders(emailTemplate, {
    speakerName: speaker.name,
    sessionDetails: sessionDetailsHtml,
    keynoteNotice,
    moderatorNotice,
    sessionCountMessage
  });
}

// Create an email transporter
function createEmailTransporter() {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;
  const emailFrom = process.env.EMAIL_FROM || "ETHCluj Conference <noreply@ethcluj.org>";
  
  if (!emailUser || !emailPassword) {
    console.warn('Email credentials not found. Running in test mode (emails will be logged)');
    return null;
  }
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPassword
    }
  });
}

async function sendSpeakerEmails(
  speakerSessions: Map<string, { speaker: SpeakerWithEmail, sessions: SessionWithDetails[] }>,
  testEmailAddress?: string,
  interactiveMode = false,
  debugMode = false
): Promise<void> {
  // Load email templates
  const emailTemplate = getEmailTemplate();
  const sessionDetailsTemplate = getSessionDetailsTemplate();
  
  console.log('Preparing emails for', speakerSessions.size, 'speakers...');
  
  if (testEmailAddress) {
    console.log('Preparing to send emails in TEST mode...');
  }
  
  // Create readline interface for interactive mode
  let rl;
  if (interactiveMode) {
    rl = createPrompt();
  }
  
  // Create transporter
  let transporter = createEmailTransporter();
  const isTestMode = Boolean(testEmailAddress);
  
  // Force transporter to be null when in debug mode to ensure debug files are created
  if (debugMode) {
    console.log('Debug mode enabled, forcing transporter to null to create debug files');
    transporter = null;
  }
  
  console.log(`Preparing to send emails in ${isTestMode ? 'TEST' : 'LIVE'} mode...`);
  
  // Process each speaker
  for (const [speakerName, { speaker, sessions }] of speakerSessions.entries()) {
    try {
      // Generate email content
      const emailContent = generateSpeakerEmailContent(
        speaker, 
        sessions,
        emailTemplate,
        sessionDetailsTemplate
      );
      
      // Determine recipient
      const recipient = isTestMode ? testEmailAddress! : speaker.email;
      
      // In interactive mode, prompt before sending each email
      let sendActualResponse: string = '';
      if (interactiveMode && rl) {
        console.log('\n==================================================');
        console.log(`Speaker: ${speaker.name}`);
        console.log(`Email: ${speaker.email}`);
        console.log(`Sessions: ${sessions.length}`);
        console.log(`Session titles: ${sessions.map(s => s.title).join(', ')}`);
        console.log('==================================================\n');
        
        // Ask if user wants to send a test email first
        const sendTestResponse = await askQuestion(rl, 'Send a test email to your test address first? (y/n): ');
        
        if (sendTestResponse.toLowerCase() === 'y') {
          if (transporter) {
            // Send test email
            await transporter.sendMail({
              from: process.env.EMAIL_FROM || '"ETHCluj Conference" <noreply@ethcluj.org>',
              to: testEmailAddress!,
              subject: `[TEST] Your ETHCluj Conference Sessions Information - ${speaker.name}`,
              html: emailContent
            });
            
            console.log(`Test email for ${speaker.name} sent to ${testEmailAddress}`);
          } else {
            // Log the test email content
            console.log(`\n\n=== TEST EMAIL for ${speaker.name} (to: ${testEmailAddress}) ===\n`);
            console.log(`Subject: Your ETHCluj Conference Sessions Information`);
            console.log(`Sessions included: ${sessions.map(s => s.title).join(', ')}`);
            
            // Save the email to a file for inspection
            const testFilePath = path.join(__dirname, `test-email-${speaker.name.replace(/\s+/g, '-')}.html`);
            fs.writeFileSync(testFilePath, emailContent);
            console.log(`Test email saved to: ${testFilePath}`);
          }
        }
        
        // Ask if user wants to send the actual email
        sendActualResponse = await askQuestion(rl, `Send the actual email to ${speaker.name} <${speaker.email}>? (y/n): `);
        
        if (sendActualResponse.toLowerCase() !== 'y') {
          console.log(`Skipping email to ${speaker.name}`);
          continue; // Skip to next speaker
        }
      }
      
      // Send email or log it in test mode
      if (transporter) {
        // In interactive mode with confirmed actual email, use speaker's email regardless of test mode
        const actualRecipient = interactiveMode && sendActualResponse.toLowerCase() === 'y' ? speaker.email : recipient;
        
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || '"ETHCluj Conference" <noreply@ethcluj.org>',
          to: actualRecipient,
          subject: 'Your ETHCluj Conference Sessions Information',
          html: emailContent
        });
        
        console.log(`Email sent to ${actualRecipient === speaker.email ? speaker.name : `test address (${actualRecipient})`} with ${sessions.length} sessions`);
        
        // Record that email was sent if it was sent to the actual speaker
        if (actualRecipient === speaker.email) {
          recordSentEmail(speaker, sessions);
        }
      } else {
        // Log the email content for testing
        console.log(`\n\n=== TEST EMAIL for ${speaker.name} (to: ${recipient}) ===\n`);
        console.log(`Subject: Your ETHCluj Conference Sessions Information`);
        console.log(`Sessions included: ${sessions.map(s => s.title).join(', ')}`);
        
        // Save the email to a file for inspection in test mode
        let outputDir = __dirname;
        
        // If debug mode is enabled, create a more structured output
        console.log('Debug mode status:', debugMode);
        if (debugMode) {
          console.log('Creating debug directory...');
          outputDir = path.join(__dirname, 'debug');
          console.log('Debug directory path:', outputDir);
          if (!fs.existsSync(outputDir)) {
            console.log('Debug directory does not exist, creating it...');
            try {
              fs.mkdirSync(outputDir, { recursive: true });
              console.log('Debug directory created successfully');
            } catch (error) {
              console.error('Error creating debug directory:', error);
            }
          } else {
            console.log('Debug directory already exists');
          }
          
          // Save the email content to a file
          const debugFilePath = path.join(outputDir, `${speaker.name.replace(/\s+/g, '-')}_email.html`);
          fs.writeFileSync(debugFilePath, emailContent);
          
          // Also save a JSON file with metadata about the email
          const metadata = {
            speaker: speaker.name,
            email: speaker.email,
            sessionCount: sessions.length,
            sessionTitles: sessions.map(s => s.title),
            sessionTypes: sessions.map(s => s.type),
            hasPanel: sessions.some(s => (s.type || '').toLowerCase().includes('panel')),
            hasKeynote: sessions.some(s => (s.type || '').toLowerCase().includes('keynote')),
            timestamp: new Date().toISOString()
          };
          
          const metadataFilePath = path.join(outputDir, `${speaker.name.replace(/\s+/g, '-')}_metadata.json`);
          fs.writeFileSync(metadataFilePath, JSON.stringify(metadata, null, 2));
          
          console.log(`Debug email content saved to ${debugFilePath}`);
          console.log(`Debug metadata saved to ${metadataFilePath}`);
        } else {
          // Regular test mode behavior
          const testFilePath = path.join(outputDir, `test-email-${speaker.name.replace(/\s+/g, '-')}.html`);
          fs.writeFileSync(testFilePath, emailContent);
          console.log(`Test email saved to: ${testFilePath}`);
        }
      }
      
      // If we're just testing for one speaker, exit after the first email
      if (isTestMode && !interactiveMode) {
        break;
      }
    } catch (error) {
      console.error(`Error sending email to ${speaker.name}:`, error);
    }
  }
  
  // Close the readline interface if it was created
  if (rl) {
    rl.close();
  }
}

// Function to prompt for user input
const readline = require('readline');

function createPrompt() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

async function askQuestion(rl: any, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      resolve(answer);
    });
  });
}

// Main function
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const testMode = args.includes('--test');
    const testAddress = args.find(arg => arg.startsWith('--email='))?.split('=')[1];
    const testSpeaker = args.find(arg => arg.startsWith('--speaker='))?.split('=')[1];
    const limitArg = args.find(arg => arg.startsWith('--limit='));
    const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 0;
    const forceAllRemaining = args.includes('--force-all-remaining');
    const interactiveMode = args.includes('--all-remaining-with-prompt');
    const debugMode = args.includes('--debug');
    
    // Debug logging for command line arguments
    console.log('Command line arguments:');
    console.log('  testMode:', testMode);
    console.log('  testAddress:', testAddress);
    console.log('  testSpeaker:', testSpeaker);
    console.log('  debugMode:', debugMode);
    
    console.log('ETHCluj Conference - Speaker Session Notification System');
    console.log('======================================================');
    
    // Safety check: Require explicit flags for actual email sending
    if (!testMode && !limitArg && !forceAllRemaining && !interactiveMode) {
      console.error('ERROR: Safety restrictions require explicit flags for sending emails.');
      console.error('Please use one of the following:');
      console.error('  --test                      : Test mode, no real emails sent');
      console.error('  --limit=N                   : Send to the first N speakers only');
      console.error('  --force-all-remaining      : Send to all speakers who haven\'t received emails yet');
      console.error('  --all-remaining-with-prompt : Interactive mode, prompts before sending each email');
      console.error('Example: node send-speaker-emails.js --limit=5');
      process.exit(1);
    }
    
    // Check if interactive mode has required test email
    if (interactiveMode && !testAddress) {
      console.error('ERROR: Interactive mode (--all-remaining-with-prompt) requires a test email address.');
      console.error('Please provide a test email with --email=your-email@example.com');
      process.exit(1);
    }
    
    if (testMode) {
      console.log('Running in TEST mode');
      if (testAddress) console.log(`Test email address: ${testAddress}`);
      if (testSpeaker) console.log(`Test speaker: ${testSpeaker}`);
    } else if (limit > 0) {
      console.log(`Will send to the first ${limit} speakers who haven't received emails yet`);
    } else if (forceAllRemaining) {
      console.log('Will send to ALL remaining speakers who haven\'t received emails yet');
    } else if (interactiveMode) {
      console.log('Running in INTERACTIVE mode');
      console.log(`Test email address: ${testAddress}`);
      console.log('You will be prompted before sending each email');
    }
    
    // 1. Fetch all speakers with emails
    const speakersWithEmails = await fetchSpeakersWithEmails(testMode);
    const stageManagers = await fetchStageManagers();
    
    // 3. Fetch all sessions
    const sessions = await getSessionsFromGoogleSheet();
    
    // 4. Enhance sessions with additional information
    const enhancedSessions: SessionWithDetails[] = sessions.map(session => ({
      ...session,
      formattedDateTime: formatDateTime(session.startTime),
      formattedDuration: calculateDuration(session.type),
      stageManager: getStageManagerForStage(session.stage, stageManagers)
    }));
    
    // 5. Group sessions by speaker
    let speakerSessions = groupSessionsBySpeaker(enhancedSessions, speakersWithEmails);
    
    // 6. Filter out speakers who have already received emails (unless in test mode)
    if (!testMode) {
      const tracker = loadEmailTracker();
      const filteredSessions = new Map();
      
      for (const [name, data] of speakerSessions.entries()) {
        if (!hasSpeakerReceivedEmail(data.speaker, tracker)) {
          filteredSessions.set(name, data);
        }
      }
      
      const skippedCount = speakerSessions.size - filteredSessions.size;
      speakerSessions = filteredSessions;
      
      if (skippedCount > 0) {
        console.log(`Skipping ${skippedCount} speakers who already received emails`);
      }
      console.log(`Found ${speakerSessions.size} speakers who haven't received emails yet`);
      
      if (speakerSessions.size === 0) {
        console.log('No new speakers to send emails to. Exiting.');
        return;
      }
    }
    
    // 7. If test mode with specific speaker, filter for that speaker
    if (testMode && testSpeaker) {
      const normalizedTestSpeaker = testSpeaker.toLowerCase();
      const filteredSessions = new Map();
      
      for (const [name, data] of speakerSessions.entries()) {
        if (name.includes(normalizedTestSpeaker)) {
          filteredSessions.set(name, data);
        }
      }
      
      if (filteredSessions.size > 0) {
        speakerSessions = filteredSessions;
        console.log(`Found ${filteredSessions.size} speakers matching "${testSpeaker}"`);
      } else {
        console.error(`No speakers found matching "${testSpeaker}"`);
        return;
      }
    }
    
    // 8. Apply limit if specified
    if (!testMode && limit > 0 && speakerSessions.size > limit) {
      const limitedSessions = new Map();
      let count = 0;
      
      for (const [name, data] of speakerSessions.entries()) {
        limitedSessions.set(name, data);
        count++;
        
        if (count >= limit) break;
      }
      
      speakerSessions = limitedSessions;
      console.log(`Limited to the first ${limit} speakers`);
    }
    
    // 9. Send emails
    console.log(`Preparing emails for ${speakerSessions.size} speakers...`);
    await sendSpeakerEmails(speakerSessions, testAddress, interactiveMode, debugMode);
    
    console.log('Operation completed successfully.');
  } catch (error) {
    console.error('Error in speaker notification system:', error);
    process.exit(1);
  }
}

// Execute the script
if (require.main === module) {
  main();
}

export {
  fetchSpeakersWithEmails,
  fetchStageManagers,
  groupSessionsBySpeaker,
  sendSpeakerEmails
};
