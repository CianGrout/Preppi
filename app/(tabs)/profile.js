import { Button, Text, View } from "react-native";
import { authClient } from "../../src/lib/auth-client";

export default function ProfileScreen() {
  const session = authClient.useSession();
  const user = session.data?.user;

  return (
    <View
      style={{
        flex: 1,
        padding: 24,
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: "600" }}>Profile</Text>
      {user ? (
        <>
          <Text>{user.email}</Text>
          <Button
            title="Sign out"
            onPress={() =>
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {},
                },
              })
            }
          />
        </>
      ) : (
        <Text>Not signed in.</Text>
      )}
    </View>
  );
}

