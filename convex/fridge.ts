import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const addItem = mutation({
  args: { name: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const cleanName = args.name.trim();
    if (cleanName === "") return;

    await ctx.db.insert("fridgeItems", {
      name: cleanName,
      userId: args.userId,
      createdAt: Date.now(),
    });
  },
});

export const getMyFridge = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    if (args.userId === "loading") return [];
    return await ctx.db
      .query("fridgeItems")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const removeItem = mutation({
  args: { id: v.id("fridgeItems") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const deleteUsedItems = mutation({
  args: { ids: v.array(v.string()) },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      const normalizedId = ctx.db.normalizeId("fridgeItems", id);
      if (normalizedId) {
        await ctx.db.delete(normalizedId);
      } else {
        console.error(`Could not delete: ${id} is not a valid ID`);
      }
    }
  },
});