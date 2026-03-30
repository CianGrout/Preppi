import { v } from "convex/values";
import { api } from "./_generated/api";
import { action, mutation, query } from "./_generated/server";

export const getInternalBarcode = query({
  args: { barcode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("barcodes") // This refers to the TABLE name in schema.ts
      .withIndex("by_barcode", (q) => q.eq("barcode", args.barcode))
      .unique();
  },
});

export const searchBarcode = action({
  args: { barcode: v.string() },
  handler: async (ctx, args): Promise<string> => {
    const internal = await ctx.runQuery(api.barcode.getInternalBarcode, { 
      barcode: args.barcode 
    });

    if (internal) return internal.name;
    return "not found";
  },
});

export const registerBarcode = mutation({
  args: { barcode: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("barcodes")
      .withIndex("by_barcode", (q) => q.eq("barcode", args.barcode))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { name: args.name });
      return "Updated";
    }

    await ctx.db.insert("barcodes", {
      barcode: args.barcode,
      name: args.name,
    });
    return "Saved";
  },
});