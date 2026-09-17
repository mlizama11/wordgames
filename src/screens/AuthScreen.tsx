import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { COLORS } from "../constants";
import { ApiError } from "../api";
import { login, register } from "../api";
import { styles } from "../styles";
import { Session } from "../types";
import { Logo } from "../components/Logo";

type AuthScreenProps = { onAuthenticated: (session: Session) => void };

const authSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Your password needs at least 8 characters."),
});
type AuthFields = z.infer<typeof authSchema>;

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const { control, handleSubmit, reset, clearErrors, formState } =
    useForm<AuthFields>({
      resolver: zodResolver(authSchema),
      defaultValues: { email: "", password: "" },
    });

  async function submit({ email, password }: AuthFields) {
    setError("");
    setIsBusy(true);
    try {
      const session = isSignUp
        ? await register(email, password)
        : await login(email, password);
      onAuthenticated(session);
    } catch (error) {
      setError(
        error instanceof ApiError
          ? error.message
          : "We could not reach the server. Try again.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.authContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Logo />
        <Text style={styles.eyebrow}>A little word therapy</Text>
        <Text style={styles.authTitle}>
          {isSignUp ? "Make room for play." : "Welcome back, wordsmith."}
        </Text>
        <Text style={styles.authSubtitle}>
          Tiny puzzles, bright moments, and a reason to come back tomorrow.
        </Text>
        <View style={styles.form}>
          <Text style={styles.inputLabel}>Email</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.muted}
                style={styles.input}
                value={value}
              />
            )}
          />
          {formState.errors.email ? (
            <Text style={styles.error}>{formState.errors.email.message}</Text>
          ) : null}
          <Text style={styles.inputLabel}>Password</Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                autoCapitalize="none"
                autoComplete="password"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="8+ characters"
                placeholderTextColor={COLORS.muted}
                secureTextEntry
                style={styles.input}
                value={value}
              />
            )}
          />
          {formState.errors.password ? (
            <Text style={styles.error}>
              {formState.errors.password.message}
            </Text>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            onPress={handleSubmit(submit)}
            style={styles.primaryButton}
          >
            {isBusy ? (
              <ActivityIndicator color={COLORS.ink} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isSignUp ? "Create account" : "Sign in"}
              </Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setIsSignUp(!isSignUp);
              setError("");
              clearErrors();
              reset();
            }}
            style={styles.switchButton}
          >
            <Text style={styles.switchText}>
              {isSignUp
                ? "Already have an account? Sign in"
                : "New here? Create an account"}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.privacyNote}>
          Your session is protected on this device with secure storage. We never
          save your password.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
