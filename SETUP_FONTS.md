# Google Sans Flex Font Setup Guide

## Quick Setup

1. **Download Google Sans Flex:**
   - Visit: https://fonts.google.com/specimen/Google+Sans+Flex
   - Click "Download family" button
   - Extract the ZIP file

2. **Add Font Files:**
   - Copy the following font files to `assets/fonts/`:
     - `GoogleSansFlex-Regular.ttf` (or `.otf` if available)
     - `GoogleSansFlex-Medium.ttf` (or `.otf`)
     - `GoogleSansFlex-Bold.ttf` (or `.otf`)

3. **File Naming:**
   - Make sure files are named exactly as shown above
   - The font names in code must match these file names

4. **Restart Development Server:**
   ```bash
   # Stop the current server (Ctrl+C)
   # Then restart
   npx expo start
   ```

## Alternative: Using Google Sans (Non-Flex)

If you prefer to use the standard Google Sans (not Flex):

1. Visit: https://fonts.google.com/specimen/Google+Sans
2. Download and extract
3. Rename files to match:
   - `GoogleSans-Regular.ttf` → `GoogleSansFlex-Regular.ttf`
   - `GoogleSans-Medium.ttf` → `GoogleSansFlex-Medium.ttf`
   - `GoogleSans-Bold.ttf` → `GoogleSansFlex-Bold.ttf`
4. Update `constants/typography.ts` to use `GoogleSans-*` instead of `GoogleSansFlex-*`

## Troubleshooting

- **Fonts not loading?** Make sure file names match exactly (case-sensitive)
- **Build errors?** Ensure all three font files are present in `assets/fonts/`
- **Fonts look different?** The app will fall back to system fonts if Google Sans Flex isn't loaded

