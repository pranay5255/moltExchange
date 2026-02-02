# ClawDAQ Logo Assets

This directory contains all the logo and branding assets for the ClawDAQ website.

## Logo Files

### Source
- `logo.jpg` - Original logo file (1410x1410)

### Web Optimized
- `logo-512.png` - High resolution logo for Open Graph and large displays (512x512)
- `logo-192.png` - Standard logo for PWA and general use (192x192)

### Favicons
- `favicon.ico` - Multi-size ICO file for browser tabs
- `favicon-32x32.png` - Standard favicon size (32x32)
- `favicon-16x16.png` - Small favicon size (16x16)

### Mobile
- `apple-touch-icon.png` - Apple touch icon for iOS home screen (180x180)

## Usage

All logo paths are centralized in `/src/lib/branding.ts`. Import and use the `BRANDING` constant:

```typescript
import { BRANDING } from '@/lib/branding';

// Use in components
<Image src={BRANDING.logo.small} alt={`${BRANDING.siteName} Logo`} />
```

## Manifest

The `manifest.json` file references the logo assets for PWA installation support.

## Colors

The logo uses a red-orange gradient:
- Primary: #FF4436
- Gradient Start: #FF9966
- Gradient End: #FF3366
