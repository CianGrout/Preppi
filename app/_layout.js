import { Slot, Redirect, usePathname } from "expo-router";
import { ConvexReactClient, ConvexProvider } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { useEffect, useMemo } from "react";
import { LogBox, Text, View } from "react-native";
import { authClient } from "../src/lib/auth-client";

// Suppress KeepAwake error when returning from OAuth browser (activity no longer available)
LogBox.ignoreLogs([
  "ExpoKeepAwake",
  "current activity is no longer available",
]);

useEffect(() => {
  const listener = (e) => {
    const msg =
      e?.reason?.message ?? e?.message ?? String(e?.reason ?? e ?? "");
    if (
      msg.includes("ExpoKeepAwake") ||
      msg.includes("current activity is no longer available")
    ) {
      e?.preventDefault?.();
    }
  };
  if (typeof globalThis.addEventListener === "function") {
    globalThis.addEventListener("unhandledrejection", listener);
    return () =>
      globalThis.removeEventListener("unhandledrejection", listener);
  }
}, []);

export default function RootLayout() {
  const pathname = usePathname();

  const convex = useMemo(() => {
    const url = process.env.EXPO_PUBLIC_CONVEX_URL;
    if (!url) return null;
    return new ConvexReactClient(url, {
      expectAuth: true,
      unsavedChangesWarning: false,
    });
  }, []);

  const session = authClient.useSession();

  if (!convex) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ paddingHorizontal: 24, textAlign: "center" }}>
          Missing EXPO_PUBLIC_CONVEX_URL / EXPO_PUBLIC_CONVEX_SITE_URL. Copy
          .env.example to .env and set your Convex deployment URLs.
        </Text>
      </View>
    );
  }

  if (session.isPending) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Loading…</Text>
      </View>
    );
  }

  const isAuthed = !!session.data?.session;
  const isOnLogin = pathname === "/login";
  if (!isAuthed && !isOnLogin) return <Redirect href="/login" />;
  if (isAuthed && isOnLogin) return <Redirect href="/" />;

  return (
    <ConvexProvider client={convex}>
      <ConvexBetterAuthProvider client={convex} authClient={authClient}>
        <Slot />
      </ConvexBetterAuthProvider>
    </ConvexProvider>
  );
}

