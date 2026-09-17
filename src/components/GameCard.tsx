import React from "react";
import { Pressable, Text, View } from "react-native";
import { styles } from "../styles";

type GameCardProps = {
  title: string;
  description: string;
  accent: string;
  icon: string;
  onPress?: () => void;
  locked?: boolean;
};

export function GameCard({
  title,
  description,
  accent,
  icon,
  onPress,
  locked = false,
}: GameCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={locked}
      onPress={onPress}
      style={[
        styles.gameCard,
        { backgroundColor: accent },
        locked && styles.lockedCard,
      ]}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardIcon}>{icon}</Text>
        <Text style={styles.cardStatus}>{locked ? "SOON" : "PLAY"}</Text>
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
      <Text style={styles.cardArrow}>
        {locked ? "Coming soon" : "Open game  →"}
      </Text>
    </Pressable>
  );
}
