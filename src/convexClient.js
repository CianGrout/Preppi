import { ConvexReactClient } from "convex/react";

// Expo requires EXPO_PUBLIC_ prefix to expose env vars to the app bundle.
const url = process.env.EXPO_PUBLIC_CONVEX_URL;

export function getConvexClient() {
  if (!url) {
    // Throwing keeps the failure loud in dev; the UI layer can catch if desired.
    throw new Error(
      "Missing EXPO_PUBLIC_CONVEX_URL. Set it in your environment (see .env.example)."
    );
  }
  return new ConvexReactClient(url);
}

