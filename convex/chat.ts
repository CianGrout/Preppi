import { v } from "convex/values";
import { api } from "./_generated/api";
import { action, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

function getAuthUserId(user: any): string | null {
  return (
    user?.userId ??
    user?.id ??
    user?._id ??
    user?.subject ??
    user?.sub ??
    null
  );
}

export const listChats = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) return [];
    const userId = getAuthUserId(user);
    if (!userId) return [];
    return await ctx.db
      .query("chats")
      .withIndex("by_user_createdAt", (q) =>
        q.eq("userId", userId)
      )
      .order("desc")
      .take(20);
  },
});

export const getMessages = query({
  args: { chatId: v.optional(v.id("chats")) },
  handler: async (ctx, { chatId }) => {
    if (chatId === undefined) return [];
    const user = await authComponent.getAuthUser(ctx);
    if (!user) return [];
    const userId = getAuthUserId(user);
    if (!userId) return [];

    const chat = await ctx.db.get(chatId);
    if (!chat || chat.userId !== userId) return [];

    return await ctx.db
      .query("messages")
      .withIndex("by_chat_createdAt", (q) => q.eq("chatId", chatId))
      .order("asc")
      .take(50);
  },
});

export const deleteChat = mutation({
  args: { chatId: v.id("chats") },
  handler: async (ctx, { chatId }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");
    const userId = getAuthUserId(user);
    if (!userId) throw new Error("Unauthorized");
    const chat = await ctx.db.get(chatId);
    if (!chat || chat.userId !== userId) return;
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_chat_createdAt", (q) => q.eq("chatId", chatId))
      .collect();
    for (const m of msgs) {
      await ctx.db.delete(m._id);
    }
    await ctx.db.delete(chatId);
  },
});

export const appendUserMessage = mutation({
  args: {
    chatId: v.optional(v.id("chats")),
    content: v.string(),
  },
  handler: async (ctx, { chatId, content }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");
    const userId = getAuthUserId(user);
    if (!userId) throw new Error("Unauthorized");

    const now = Date.now();
    let cid = chatId;
    if (!cid) {
      const title = content.trim().slice(0, 40) || "New chat";
      cid = await ctx.db.insert("chats", {
        userId,
        title,
        createdAt: now,
      });
    } else {
      const chat = await ctx.db.get(cid);
      if (!chat || chat.userId !== userId) {
        throw new Error("Chat not found");
      }
    }

    await ctx.db.insert("messages", {
      chatId: cid,
      role: "user",
      content,
      createdAt: now,
    });

    return { chatId: cid };
  },
});

export const appendAssistantMessage = mutation({
  args: { chatId: v.id("chats"), content: v.string() },
  handler: async (ctx, { chatId, content }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");
    const userId = getAuthUserId(user);
    if (!userId) throw new Error("Unauthorized");
    const chat = await ctx.db.get(chatId);
    if (!chat || chat.userId !== userId) throw new Error("Chat not found");
    await ctx.db.insert("messages", {
      chatId,
      role: "assistant",
      content,
      createdAt: Date.now(),
    });
  },
});

export const prepareMessage = mutation({
  args: {
    chatId: v.optional(v.id("chats")),
    content: v.string(),
  },
  handler: async (ctx, { chatId, content }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");
    const userId = getAuthUserId(user);
    if (!userId) throw new Error("Unauthorized");

    const now = Date.now();
    let cid = chatId;
    if (!cid) {
      const title = content.trim().slice(0, 40) || "New chat";
      cid = await ctx.db.insert("chats", {
        userId,
        title,
        createdAt: now,
      });
    } else {
      const chat = await ctx.db.get(cid);
      if (!chat || chat.userId !== userId) throw new Error("Chat not found");
    }

    await ctx.db.insert("messages", {
      chatId: cid,
      role: "user",
      content,
      createdAt: now,
    });

    const assistantMessageId = await ctx.db.insert("messages", {
      chatId: cid,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    });

    return { chatId: cid, assistantMessageId };
  },
});

