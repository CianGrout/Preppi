import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexProvider, ConvexReactClient, useMutation } from "convex/react";
import { Redirect, Slot, usePathname } from "expo-router";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, LogBox, Text, View } from "react-native";
import { api } from "../convex/_generated/api";
import { authClient } from "../src/lib/auth-client";

LogBox.ignoreLogs(["ExpoKeepAwake", "current activity is no longer available"]);

function AuthSyncGate({ children }) {
  const session = authClient.useSession();
  const storeUser = useMutation(api.users.storeUser);

  useEffect(() => {
    if (session.data?.session) {
      storeUser();
    }
  }, [session.data?.session]);

  return children;
}

export default function RootLayout() {
  const pathname = usePathname();
  const session = authClient.useSession(); // Keep only one declaration

  useEffect(() => {
    const listener = (e) => {
      const msg = e?.reason?.message ?? e?.message ?? String(e?.reason ?? e ?? "");
      if (msg.includes("ExpoKeepAwake") || msg.includes("current activity is no longer available")) {
        e?.preventDefault?.();
      }
    };
    if (typeof globalThis.addEventListener === "function") {
      globalThis.addEventListener("unhandledrejection", listener);
      return () => globalThis.removeEventListener("unhandledrejection", listener);
    }
  }, []);

  const convex = useMemo(() => {
    const url = process.env.EXPO_PUBLIC_CONVEX_URL;
    if (!url) return null;
    return new ConvexReactClient(url, { expectAuth: true, unsavedChangesWarning: false });
  }, []);

  if (!convex) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Missing EXPO_PUBLIC_CONVEX_URL in .env</Text>
      </View>
    );
  }

  if (session.isPending) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={{ marginTop: 10 }}>Checking the Fridge...</Text>
      </View>
    );
  }

  const isAuthed = !!session.data?.session;
  const isOnLogin = pathname === "/login";

  if (!isAuthed && !isOnLogin) return <Redirect href="/login" />;
  if (isAuthed && (isOnLogin || pathname === "/")) return <Redirect href="/(tabs)/fridge" />;

  return (
    <ConvexProvider client={convex}>
      <ConvexBetterAuthProvider client={convex} authClient={authClient}>
        {/* 2. WRAP THE SLOT IN THE SYNC GATE */}
        <AuthSyncGate>
          <Slot />
        </AuthSyncGate>
      </ConvexBetterAuthProvider>
    </ConvexProvider>
  );
}