/**
 * Error screen for a route group: the message and the first lines of the stack, selectable, with a
 * Try again button. expo-router's own screen shows the message only, which is rarely enough to find
 * where a render error comes from.
 */

import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { createStyles, fontFaces, useTheme } from "@/theme";

const useStyles = createStyles((theme) => ({
  root: { flex: 1, backgroundColor: theme.colors.mapBackground, paddingHorizontal: 20, gap: 12 },
  title: { fontSize: 20, ...fontFaces.heavy, color: theme.colors.text },
  message: { fontSize: 15, lineHeight: 21, ...fontFaces.bold, color: theme.colors.error },
  stack: { fontSize: 11, lineHeight: 16, color: theme.colors.textMuted },
}));

export function RouteError({ error, retry }: { error: Error; retry: () => Promise<unknown> }) {
  const { theme } = useTheme();
  const styles = useStyles(theme);
  const insets = useSafeAreaInsets();
  const stack = (error.stack ?? "").split("\n").slice(0, 14).join("\n");
  if (__DEV__) console.warn("Route error:", error.message, "\n", error.stack);
  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 12 }]}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message} selectable>
        {error.message}
      </Text>
      <ScrollView style={{ flex: 1 }}>
        <Text style={styles.stack} selectable>
          {stack}
        </Text>
      </ScrollView>
      <Button label="Try again" onPress={() => void retry()} />
    </View>
  );
}
