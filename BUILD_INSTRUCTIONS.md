# Building APK with EAS - Environment Variables Guide

## Problem
When building APK with EAS, environment variables from `.env.local` are not included in the build, causing the app to fail when trying to connect to Supabase or use Gemini API.

## Solution
EAS provides two ways to handle environment variables:

### Option 1: EAS Secrets (Recommended for Sensitive Data)
Store sensitive API keys securely in EAS cloud.

#### Steps:
1. **Install EAS CLI** (if not already installed):
   ```bash
   npm install -g eas-cli
   ```

2. **Login to EAS**:
   ```bash
   eas login
   ```

3. **Set secrets from .env.local**:
   ```bash
   eas secret:push --scope project --env-file .env.local --force
   ```

   Or set them individually:
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "your-url" --type string
   eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-key" --type string
   eas secret:create --scope project --name EXPO_PUBLIC_GEMINI_CHAT_API_KEY_1 --value "your-key" --type string
   eas secret:create --scope project --name EXPO_PUBLIC_GEMINI_CHAT_API_KEY_2 --value "your-key" --type string
   eas secret:create --scope project --name EXPO_PUBLIC_GEMINI_MODERATION_API_KEY_1 --value "your-key" --type string
   eas secret:create --scope project --name EXPO_PUBLIC_GEMINI_MODERATION_API_KEY_2 --value "your-key" --type string
   ```

4. **Build your APK**:
   ```bash
   # Preview build (for testing)
   eas build --platform android --profile preview

   # Production build (for release)
   eas build --platform android --profile production
   ```

### Option 2: Environment Variables in eas.json
For non-sensitive data or when you want to see the values in your repo.

Edit `eas.json` and add actual values to the `env` section:
```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-anon-key"
      }
    }
  }
}
```

**⚠️ Warning**: Don't commit sensitive API keys directly in `eas.json` if your repo is public!

## Current Configuration

Your app uses these environment variables:
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase public API key
- `EXPO_PUBLIC_GEMINI_CHAT_API_KEY_1` - Primary Gemini API key for chat
- `EXPO_PUBLIC_GEMINI_CHAT_API_KEY_2` - Fallback Gemini API key for chat
- `EXPO_PUBLIC_GEMINI_MODERATION_API_KEY_1` - Primary Gemini API key for moderation
- `EXPO_PUBLIC_GEMINI_MODERATION_API_KEY_2` - Fallback Gemini API key for moderation

## Verification

After building, you can verify the environment variables are working by:
1. Installing the APK on a device
2. Opening the app
3. Trying to use features that require Supabase (community, leaderboard, friends)
4. Trying to use the AI chat (Schrödi)
5. Trying to post a comment (AI moderation)

If any of these fail, the environment variables are not set correctly.

## Troubleshooting

### Environment variables not found in build
- Make sure you ran `eas secret:push` before building
- Check that your `.env.local` file has all required variables
- Verify secrets are set: `eas secret:list`

### Build succeeds but app crashes
- Check the app logs for "API key not configured" errors
- Verify the environment variable names match exactly (case-sensitive)
- Make sure you're using `EXPO_PUBLIC_` prefix (required for Expo)

### Secrets vs Environment Variables
- **EAS Secrets**: Encrypted, not visible in logs, recommended for production
- **eas.json env**: Visible in build logs, easier for debugging

## Quick Start

Run this one command to set everything up:
```bash
eas secret:push --scope project --env-file .env.local --force && eas build --platform android --profile preview
```

This will:
1. Push all secrets from `.env.local` to EAS
2. Start building a preview APK with all environment variables included
