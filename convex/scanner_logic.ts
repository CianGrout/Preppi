import { v } from "convex/values";
import { action } from "./_generated/server";

export const searchBarcode = action({
  args: { barcode: v.string() },
  handler: async (ctx, args) => {
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v3/product/${args.barcode}.json`
      );
      
      const data = await response.json();

      if (data.status === "success" && data.product) {
        return data.product.product_name || "Unknown Item";
      }
      
      return "not found";
    } catch (error) {
      console.error("Barcode Action Error:", error);
      return "not found";
    }
  },
});