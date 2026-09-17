import React from "react";
import { Text, View } from "react-native";
import { styles } from "../styles";

export function Logo() {
  return (
    <View style={styles.logoRow}>
      <View style={styles.logoTile}>
        <Text style={styles.logoTileText}>W</Text>
      </View>
      <Text style={styles.logoText}>wordly</Text>
    </View>
  );
}
