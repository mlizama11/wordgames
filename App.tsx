import React, { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { logout, refresh } from "./src/api";
import { REFRESH_TOKEN_KEY } from "./src/constants";
import { styles } from "./src/styles";
import { AppScreen, Session } from "./src/types";
import { AuthScreen } from "./src/screens/AuthScreen";
import { DailyClue } from "./src/screens/DailyClue";
import { HomeScreen } from "./src/screens/HomeScreen";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [screen, setScreen] = useState<AppScreen>("home");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const storedRefreshToken =
        await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (storedRefreshToken) {
        const nextSession = await refresh(storedRefreshToken);
        await SecureStore.setItemAsync(
          REFRESH_TOKEN_KEY,
          nextSession.refreshToken,
        );
        setSession(nextSession);
      }
    } catch {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    if (session) await logout(session.refreshToken).catch(() => undefined);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    setSession(null);
    setScreen("home");
  }

  async function handleAuthenticated(nextSession: Session) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, nextSession.refreshToken);
    setSession(nextSession);
  }

  return (
    <SafeAreaProvider>
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
          <StatusBar style="dark" />
        </View>
      ) : !session ? (
        <View style={styles.flex}>
          <AuthScreen onAuthenticated={handleAuthenticated} />
          <StatusBar style="dark" />
        </View>
      ) : (
        <View style={styles.flex}>
          {screen === "home" ? (
            <HomeScreen
              onPlay={() => setScreen("game")}
              onSignOut={signOut}
              session={session}
            />
          ) : (
            <DailyClue
              accessToken={session.accessToken}
              onBack={() => setScreen("home")}
            />
          )}
          <StatusBar style="dark" />
        </View>
      )}
    </SafeAreaProvider>
  );
}
