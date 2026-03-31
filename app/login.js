import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { authClient } from "../src/lib/auth-client";

const colors = {
  background: "#F6F7F3",
  surface: "#FFFFFF",
  surfaceMuted: "#EFF3EC",
  border: "#E2E7DD",
  text: "#172017",
  textMuted: "#6C766B",
  green: "#29C46E",
  greenDark: "#1E9E57",
  danger: "#D94B64",
};

export default function Login() {
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const googleServerClientId =
    process.env.EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID?.trim();
  const googleIosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

  const signInWithGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      if (Platform.OS === "web") {
        throw new Error(
          "Google login is configured for native mobile only in this app."
        );
      }

      if (Platform.OS === "android" && !googleServerClientId) {
        throw new Error(
          "Missing EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID in environment."
        );
      }

      if (Platform.OS === "ios" && !googleIosClientId) {
        throw new Error(
          "Missing EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID in environment."
        );
      }

      if (Platform.OS === "ios" && !googleServerClientId) {
        throw new Error(
          "Missing EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID in environment."
        );
      }

      GoogleSignin.configure(
        Platform.OS === "android"
          ? { webClientId: googleServerClientId }
          : {
              iosClientId: googleIosClientId,
              webClientId: googleServerClientId,
            }
      );

      await GoogleSignin.hasPlayServices();
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult?.data?.idToken ?? signInResult?.idToken;

      if (!idToken) {
        throw new Error(
          "Google sign-in did not return idToken. Check OAuth client configuration."
        );
      }

      await authClient.signIn.social({
        provider: "google",
        idToken: {
          token: idToken,
        },
      });
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Preppi</Text>
          </View>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>
            Continue with Google to access your fridge, scans, and chats.
          </Text>
        </View>

        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              busy && styles.primaryButtonDisabled,
              pressed && !busy && styles.primaryButtonPressed,
            ]}
            disabled={busy}
            onPress={signInWithGoogle}
          >
            <Text style={styles.primaryButtonText}>
              {busy ? "Signing in..." : "Continue with Google"}
            </Text>
          </Pressable>
          {!!error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  hero: {
    marginBottom: 24,
    gap: 10,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.greenDark,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
    maxWidth: 320,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 22,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#101711",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.green,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonPressed: {
    backgroundColor: colors.greenDark,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
});
