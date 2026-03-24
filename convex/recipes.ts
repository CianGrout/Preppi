import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: { scanId: v.id("scans"), text: v.string() },
  handler: async (ctx, { scanId, text }) => {
    return await ctx.db.insert("recipes", {
      scanId,
      text,
      createdAt: Date.now(),
    });
  },
});

export const byScan = query({
  args: { scanId: v.id("scans") },
  handler: async (ctx, { scanId }) => {
    return await ctx.db
      .query("recipes")
      .withIndex("by_scanId", (q) => q.eq("scanId", scanId))
      .order("desc")
      .take(10);
  },
});

