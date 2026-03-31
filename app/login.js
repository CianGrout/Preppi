import { useState } from "react";
import { Button, Platform, Text, View } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { authClient } from "../src/lib/auth-client";

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
    <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "600" }}>Preppi</Text>
      <Text style={{ opacity: 0.8 }}>Sign in to continue.</Text>
      <Button
        title={busy ? "Signing in…" : "Continue with Google"}
        disabled={busy}
        onPress={signInWithGoogle}
      />
      {!!error && <Text style={{ color: "crimson" }}>{error}</Text>}
    </View>
  );
}

