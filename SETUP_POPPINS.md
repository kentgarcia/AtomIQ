# Poppins Font Setup Guide

## ✅ Already Installed!

Poppins font is automatically installed via `@expo-google-fonts/poppins` package. No manual setup required!

## Installation

The package is already installed. If you need to reinstall:

```bash
npx expo install @expo-google-fonts/poppins
```

## Font Usage

The following Poppins weights are loaded and used throughout the app:

- **H1**: `Poppins_800ExtraBold` (800 weight)
- **H2**: `Poppins_700Bold` (700 weight)
- **H3**: `Poppins_600SemiBold` (600 weight)
- **H4**: `Poppins_500Medium` (500 weight)
- **Body Bold**: `Poppins_700Bold` (700 weight)
- **Buttons**: `Poppins_600SemiBold` (600 weight)
- **Labels**: `Poppins_500Medium` (500 weight)
- **Body Text**: Uses Google Sans Flex (variable font)

## How It Works

1. Fonts are loaded in `app/_layout.tsx` using the `usePoppins()` hook
2. Typography styles in `constants/typography.ts` reference the font names
3. The app waits for fonts to load before rendering

## Troubleshooting

- **Fonts not loading?** Make sure `@expo-google-fonts/poppins` is installed
- **Build errors?** Run `npx expo start --clear` to clear cache
- **Fonts look different?** The app will fall back to system fonts if Poppins isn't loaded

