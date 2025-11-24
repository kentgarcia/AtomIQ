# Gemini AI Setup Guide

This guide will help you set up the Gemini API for the AtomIQ AI chatbot.

## Prerequisites

1. A Google Cloud account
2. Access to Google AI Studio (https://makersuite.google.com/app/apikey)

## Step 1: Get Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key (it will look like: `AIzaSy...`)

## Step 2: Configure Environment Variables

### Option 1: Using .env file (Recommended)

1. Create a `.env` file in the root of your project (if it doesn't exist)
2. Add your API key:

```env
EXPO_PUBLIC_GEMINI_API_KEY=your_api_key_here
```

**Important:** Make sure `.env` is in your `.gitignore` file to keep your API key secure!

### Option 2: Using app.json (Alternative)

You can also add it to `app.json`:

```json
{
  "expo": {
    "extra": {
      "geminiApiKey": "your_api_key_here"
    }
  }
}
```

## Step 3: Restart Your Development Server

After adding the API key, restart your Expo development server:

```bash
npm start
# or
expo start
```

## Step 4: Test the Integration

1. Open the app
2. Navigate to the Chat tab
3. Ask a question like "What is nuclear fission?"
4. You should see a response from Schrödi with citations and follow-up suggestions

## Troubleshooting

### Error: "API key not configured"

- Make sure your `.env` file is in the root directory
- Ensure the variable name is exactly `EXPO_PUBLIC_GEMINI_API_KEY`
- Restart your development server after adding the key
- Check that `.env` is not in `.gitignore` (it should be ignored, but the file should exist locally)

### Error: "Failed to communicate with Gemini API"

- Check your internet connection
- Verify your API key is correct
- Make sure you haven't exceeded API quotas
- Check the Google AI Studio dashboard for any issues

### Error: "Response was blocked by safety filters"

- Some questions may trigger safety filters
- Try rephrasing your question
- The AI is configured to block harmful content

## API Usage & Limits

- Free tier: 15 requests per minute (RPM)
- Paid tier: Higher limits available
- Check [Google AI Studio](https://makersuite.google.com/app/apikey) for current limits

## Security Notes

⚠️ **Never commit your API key to version control!**

- Always keep `.env` in `.gitignore`
- Use environment variables for API keys
- Rotate your API key if it's accidentally exposed
- Consider using API key restrictions in Google Cloud Console

## Features

The Gemini integration includes:

✅ **Source Citations**: Automatically extracts and displays citations from authoritative sources (IAEA, UNSCEAR, NRC, etc.)

✅ **Follow-up Suggestions**: Generates contextual follow-up questions based on the conversation

✅ **Conversation History**: Maintains context across multiple messages

✅ **Error Handling**: Graceful error messages and fallbacks

✅ **Safety Filters**: Built-in content moderation

## Support

If you encounter issues:

1. Check the console logs for detailed error messages
2. Verify your API key is valid in Google AI Studio
3. Ensure you're using the correct API endpoint
4. Check network connectivity

For more information, visit:
- [Google AI Studio Documentation](https://ai.google.dev/docs)
- [Gemini API Reference](https://ai.google.dev/api)

