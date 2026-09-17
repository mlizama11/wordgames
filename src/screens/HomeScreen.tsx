import React from "react";
import { ScrollView, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../constants";
import { styles } from "../styles";
import { Session } from "../types";
import { GameCard } from "../components/GameCard";
import { Logo } from "../components/Logo";

type HomeScreenProps = {
  session: Session;
  onSignOut: () => void;
  onPlay: () => void;
};

export function HomeScreen({ session, onSignOut, onPlay }: HomeScreenProps) {
  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.homeContainer}>
        <View style={styles.nav}>
          <Logo />
          <Pressable accessibilityRole="button" onPress={onSignOut}>
            <Text style={styles.signOut}>Sign out</Text>
          </Pressable>
        </View>
        <View style={styles.greeting}>
          <Text style={styles.eyebrow}>SATURDAY, SEPTEMBER 12</Text>
          <Text style={styles.homeTitle}>
            Good morning, {session.email.split("@")[0]}.
          </Text>
          <Text style={styles.homeSubtitle}>Take five. Make some words.</Text>
        </View>
        <View style={styles.streakRow}>
          <View>
            <Text style={styles.streakNumber}>04</Text>
            <Text style={styles.streakLabel}>day streak</Text>
          </View>
          <View style={styles.streakDivider} />
          <View>
            <Text style={styles.streakNumber}>12</Text>
            <Text style={styles.streakLabel}>puzzles solved</Text>
          </View>
          <Text style={styles.streakFlame}>✦</Text>
        </View>
        <Text style={styles.sectionTitle}>Today’s games</Text>
        <GameCard
          accent={COLORS.lime}
          description="One clue. One word. A clean little win."
          icon="✦"
          onPress={onPlay}
          title="Daily Clue"
        />
        <GameCard
          accent={COLORS.coral}
          description="Build a chain before the clock runs out."
          icon="↗"
          locked
          title="Word Ladder"
        />
        <GameCard
          accent={COLORS.sky}
          description="Find the hidden theme in nine tiles."
          icon="⊞"
          locked
          title="Gridlock"
        />
        <Text style={styles.footerQuote}>
          “Words are, of course, the most powerful drug used by mankind.”
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
