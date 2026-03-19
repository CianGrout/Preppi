import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";
import { api } from "./_generated/api";

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

export const sendMessage = action({
  args: {
    chatId: v.optional(v.id("chats")),
    content: v.string(),
  },
  handler: async (ctx, { chatId, content }) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const created = await ctx.runMutation(api.chat.appendUserMessage, {
      chatId,
      content,
    });
    const cid = created.chatId;
    const history = await ctx.runQuery(api.chat.getMessages, { chatId: cid });

    const openaiKey = process.env.OPENAI_API_KEY;

    const messagesPayload = [
      {
        role: "system",
        content:
          "You are a helpful cooking assistant inside the Preppi app. " +
          "Be concise, friendly, and focus on recipes, ingredients, and meal planning.",
      },
      ...history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    let assistantText =
      "AI is temporarily unavailable right now. Please try again in a minute.";

    if (!openaiKey) {
      assistantText =
        "AI is not configured yet. Please set OPENAI_API_KEY in Convex environment.";
    } else {
      try {
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
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          assistantText =
            data.choices?.[0]?.message?.content?.trim() ||
            "Sorry, I couldn't generate a response.";
        } else {
          const errorBody = await resp.text();
          if (
            resp.status === 401 ||
            resp.status === 429 ||
            errorBody.toLowerCase().includes("billing") ||
            errorBody.toLowerCase().includes("quota") ||
            errorBody.toLowerCase().includes("insufficient")
          ) {
            assistantText =
              "AI is unavailable due to OpenAI billing/quota limits. Please top up credits and try again.";
          }
          console.error(`OpenAI error ${resp.status}: ${errorBody}`);
        }
      } catch (err) {
        console.error("OpenAI request failed:", err);
      }
    }

    await ctx.runMutation(api.chat.appendAssistantMessage, {
      chatId: cid,
      content: assistantText,
    });
    const updatedMessages = await ctx.runQuery(api.chat.getMessages, {
      chatId: cid,
    });
    return { chatId: cid, messages: updatedMessages };
  },
});

