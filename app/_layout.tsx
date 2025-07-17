import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { ColorSchemeProvider } from "@/components/ColorSchemeContext";
import { SettingsProvider } from "@/components/SettingsContext";
import { ThemeProvider, useTheme } from "@/components/ThemeContext";

function RootLayoutNav() {
  const { isDark } = useTheme();

  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <SettingsProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style={isDark ? "light" : "dark"} />
      </SettingsProvider>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ColorSchemeProvider>
      <ThemeProvider>
        <RootLayoutNav />
      </ThemeProvider>
    </ColorSchemeProvider>
  );
}