export const appendAssistantChunk = mutation({
  args: {
    assistantMessageId: v.id("messages"),
    chunk: v.string(),
  },
  handler: async (ctx, { assistantMessageId, chunk }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");
    const userId = getAuthUserId(user);
    if (!userId) throw new Error("Unauthorized");

    const msg = await ctx.db.get(assistantMessageId);
    if (!msg || msg.role !== "assistant") return;

    const chat = await ctx.db.get(msg.chatId);
    if (!chat || chat.userId !== userId) throw new Error("Chat not found");

    await ctx.db.patch(assistantMessageId, {
      content: (msg.content ?? "") + chunk,
    });
  },
});

async function streamOpenAIChat({
  openaiKey,
  messagesPayload,
  onDelta,
}: {
  openaiKey: string;
  messagesPayload: Array<{ role: string; content: string }>;
  onDelta: (delta: string) => Promise<void> | void;
}) {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: messagesPayload,
      max_tokens: 500,
      temperature: 0.7,
      stream: true,
    }),
  });

  if (!resp.ok) {
    const errorBody = await resp.text();
    throw new Error(`OpenAI error ${resp.status}: ${errorBody}`);
  }

  const reader = resp.body?.getReader();
  if (!reader) throw new Error("OpenAI response missing body reader");

  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice("data:".length).trim();
      if (!data) continue;
      if (data === "[DONE]") return;

      let parsed: any;
      try {
        parsed = JSON.parse(data);
      } catch {
        continue;
      }

      const delta = parsed?.choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta.length > 0) {
        await onDelta(delta);
      }
    }
  }
}

export const streamAssistantResponse = action({
  args: {
    chatId: v.id("chats"),
    assistantMessageId: v.id("messages"),
  },
  handler: async (ctx, { chatId, assistantMessageId }) => {
    const openaiKey = process.env.OPENAI_API_KEY;

    // This query already enforces ownership via auth.
    const history = await ctx.runQuery(api.chat.getMessages, { chatId });
    if (!history || history.length === 0) return { chatId };

    const messagesPayload = [
      {
        role: "system",
        content:
          "You are a helpful cooking assistant inside the Preppi app. " +
          "Be concise, friendly, and focus on recipes, ingredients, and meal planning.",
      },
      ...history
        .filter(
          (m: any) =>
            m._id !== assistantMessageId &&
            typeof m.content === "string" &&
            m.content.length > 0
        )
        .map((m: any) => ({ role: m.role, content: m.content })),
    ];

    if (!openaiKey) {
      await ctx.runMutation(api.chat.appendAssistantChunk, {
        assistantMessageId,
        chunk:
          "AI is not configured yet. Please set OPENAI_API_KEY in Convex environment.",
      });
      return { chatId };
    }

    // Throttle DB writes:
    // Convex billing/request counts increase with every mutation.
    // For free-tier friendliness, we update the assistant message less frequently.
    let pending = "";
    let lastFlush = Date.now();
    const flush = async (force = false) => {
      if (!pending) return;
      const now = Date.now();
      // Flush only when:
      // - we have accumulated enough text, OR
      // - enough time has passed since last flush.
      if (!force && pending.length < 80 && now - lastFlush < 200) return;
      const chunkToSend = pending;
      pending = "";
      lastFlush = now;
      await ctx.runMutation(api.chat.appendAssistantChunk, {
        assistantMessageId,
        chunk: chunkToSend,
      });
    };

    try {
      await streamOpenAIChat({
        openaiKey,
        messagesPayload,
        onDelta: async (delta) => {
          pending += delta;
          await flush(false);
        },
      });
      await flush(true);
    } catch (err: any) {
      console.error("OpenAI stream failed:", err?.message ?? err);
      const lower = String(err?.message ?? err ?? "").toLowerCase();
      let fallback =
        "AI is temporarily unavailable right now. Please try again in a minute.";
      if (
        lower.includes("429") ||
        lower.includes("billing") ||
        lower.includes("quota") ||
        lower.includes("insufficient")
      ) {
        fallback =
          "AI is unavailable due to OpenAI billing/quota limits. Please top up credits and try again.";
      }
      await ctx.runMutation(api.chat.appendAssistantChunk, {
        assistantMessageId,
        chunk: fallback,
      });
    }

    return { chatId };
  },
});

