import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authClient } from "../../src/lib/auth-client";

const colors = {
  background: "#F6F7F3",
  surface: "#FFFFFF",
  border: "#E2E7DD",
  text: "#172017",
  textMuted: "#6C766B",
  green: "#29C46E",
  greenSoft: "#E8F8EE",
};

export default function ProfileScreen() {
  const session = authClient.useSession();
  const user = session.data?.user;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Ionicons name="person-outline" size={28} color={colors.green} />
          </View>
          <Text style={styles.title}>Profile</Text>
          {user ? (
            <>
              <Text style={styles.email}>{user.email}</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.signOutButton,
                  pressed && styles.signOutButtonPressed,
                ]}
                onPress={() =>
                  authClient.signOut({
                    fetchOptions: {
                      onSuccess: () => {},
                    },
                  })
                }
              >
                <Text style={styles.signOutText}>Sign out</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.emptyText}>Not signed in.</Text>
          )}
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
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: "center",
    shadowColor: "#101711",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.greenSoft,
    marginBottom: 18,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 10,
    letterSpacing: -0.6,
  },
  email: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 22,
  },
  signOutButton: {
    minWidth: 140,
    minHeight: 50,
    borderRadius: 999,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.green,
  },
  signOutButtonPressed: {
    opacity: 0.85,
  },
  signOutText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
  },
});
