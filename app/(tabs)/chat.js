import { useEffect, useMemo, useRef, useState } from "react";
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
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

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
    // Restore the most recent existing chat on app refresh/reopen.
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
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 24}
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
            <Text style={{ color: "#6B7280" }}>
              Start a conversation with Preppi.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item._id ?? String(item.createdAt)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: true })
            }
          />
        )}
        {sending && (
          <View style={styles.typing}>
            <ActivityIndicator size="small" color="#6B7280" />
            <Text style={{ marginLeft: 8, color: "#6B7280" }}>Thinking…</Text>
          </View>
        )}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask for a recipe, meal idea, or ingredient tip..."
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
            {sending ? "…" : "Send"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingVertical: 8,
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 4,
  },
  bubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: "#111827",
  },
  bubbleAssistant: {
    alignSelf: "flex-start",
    backgroundColor: "#E5E7EB",
  },
  bubbleText: {
    fontSize: 15,
  },
  bubbleTextUser: {
    color: "#FFFFFF",
  },
  bubbleTextAssistant: {
    color: "#111827",
  },
  typing: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D1D5DB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: "#FFFFFF",
  },
  sendButton: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
    borderRadius: 20,
    backgroundColor: "#111827",
  },
  sendButtonDisabled: {
    backgroundColor: "#E5E7EB",
  },
  sendButtonPressed: {
    opacity: 0.85,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  sendButtonTextDisabled: {
    color: "#9CA3AF",
  },
});

