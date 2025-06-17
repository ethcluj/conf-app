/**
 * Script to generate a mapping of session titles to their desired fixed IDs
 * 
 * This script reads the messed-up-ids.txt file and creates a mapping of session titles
 * to their desired fixed IDs. It then outputs the mapping in a format that can be easily
 * used to update the Google Sheet manually.
 */
import * as fs from 'fs';
import * as path from 'path';

// Path to the messed-up-ids.txt file
const messedUpIdsFilePath = path.join(__dirname, 'messed-up-ids.txt');

interface SessionMapping {
  title: string;
  id: string;
}

/**
 * Parse the messed-up-ids.txt file to extract session titles and their corresponding IDs
 * @returns An array of session mappings
 */
function parseMessedUpIdsFile(): SessionMapping[] {
  const fileContent = fs.readFileSync(messedUpIdsFilePath, 'utf-8');
  const lines = fileContent.split('\n');
  const sessionMappings: SessionMapping[] = [];

  // Process lines in pairs (title, URL)
  for (let i = 0; i < lines.length; i += 4) {
    const title = lines[i]?.trim();
    const urlLine = lines[i + 1]?.trim();

    if (title && urlLine && urlLine.startsWith('https://app.ethcluj.org/session/')) {
      // Extract the session ID from the URL
      const sessionId = urlLine.split('/').pop();
      if (sessionId) {
        sessionMappings.push({
          title,
          id: sessionId
        });
      }
    }
  }

  return sessionMappings;
}

/**
 * Main function
 */
function main() {
  try {
    console.log('Parsing messed-up-ids.txt file...');
    const sessionMappings = parseMessedUpIdsFile();
    console.log(`Found ${sessionMappings.length} sessions to fix\n`);

    console.log('=== Session ID Mapping ===');
    console.log('Copy this mapping to update your Google Sheet:\n');
    
    // Output in a table format for easy copy-pasting
    console.log('Session Title | Fixed ID (Column D)');
    console.log('------------- | ------------------');
    
    sessionMappings.forEach(mapping => {
      console.log(`${mapping.title} | ${mapping.id}`);
    });

    // Also save to a JSON file for reference
    const outputPath = path.join(__dirname, 'session-id-mapping.json');
    fs.writeFileSync(outputPath, JSON.stringify(sessionMappings, null, 2));
    console.log(`\nMapping saved to ${outputPath}`);
    
    console.log('\nInstructions:');
    console.log('1. For each session in the mapping, find the corresponding row in the sheet');
    console.log('2. Set the value in column D to the Fixed ID from the mapping');
    console.log('3. After updating the Google Sheet, restart the backend to apply the changes');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
main();
