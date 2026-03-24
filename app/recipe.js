import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";

const fetchRecipe = async (items) => {
  try {
    const response = await fetch(
      `http://YOUR IP ADDRESS HERE/recipe-search?items=${items}`
    );
    const recipe = await response.json();
    return recipe;
  } catch (error) {
    return "not found";
  }
};

export default function Recipe() {
  const { items } = useLocalSearchParams();
  const parsedItems = (() => {
    if (!items) return [];
    if (Array.isArray(items)) {
      return JSON.parse(items[0]);
    }
    return JSON.parse(items);
  })();

  // Keeping existing behavior; wire this to Convex later.
  fetchRecipe(items);

  return (
    <Text>
      Ingredients:
      <Text>{"\n"}</Text>
      {parsedItems.join("\n")}
    </Text>
  );
}

