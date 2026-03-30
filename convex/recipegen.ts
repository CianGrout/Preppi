import { v } from "convex/values";
import { action } from "./_generated/server";

export const generateRecipeText = action({
  args: { 
    items: v.array(v.object({ id: v.string(), name: v.string() })),
    mealType: v.string(),
    seed: v.string(),
    bannedIngredientIds: v.array(v.string()), 
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    const bannedItems = args.items.filter(i => args.bannedIngredientIds.includes(i.id));
    const bannedNamesString = bannedItems.map(i => i.name).join(", ");
    const filteredItems = args.items.filter(i => !args.bannedIngredientIds.includes(i.id));
    const ingredientNames = filteredItems.map(i => i.name).join(", ");
     
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", 
        temperature: 1.2, 
        messages: [
          {
            role: "system",
            content: `You're a person looking to cook a home meal. 
            ONLY use these specific ingredients: ${ingredientNames}.
            STRICT RULES:
            1. REPEAT PREVENTION: Do not use ${bannedNamesString || "the previous main protein"}.
            2. NO ASSUMPTIONS: No bread, rice, or pasta unless provided in the list, unless its key to a new recipe and isnt the main part of the dish.
            3. DIFFERENTIATION: Make this meal distinct from a ${bannedNamesString} dish.
            4. Return the name of the main ingredient as 'mainIngredientName'.
            5. Make plain meals don't get fancy these are home cooked meals.
            6. Dont prioritise the ingredients at the top of the list of ingredients all are just as valuable.
            7. Try to keep the flavours of the dish similar not diverse.
            8. Only use options that fit ${args.mealType}.
            9. The meal composition is really important dont put random things together for the sake of a big meal, small is okay`
          },
          {
            role: "user",
            content: `Generate a ${args.mealType} recipe. Seed: ${args.seed}. Return ONLY JSON: { 
              "title": string, 
              "ingredients": string[], 
              "instructions": string[], 
              "prepTime": string, 
              "usedIngredientIds": string[],
              "mainIngredientName": string 
            }`
          }
        ],
        response_format: { type: "json_object" }, 
      }),
    });

    const data = await response.json();
    if (!data.choices) throw new Error("Text AI failed: " + JSON.stringify(data));
    
    const recipeJson = JSON.parse(data.choices[0].message.content);

    const actualUsedIds = args.items
      .filter(item => 
        recipeJson.ingredients.some((ing: string) => 
          ing.toLowerCase().includes(item.name.toLowerCase())
        )
      )
      .map(item => item.id);

    const foundItem = args.items.find(i => 
      recipeJson.mainIngredientName.toLowerCase().includes(i.name.toLowerCase()) ||
      i.name.toLowerCase().includes(recipeJson.mainIngredientName.toLowerCase())
    );

    return {
      ...recipeJson,
      usedIngredientIds: actualUsedIds,
      mainIngredientId: foundItem ? foundItem.id : null,
      debugBannedList: bannedNamesString 
    };
  },
});

export const generateRecipeImage = action({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: `A professional, appetizing food photography shot of ${args.title}. Plated beautifully on a simple, neutral plate, natural soft lighting, high resolution, minimalist home-cooked style.`,
        n: 1,
        size: "1024x1024",
        quality: "standard"
      }),
    });
    
    const imageData = await imageResponse.json();
    
    if (imageResponse.ok && imageData.data?.[0]?.url) {
      return imageData.data[0].url;
    } else {
      console.error("DALL-E Rejection Details:", JSON.stringify(imageData));
      return null;
    }
  },
});