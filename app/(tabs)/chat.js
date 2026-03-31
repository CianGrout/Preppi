import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const colors = {
  background: "#F6F7F3",
  surface: "#FFFFFF",
  surfaceMuted: "#EEF2EA",
  border: "#E2E7DD",
  text: "#172017",
  textMuted: "#6C766B",
  green: "#29C46E",
  greenDark: "#1E9E57",
  greenSoft: "#E8F8EE",
  bubbleUser: "#182019",
};

export default function ChatScreen() {
  const [chatId, setChatId] = useState(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const prepareMessage = useMutation(api.chat.prepareMessage);
  const streamAssistantResponse = useAction(api.chat.streamAssistantResponse);
  const chats = useQuery(api.chat.listChats);
  const remoteMessages = useQuery(
    api.chat.getMessages,
    chatId ? { chatId } : undefined
  );

  const messages = remoteMessages ?? [];

  useEffect(() => {
    if (!chatId && Array.isArray(chats) && chats.length > 0) {
      setChatId(chats[0]._id);
      return;
    }
  }, [chatId, chats]);

  useEffect(() => {
    if (messages.length && listRef.current) {
      listRef.current.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  const onSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const prepared = await prepareMessage({
        content: trimmed,
        ...(chatId ? { chatId } : {}),
      });

      setChatId(prepared.chatId);
      setInput("");

      await streamAssistantResponse({
        chatId: prepared.chatId,
        assistantMessageId: prepared.assistantMessageId,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }) => {
    const isUser = item.role === "user";
    return (
      <View
        style={[
          styles.bubbleWrap,
          isUser ? styles.bubbleWrapUser : styles.bubbleWrapAssistant,
        ]}
      >
        {!isUser && <View style={styles.assistantDot} />}
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAssistant,
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant,
            ]}
          >
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 78 : 24}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Chat</Text>
          <Text style={styles.subtitle}>
            Ask Preppi anything about recipes or ingredients.
          </Text>
        </View>

        <View style={styles.messagesContainer}>
          {remoteMessages === undefined || messages.length === 0 ? (
            <View style={styles.center}>
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={24}
                    color={colors.greenDark}
                  />
                </View>
                <Text style={styles.emptyTitle}>Start a conversation</Text>
                <Text style={styles.emptyText}>
                  Ask for a recipe, ingredient swaps, or help with what is in
                  your fridge.
                </Text>
              </View>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item._id ?? String(item.createdAt)}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() =>
                listRef.current?.scrollToEnd({ animated: true })
              }
            />
          )}
          {sending && (
            <View style={styles.typing}>
              <ActivityIndicator size="small" color={colors.textMuted} />
              <Text style={styles.typingText}>Thinking...</Text>
            </View>
          )}
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask for a recipe, meal idea, or ingredient tip..."
            placeholderTextColor="#98A397"
            multiline
          />
          <Pressable
            onPress={onSend}
            disabled={sending || !input.trim()}
            style={({ pressed }) => [
              styles.sendButton,
              (sending || !input.trim()) && styles.sendButtonDisabled,
              pressed && !sending && input.trim() && styles.sendButtonPressed,
            ]}
          >
            <Text
              style={[
                styles.sendButtonText,
                (sending || !input.trim()) && styles.sendButtonTextDisabled,
              ]}
            >
              {sending ? "..." : "Send"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
  },
  header: {
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    marginTop: 6,
    maxWidth: 320,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 28,
    paddingVertical: 32,
    alignItems: "center",
    maxWidth: 360,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: "center",
  },
  listContent: {
    paddingBottom: 10,
    gap: 10,
  },
  bubbleWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 4,
  },
  bubbleWrapUser: {
    alignSelf: "flex-end",
  },
  bubbleWrapAssistant: {
    alignSelf: "flex-start",
  },
  assistantDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.greenSoft,
    borderWidth: 2,
    borderColor: colors.green,
    marginRight: 10,
    marginBottom: 12,
  },
  bubble: {
    maxWidth: "84%",
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  bubbleUser: {
    backgroundColor: colors.bubbleUser,
    borderBottomRightRadius: 8,
  },
  bubbleAssistant: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 8,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: "#FFFFFF",
  },
  bubbleTextAssistant: {
    color: colors.text,
  },
  typing: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  typingText: {
    marginLeft: 8,
    color: colors.textMuted,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 104,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: "rgba(246, 247, 243, 0.96)",
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 52,
    maxHeight: 120,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    fontSize: 16,
    color: colors.text,
  },
  sendButton: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 14,
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: colors.green,
  },
  sendButtonDisabled: {
    backgroundColor: "#D7DED5",
  },
  sendButtonPressed: {
    backgroundColor: colors.greenDark,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sendButtonTextDisabled: {
    color: "#8D978D",
  },
});
