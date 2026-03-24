import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: { items: v.array(v.string()) },
  handler: async (ctx, { items }) => {
    return await ctx.db.insert("scans", { items, createdAt: Date.now() });
  },
});

export const latest = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const n = Math.min(Math.max(limit ?? 10, 1), 50);
    return await ctx.db
      .query("scans")
      .withIndex("by_createdAt")
      .order("desc")
      .take(n);
  },
});

