import { Platform } from "react-native";

const defaultHost = Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1";
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!configuredApiUrl && process.env.NODE_ENV === "production") {
  throw new Error("EXPO_PUBLIC_API_URL must be set for production builds.");
}

export const API_URL = configuredApiUrl ?? `http://${defaultHost}:4000`;
