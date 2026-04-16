import {
    openBrowserAsync,
    WebBrowserPresentationStyle,
} from "expo-web-browser";
import { Linking, Platform } from "react-native";

const normalizeUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

export async function openExternalUrl(rawUrl: string): Promise<boolean> {
  const url = normalizeUrl(rawUrl);

  if (!url) {
    return false;
  }

  try {
    if (Platform.OS === "web") {
      await Linking.openURL(url);
      return true;
    }

    await openBrowserAsync(url, {
      presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
    });
    return true;
  } catch {
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      return false;
    }
  }
}
