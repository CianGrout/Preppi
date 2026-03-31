import { Ionicons } from "@expo/vector-icons";
import { useAction, useMutation, useQuery } from "convex/react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  greenDark: "#1E9E57",
  greenSoft: "#E8F8EE",
  red: "#E25B66",
};

export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const scanLock = useRef(false);
  const [items, setItems] = useState([]);
  const [manualItem, setManualItem] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [isSaving, setIsSaving] = useState(false);
  const convexBarcodeSearch = useAction(api.barcode.searchBarcode);
  const router = useRouter();
  const user = useQuery(api.users.getMe);
  const addToFridge = useMutation(api.fridge.addItem);

  const recipe_nav = () => {
    if (items.length === 0) return;
    router.push({
      pathname: "/recipe",
      params: {
        items: JSON.stringify(
          items.map((item) => ({
            name: item.name,
            id: Math.random().toString(),
          }))
        ),
      },
    });
  };

  const handleAddToFridge = async () => {
    if (items.length === 0 || !user?._id) return;
    setIsSaving(true);
    try {
      const savePromises = [];
      items.forEach((item) => {
        for (let i = 0; i < item.qty; i += 1) {
          savePromises.push(addToFridge({ name: item.name, userId: user._id }));
        }
      });
      await Promise.all(savePromises);
      setItems([]);
    } catch (_error) {
      Alert.alert("Error", "Could not save items");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBarCodeScanned = async ({ data }) => {
    if (scanLock.current) return;
    scanLock.current = true;
    setScanned(true);

    const currentQty = parseInt(quantity, 10) || 1;

    try {
      const pname = await convexBarcodeSearch({ barcode: data });
      if (pname && pname !== "not found") {
        setItems((prev) => [...prev, { name: pname, qty: currentQty }]);
        setQuantity("1");
      }
    } finally {
      setTimeout(() => {
        scanLock.current = false;
        setScanned(false);
      }, 2000);
    }
  };

  const handleAddManualItem = () => {
    if (manualItem.trim()) {
      const qtyNum = parseInt(quantity, 10) || 1;
      setItems((prev) => [...prev, { name: manualItem.trim(), qty: qtyNum }]);
      setManualItem("");
      setQuantity("1");
    }
  };

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.permissionWrap}>
          <View style={styles.permissionCard}>
            <View style={styles.permissionIcon}>
              <Ionicons name="barcode-outline" size={28} color={colors.green} />
            </View>
            <Text style={styles.permissionTitle}>Camera access needed</Text>
            <Text style={styles.permissionText}>
              Preppi needs the camera to scan ingredients by barcode.
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonText}>
                Grant Camera Permission
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Add Ingredients</Text>
            <Text style={styles.subtitle}>
              Scan a barcode or type in ingredients to build your basket.
            </Text>
          </View>

          <View style={styles.cameraCard}>
            <View style={styles.cameraContainer}>
              <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              />
              <View style={styles.overlay}>
                <View style={styles.scanLine} />
                {scanned && (
                  <ActivityIndicator
                    size="large"
                    color="#FFFFFF"
                    style={styles.loader}
                  />
                )}
              </View>
            </View>
            <Text style={styles.cameraHint}>Point the scanner at a barcode</Text>
          </View>

          <View style={styles.inputCard}>
            <View style={styles.row}>
              <View style={styles.qtyBox}>
                <Text style={styles.label}>Qty</Text>
                <TextInput
                  style={styles.qtyInput}
                  keyboardType="numeric"
                  value={quantity}
                  onChangeText={setQuantity}
                  maxLength={2}
                  selectTextOnFocus
                />
              </View>
              <View style={styles.nameBox}>
                <Text style={styles.label}>Item Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Chicken"
                  placeholderTextColor="#9DA89D"
                  value={manualItem}
                  onChangeText={setManualItem}
                />
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddManualItem}
              >
                <Ionicons name="add" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>
              Tip: set quantity before scanning a barcode
            </Text>
          </View>

          <View style={styles.basketCard}>
            <View style={styles.basketHeader}>
              <Text style={styles.basketTitle}>Current Basket</Text>
              <Text style={styles.basketMeta}>
                {items.length} item{items.length === 1 ? "" : "s"}
              </Text>
            </View>

            {items.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="basket-outline"
                    size={28}
                    color={colors.greenDark}
                  />
                </View>
                <Text style={styles.emptyTitle}>Nothing added yet</Text>
                <Text style={styles.emptyText}>
                  Scan a barcode or type an ingredient to start building a meal.
                </Text>
              </View>
            ) : (
              <View style={styles.basketList}>
                {items.map((item, index) => (
                  <View key={index} style={styles.basketItem}>
                    <Text style={styles.itemQty}>{item.qty}x</Text>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <TouchableOpacity
                      onPress={() =>
                        setItems(items.filter((_, itemIndex) => itemIndex !== index))
                      }
                    >
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color={colors.red}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {items.length > 0 && (
              <TouchableOpacity onPress={() => setItems([])}>
                <Text style={styles.clearText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.secondaryBtn, items.length === 0 && styles.disabled]}
            onPress={handleAddToFridge}
            disabled={items.length === 0 || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.green} />
            ) : (
              <Text style={styles.secondaryBtnText}>Save to Fridge</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, items.length === 0 && styles.disabled]}
            onPress={recipe_nav}
            disabled={items.length === 0}
          >
            <Text style={styles.primaryBtnText}>Get Recipe</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  permissionWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  permissionCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#101711",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  permissionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.greenSoft,
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: colors.green,
    borderRadius: 18,
    minHeight: 54,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 228,
  },
  header: {
    marginBottom: 18,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    maxWidth: 330,
  },
  cameraCard: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#101711",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
    marginBottom: 18,
  },
  cameraContainer: {
    width: "100%",
    height: 244,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#000000",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  scanLine: {
    width: "82%",
    height: 2,
    backgroundColor: "#FF3B30",
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  loader: {
    position: "absolute",
  },
  cameraHint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 12,
  },
  inputCard: {
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: 24,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  qtyBox: {
    width: 70,
  },
  nameBox: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 12,
    textAlign: "center",
    fontStyle: "italic",
  },
  qtyInput: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    padding: 14,
    textAlign: "center",
    fontWeight: "800",
    fontSize: 18,
    color: colors.text,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.green,
    height: 56,
    width: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  basketCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  basketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  basketTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  basketMeta: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.greenDark,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.greenSoft,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
  },
  basketList: {
    gap: 10,
  },
  basketItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
  },
  itemQty: {
    fontWeight: "800",
    color: colors.greenDark,
    marginRight: 12,
    minWidth: 32,
    fontSize: 15,
  },
  itemName: {
    color: colors.text,
    fontSize: 16,
    flex: 1,
    fontWeight: "600",
  },
  clearText: {
    color: colors.red,
    fontWeight: "700",
    fontSize: 13,
    marginTop: 16,
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 88,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    flexDirection: "row",
    gap: 12,
    backgroundColor: "rgba(246, 247, 243, 0.96)",
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  primaryBtn: {
    flex: 1.35,
    backgroundColor: colors.green,
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.green,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtnText: {
    color: colors.greenDark,
    fontSize: 16,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.45,
  },
});
