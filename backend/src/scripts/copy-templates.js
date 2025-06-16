const fs = require('fs');
const path = require('path');

// Source and destination paths
const sourceDir = path.join(__dirname);
const destDir = path.join(__dirname, '../../../backend/dist/src/scripts');

// Ensure the destination directory exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy template files
const templateFiles = ['speaker-email-template.html', 'session-details-template.html'];

templateFiles.forEach(file => {
  const sourcePath = path.join(sourceDir, file);
  const destPath = path.join(destDir, file);

  try {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`Successfully copied ${file} to dist directory`);
    
    // Verify the file exists in the destination directory
    if (fs.existsSync(destPath)) {
      console.log(`Verified template file exists at: ${destPath}`);
    } else {
      console.error(`Template file was not found at: ${destPath}`);
    }
  } catch (error) {
    console.error(`Error copying ${file}:`, error);
  }
});
