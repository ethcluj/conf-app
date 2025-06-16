# Speaker Session Notification System

This script sends personalized emails to ETHCluj conference speakers with details about their sessions including keynotes, panels, workshops, and other events.

## Features

- Fetches speaker data with email addresses from Google Sheets
- Fetches session data from the conference schedule in Google Sheets  
- Fetches stage manager information from Google Sheets
- Groups sessions by speaker
- Generates personalized emails with detailed information for each session
- Supports test mode to preview emails before sending
- Fully customizable email templates (HTML)
- Tracks which speakers have already received emails to prevent duplicates
- Requires explicit flags for sending real emails to prevent accidental sending
- Can limit sending to the first N speakers

## Prerequisites

1. Node.js 14+ and npm installed
2. Proper environment variables set in `.env` file in the backend directory:
   - `GOOGLE_SHEET_ID`: ID of the Google Sheet containing conference data
   - `GOOGLE_API_KEY`: API key for Google Sheets API
   - `GOOGLE_SHEET_NAME`: Name of the schedule tab in the Google Sheet
   - `GOOGLE_SPEAKERS_EMAIL_SHEET_NAME`: Name of the speakers with emails tab (default: "Speakers-Email")
   - `GOOGLE_STAGE_MANAGERS_SHEET_NAME`: Name of the stage managers tab (default: "StageManagers")
   - `EMAIL_USER`: Gmail username for sending emails
   - `EMAIL_PASSWORD`: Gmail app password for sending emails
   - `EMAIL_FROM`: "From" address for emails (default: "ETHCluj Conference <noreply@ethcluj.org>")

**Note:** The script uses the same email configuration as the existing email verification system.

## Google Sheets Structure

### Required Setup

You need to set up the following in your existing Google Spreadsheet:

1. **Add an Email column** to your existing Speakers tab (or use a separate tab specified in `GOOGLE_SPEAKERS_EMAIL_SHEET_NAME` env var)
2. **Create a StageManagers tab** (or name specified in `GOOGLE_STAGE_MANAGERS_SHEET_NAME` env var)

### Speaker Sheet with Contact Information
The script will use your existing Speakers sheet by default, which should have these columns:
- Name: Speaker's full name (must match names in the Agenda sheet)
- Org: Speaker's organization
- Social: Speaker's social media link
- Photo: URL to speaker's photo
- Visible: Boolean indicating if the speaker should be included (true/false)
- Bio: Speaker's biography
- Email or Phone: Add either an Email or Phone column (or both) for contact information

Note: For sending actual emails, at least one of Email or Phone columns must be present

### Stage Managers Sheet
The "StageManagers" sheet must have the following columns:
- Name: Stage manager's name
- Telegram: Stage manager's Telegram handle
- Email: Stage manager's email
- Stages: Comma-separated list of stages this manager is responsible for

## Usage

### Build the Script

```bash
cd backend
npm run build
```

### Safety Features

The script includes several safety features to prevent accidental email sending:

1. **Email Tracking**: The script records which speakers have received emails in the `sent-emails-tracker.json` file and automatically skips those speakers when running again.

2. **Required Safety Flags**: Running the script without explicit flags will result in an error. This ensures emails are never sent accidentally.

3. **Limited Sending**: You can limit sending to just the first N speakers who haven't received emails yet.

### Run in Test Mode

To test the email for a specific speaker and send it to a test email address:

```bash
node dist/src/scripts/send-speaker-emails.js --test --email=test@example.com --speaker="John Doe"
```

**Note:** The compiled JavaScript file is in `dist/src/scripts/` directory, not in `dist/scripts/`.

### Send to Limited Number of Speakers

To send real emails to just the first 5 speakers who haven't received emails yet:

```bash
node dist/src/scripts/send-speaker-emails.js --limit=5
```

### Send to All Remaining Speakers

To send emails to all speakers who haven't received emails yet:

```bash
node dist/src/scripts/send-speaker-emails.js --force-all-remaining
```

### Interactive Mode with Prompts

To send emails with interactive prompting before each email is sent:

```bash
node dist/src/scripts/send-speaker-emails.js --all-remaining-with-prompt --email=test@example.com
```

This mode:
- Requires a test email address (via `--email=` parameter)
- Shows details about each speaker and their sessions
- Asks if you want to send a test email first (to your test address)
- Asks for confirmation before sending the actual email to each speaker
- Updates the sent-emails-tracker.json file only for speakers who actually received emails
- Allows you to skip any speaker by answering 'n' to the prompt

### Command Line Options

- `--test`: Enables test mode (emails saved to files instead of sent)
- `--email=address@example.com`: Send test email to this address
- `--speaker="Speaker Name"`: Only process emails for speakers matching this name
- `--limit=N`: Send emails to the first N speakers who haven't received emails yet
- `--force-all-remaining`: Send to all remaining speakers who haven't received emails yet
- `--all-remaining-with-prompt`: Interactive mode that prompts before sending each email

## Email Content

Each personalized email includes:

1. Speaker name and greeting
2. For each session:
   - Session Type
   - Session Title
   - Date & Time
   - Stage
   - Duration (calculated based on session type)
   - Track (for Keynotes only)
   - Difficulty Level (for Keynotes only)
   - Stage Manager contact information
   - App link to the session

## Customizing Templates

The email templates are stored in two HTML files:

1. `speaker-email-template.html`: Main email template
2. `session-details-template.html`: Template for each session block

You can customize these templates to change the email appearance. The templates use a simple placeholder system with `{{placeholderName}}` syntax.

## Development

To modify the script:

1. Edit the TypeScript files in `src/scripts/`
2. Build with `npm run build`
3. Test with the test mode options
