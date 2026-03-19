import { useState } from "react";
import { Button, Text, View } from "react-native";
import { authClient } from "../src/lib/auth-client";

export default function Login() {
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const signInWithGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
        errorCallbackURL: "/login",
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

