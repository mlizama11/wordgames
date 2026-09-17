import React, { useEffect, useState } from "react";
import { ScrollView, Pressable, Text, TextInput, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";
import { ApiError, getDailyClue, submitDailyGuess } from "../api";
import { styles } from "../styles";

type DailyClueProps = { accessToken: string; onBack: () => void };
const guessSchema = z.object({
  guess: z.string().trim().min(1, "Enter an answer.").max(32),
});
type GuessFields = z.infer<typeof guessSchema>;

export function DailyClue({ accessToken, onBack }: DailyClueProps) {
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [clue, setClue] = useState<string | null>(null);
  const [answerLength, setAnswerLength] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const { control, handleSubmit, formState } = useForm<GuessFields>({
    resolver: zodResolver(guessSchema),
    defaultValues: { guess: "" },
  });

  useEffect(() => {
    getDailyClue(accessToken)
      .then((dailyClue) => {
        setClue(dailyClue.clue);
        setAnswerLength(dailyClue.answerLength);
        setSubmitted(dailyClue.completed);
        setIsCorrect(dailyClue.completed);
      })
      .catch((requestError) => {
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "We could not load today's puzzle.",
        );
      });
  }, [accessToken]);

  async function submitGuess({ guess }: GuessFields) {
    setError("");
    setIsBusy(true);
    try {
      const result = await submitDailyGuess(accessToken, guess);
      setSubmitted(true);
      setIsCorrect(result.correct);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "We could not check your answer.",
      );
    } finally {
      setIsBusy(false);
    }
  }
  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.gameContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.gameNav}>
          <Pressable accessibilityRole="button" onPress={onBack}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          <Text style={styles.gameCounter}>01 / 01</Text>
        </View>
        <View style={styles.gameHeading}>
          <Text style={styles.eyebrow}>DAILY CLUE</Text>
          <Text style={styles.gameTitle}>A fresh start.</Text>
          <Text style={styles.gameSubtitle}>
            The answer is {answerLength ?? "..."} letters.
          </Text>
        </View>
        <View style={styles.clueBox}>
          <Text style={styles.clueLabel}>CLUE</Text>
          <Text style={styles.clueText}>
            {clue ?? "Loading today's clue..."}
          </Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.inputLabel}>Your answer</Text>
        <Controller
          control={control}
          name="guess"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              autoCapitalize="characters"
              maxLength={32}
              onBlur={onBlur}
              onChangeText={(nextValue) => {
                onChange(nextValue);
                setSubmitted(false);
              }}
              placeholder="TYPE HERE"
              placeholderTextColor="#7D8780"
              style={styles.answerInput}
              value={value}
            />
          )}
        />
        {formState.errors.guess ? (
          <Text style={styles.error}>{formState.errors.guess.message}</Text>
        ) : null}
        {submitted ? (
          <View
            style={[
              styles.resultBox,
              isCorrect ? styles.correctBox : styles.tryAgainBox,
            ]}
          >
            <Text style={styles.resultTitle}>
              {isCorrect ? "Nailed it. ✦" : "Not quite yet."}
            </Text>
            <Text style={styles.resultText}>
              {isCorrect
                ? "That's the word. Your streak is safe."
                : "Try thinking about what you might add to iced tea."}
            </Text>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={handleSubmit(submitGuess)}
          style={[styles.primaryButton, isBusy && styles.disabledButton]}
        >
          <Text style={styles.primaryButtonText}>
            {isBusy
              ? "Checking..."
              : submitted && isCorrect
                ? "Solved"
                : "Check answer"}
          </Text>
        </Pressable>
        <Text style={styles.gameHint}>No pressure. Take your best shot.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
