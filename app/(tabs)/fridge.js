import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";

const colors = {
  background: "#F6F7F3",
  surface: "#FFFFFF",
  surfaceMuted: "#EEF2EA",
  border: "#E2E7DD",
  text: "#172017",
  textMuted: "#6C766B",
  green: "#29C46E",
  greenSoft: "#E8F8EE",
  greenDark: "#1E9E57",
  red: "#E25B66",
  redSoft: "#FCEBED",
};

const mealOptions = [
  { label: "Breakfast", value: "Breakfast" },
  { label: "Lunch", value: "lunch" },
  { label: "Dinner", value: "dinner" },
  { label: "Dessert", value: "dessert" },
  { label: "Snack", value: "snack" },
];
const emptyItems = [];

export default function FridgeScreen() {
  const router = useRouter();
  const [mealType, setMealType] = useState("dinner");
  const user = useQuery(api.users.getMe);
  const fridgeItems = useQuery(api.fridge.getMyFridge, {
    userId: user?._id ?? "loading",
  });
  const rawItems = fridgeItems ?? emptyItems;
  const removeItem = useMutation(api.fridge.removeItem);

  const groupedItems = useMemo(
    () =>
      rawItems.reduce((acc, item) => {
        const existing = acc.find((entry) => entry.name === item.name);
        if (existing) {
          existing.count += 1;
          existing.ids.push(item._id);
        } else {
          acc.push({ name: item.name, count: 1, ids: [item._id] });
        }
        return acc;
      }, []),
    [rawItems]
  );

  const selectedMeal =
    mealOptions.find((option) => option.value === mealType) ?? mealOptions[2];

  const handleGenerateRecipe = () => {
    if (rawItems.length === 0) {
      Alert.alert("Empty Fridge", "Add items first.");
      return;
    }
    const itemsWithIds = rawItems.map((item) => ({
      name: item.name,
      id: item._id,
    }));
    router.push({
      pathname: "/recipe",
      params: {
        items: JSON.stringify(itemsWithIds),
        mealType,
      },
    });
  };

  if (user === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>My Fridge</Text>
        <Text style={styles.subtitle}>
          Keep track of ingredients and turn them into a meal.
        </Text>
      </View>

      <View style={styles.selectorCard}>
        <Text style={styles.selectorLabel}>Meal category</Text>
        <View style={styles.selectorRow}>
          {mealOptions.map((option) => {
            const active = option.value === mealType;
            return (
              <Pressable
                key={option.value}
                style={[
                  styles.selectorPill,
                  active && styles.selectorPillActive,
                ]}
                onPress={() => setMealType(option.value)}
              >
                <Text
                  style={[
                    styles.selectorPillText,
                    active && styles.selectorPillTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Saved Items</Text>
        <Text style={styles.sectionMeta}>
          {groupedItems.length === 0
            ? "Nothing saved yet"
            : `${groupedItems.length} item${groupedItems.length === 1 ? "" : "s"}`}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={groupedItems}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.count}</Text>
              </View>
              <Text style={styles.itemName}>{item.name}</Text>
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeItem({ id: item.ids[0] })}
            >
              <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="leaf-outline" size={24} color={colors.greenDark} />
            </View>
            <Text style={styles.emptyTitle}>Your fridge is empty</Text>
            <Text style={styles.emptyText}>
              Add ingredients from the scan tab and they will show up here.
            </Text>
          </View>
        }
        ListFooterComponent={
          groupedItems.length > 0 ? (
            <View style={styles.ctaCard}>
              <View style={styles.ctaCopy}>
                <Text style={styles.ctaTitle}>
                  {rawItems.length} item{rawItems.length === 1 ? "" : "s"} ready
                  to cook
                </Text>
                <Text style={styles.ctaText}>
                  Build a {selectedMeal.label.toLowerCase()} recipe from what you
                  already have.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.generateBtn}
                onPress={handleGenerateRecipe}
              >
                <Text style={styles.generateBtnText}>Get Recipe</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.listSpacer} />
          )
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 124,
    gap: 12,
  },
  listHeader: {
    gap: 18,
    marginBottom: 12,
  },
  headerBlock: {
    gap: 6,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    maxWidth: 320,
  },
  selectorCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  selectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  selectorPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
  },
  selectorPillActive: {
    backgroundColor: colors.text,
  },
  selectorPillText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
  },
  selectorPillTextActive: {
    color: "#FFFFFF",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.text,
  },
  sectionMeta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  itemInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 12,
  },
  badge: {
    minWidth: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.greenSoft,
    marginRight: 12,
  },
  badgeText: {
    color: colors.greenDark,
    fontSize: 14,
    fontWeight: "800",
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    flexShrink: 1,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.redSoft,
  },
  removeButtonText: {
    color: colors.red,
    fontSize: 13,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
    marginTop: 6,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.greenSoft,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: "center",
  },
  ctaCard: {
    marginTop: 8,
    backgroundColor: colors.text,
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  ctaCopy: {
    flex: 1,
    gap: 4,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  ctaText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#C7D0C4",
  },
  generateBtn: {
    minWidth: 112,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: colors.green,
    alignItems: "center",
  },
  generateBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  listSpacer: {
    height: 24,
  },
});
