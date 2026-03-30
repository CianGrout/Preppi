import { Ionicons } from '@expo/vector-icons';
import { useAction, useMutation } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../convex/_generated/api";

export default function RecipeScreen() {
  const { items, mealType } = useLocalSearchParams();
  const [recipe, setRecipe] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(false);
  
  const router = useRouter();
  const generateRecipeText = useAction(api.recipegen.generateRecipeText);
  const generateRecipeImage = useAction(api.recipegen.generateRecipeImage);
  const deleteUsedItems = useMutation(api.fridge.deleteUsedItems);
  
  const bannedIds = useRef([]); 

  const fetchRecipe = useCallback(async () => {
    setLoading(true);
    setImageUrl(null);
    try {
      const parsed = JSON.parse(items);
      const itemsForAI = parsed.map(item => ({
        id: item._id || item.id,
        name: item.name
      }));

      const result = await generateRecipeText({ 
        items: itemsForAI, 
        mealType: mealType || "dinner",
        seed: Math.random().toString(),
        bannedIngredientIds: bannedIds.current
      });
      
      setRecipe(result);
      setLoading(false);

      if (result.mainIngredientId && !bannedIds.current.includes(result.mainIngredientId)) {
        bannedIds.current.push(result.mainIngredientId);
      }

      setImageLoading(true);
      const url = await generateRecipeImage({ title: result.title });
      setImageUrl(url);
      setImageLoading(false);

    } catch (err) {
      console.error(err);
      setLoading(false);
      setImageLoading(false);
    }
  }, [items, mealType, generateRecipeText, generateRecipeImage]);

  useEffect(() => {
    fetchRecipe();
  }, []);

  const handleRefresh = () => {
    fetchRecipe();
  };

  const handleFinishedCooking = async () => {
    if (!recipe?.usedIngredientIds || recipe.usedIngredientIds.length === 0) {
      Alert.alert("Notice", "No ingredients found to remove.");
      return;
    }
    try {
      await deleteUsedItems({ ids: recipe.usedIngredientIds });
      router.replace("/(tabs)/fridge");
    } catch (err) {
      Alert.alert("Error", "Could not update fridge");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#2d3436" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{mealType?.toUpperCase()}</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Ionicons name="refresh" size={24} color="#27ae60" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#27ae60" />
            <Text style={{ marginTop: 10 }}>Planning your meal...</Text>
          </View>
        ) : (
          recipe && (
            <View>
              <View style={styles.imageContainer}>
                {imageUrl ? (
                  <Image 
                    source={{ uri: imageUrl }} 
                    style={styles.recipeImage} 
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.recipeImage, styles.imagePlaceholder]}>
                    {imageLoading ? (
                      <ActivityIndicator color="#27ae60" />
                    ) : (
                      <Ionicons name="fast-food-outline" size={40} color="#b2bec3" />
                    )}
                  </View>
                )}
              </View>

              <Text style={styles.title}>{recipe.title}</Text>
              <Text style={styles.subtitle}>{recipe.prepTime}</Text>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ingredients</Text>
                {recipe.ingredients.map((ing, i) => (
                  <Text key={i} style={styles.text}>- {ing}</Text>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Instructions</Text>
                {recipe.instructions.map((step, i) => (
                  <Text key={i} style={styles.text}>{i + 1}. {step}</Text>
                ))}
              </View>

              <TouchableOpacity style={styles.confirmButton} onPress={handleFinishedCooking}>
                <Text style={styles.confirmText}>I Cooked This!</Text>
              </TouchableOpacity>
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f2f6' },
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  content: { padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  imageContainer: { width: '100%', height: 250, marginBottom: 20 },
  recipeImage: { width: '100%', height: '100%', borderRadius: 15 },
  imagePlaceholder: { backgroundColor: '#f5f6fa', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: "bold" },
  subtitle: { color: "#636e72", marginBottom: 20 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  text: { fontSize: 16, marginBottom: 8 },
  confirmButton: { backgroundColor: "#27ae60", padding: 18, borderRadius: 12, marginTop: 40, marginBottom: 20, alignItems: "center" },
  confirmText: { color: "white", fontSize: 18, fontWeight: "bold" },
});