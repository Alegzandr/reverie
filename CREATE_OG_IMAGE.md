# How to Create Your OG Image (Social Media Preview)

You need a **1200x630px PNG** image for social media previews.

## Quick Options:

### Option 1: Use Canva (Easiest, No Skills Needed)
1. Go to [Canva.com](https://canva.com)
2. Search for "Facebook Post" or create custom 1200x630px
3. Add:
   - Your app name: **PitchSongs**
   - Tagline: **"Free Online Audio Manipulation"**
   - Some music/audio wave graphics
   - Your brand colors (blue #007aff)
4. Download as PNG
5. Save to `public/og-image.png`

### Option 2: Online OG Image Generator
1. Go to [OG Image Playground](https://og-playground.vercel.app/)
2. Customize with your text
3. Download
4. Save as `public/og-image.png`

### Option 3: Use a Simple Tool (ImageMagick)
If you have ImageMagick installed:
```bash
# Create a simple text-based OG image
convert -size 1200x630 xc:#007aff \
  -gravity center \
  -pointsize 72 -fill white -annotate +0-50 'PitchSongs' \
  -pointsize 36 -fill white -annotate +0+50 'Free Audio Manipulation Tool' \
  public/og-image.png
```

### Option 4: Screenshot Your App
1. Open your app in browser
2. Take a nice screenshot
3. Resize to 1200x630px
4. Save as `public/og-image.png`

## Verify It Works
After creating the image, test it:
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)

---

**Current Status:** The HTML already points to `/pitch-songs/og-image.png`, you just need to create the file!
