import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  scans: defineTable({
    items: v.array(v.string()),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),

  recipes: defineTable({
    scanId: v.id("scans"),
    text: v.string(),
    createdAt: v.number(),
  }).index("by_scanId", ["scanId"]),

  chats: defineTable({
    userId: v.string(),
    title: v.string(),
    createdAt: v.number(),
  }).index("by_user_createdAt", ["userId", "createdAt"]),

  messages: defineTable({
    chatId: v.id("chats"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_chat_createdAt", ["chatId", "createdAt"]),

  fridgeItems: defineTable({
    name: v.string(),
    userId: v.string(),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),
  
  users: defineTable({
    name: v.string(),
    tokenIdentifier: v.string(),
  }).index("by_token", ["tokenIdentifier"]),

  fridge: defineTable({
    name: v.string(),
    userId: v.string(),
  }).index("by_user", ["userId"]),

  barcodes: defineTable({
    barcode: v.string(),
    name: v.string(),
  }).index("by_barcode", ["barcode"]),
});