# ETHCluj Conference App PWA Setup

This document provides instructions for completing the Progressive Web App (PWA) setup for the ETHCluj Conference App.

## PWA Implementation

The ETHCluj Conference App has been converted into a Progressive Web App (PWA) with the following features:

- Installable on mobile and desktop devices
- Works offline with cached resources
- First-time installation guide for users
- Platform-specific installation instructions

## Completing the PWA Icon Setup

Currently, the app uses placeholder PNG files for PWA icons. To create proper icons:

1. Replace the placeholder icon files with proper PNG icons:
   - Create 192x192 and 512x512 PNG icons based on your app logo
   - Place them in the `/public/icons/` directory with filenames:
     - `icon-192x192.png`
     - `icon-512x512.png`

2. You can use any image editing software to create these icons, or use online tools like:
   - [Favicon Generator](https://realfavicongenerator.net/)
   - [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
   - [App Icon Generator](https://appicon.co/)

## Testing PWA Installation

To test the PWA installation:

1. Build and run the app in production mode:
   ```bash
   npm run build
   npm run start
   ```

2. Open the app in a supported browser (Chrome, Edge, Safari on iOS, etc.)
3. You should see the installation prompt appear for first-time users
4. Follow the on-screen instructions to install the app

## PWA Features

The PWA implementation includes:

- Service worker for offline caching
- Web app manifest for installation
- Installation guide with platform-specific instructions
- Proper metadata for iOS and Android devices

## Troubleshooting

If you encounter issues with the PWA installation:

1. Check browser console for errors
2. Verify that all required files are properly served:
   - `/manifest.json`
   - `/sw.js`
   - `/pwa-register.js`
   - Icon files in `/icons/` directory
3. Use Lighthouse in Chrome DevTools to audit PWA compliance
