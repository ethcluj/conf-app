// Hard-coded configuration for speaker image positioning
// In a real-world scenario, this could be loaded from an API or environment variables

// List of speakers that should have center-focused images instead of top-focused
const CENTER_FOCUSED_SPEAKERS = [
  "George Loukovitis",
  "Anders Holmbjerg Kristiansen",
  "Luis"
];

/**
 * Determines if a speaker's image should be center-focused instead of top-focused
 * @param speakerName The name of the speaker to check
 * @returns true if the speaker should have a center-focused image, false otherwise
 */
export function shouldUseCenterFocusedImage(speakerName: string): boolean {
  if (!speakerName) return false;
  
  return CENTER_FOCUSED_SPEAKERS.some(
    name => name.toLowerCase() === speakerName.toLowerCase()
  );
}

// Export the configuration for use in other components
export const config = {
  speakerImagePositioning: {
    centerFocused: CENTER_FOCUSED_SPEAKERS
  }
};

export default config;
