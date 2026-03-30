import { Ionicons } from '@expo/vector-icons';
import { useAction, useMutation, useQuery } from "convex/react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "../../convex/_generated/api";

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
      params: { items: JSON.stringify(items.map(i => ({ name: i.name, id: Math.random().toString() }))) },
    });
  };

  const handleAddToFridge = async () => {
    if (items.length === 0 || !user?._id) return;
    setIsSaving(true);
    try {
      const savePromises = [];
      items.forEach((item) => {
        for (let i = 0; i < item.qty; i++) {
          savePromises.push(addToFridge({ name: item.name, userId: user._id }));
        }
      });
      await Promise.all(savePromises);
      setItems([]); 
    } catch (e) {
      Alert.alert("Error", "Could not save items");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBarCodeScanned = async ({ data }) => {
    if (scanLock.current) return;
    scanLock.current = true;
    setScanned(true);

    const currentQty = parseInt(quantity) || 1;

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
      const qtyNum = parseInt(quantity) || 1;
      setItems((prev) => [...prev, { name: manualItem.trim(), qty: qtyNum }]);
      setManualItem("");
      setQuantity("1");
    }
  };

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [permission]);

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Add Ingredients</Text>

        <View style={styles.cameraOuter}>
          <View style={styles.cameraContainer}>
            <CameraView 
              style={styles.camera} 
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} 
            />
            <View style={styles.overlay}>
              <View style={styles.scanLine} />
              {scanned && <ActivityIndicator size="large" color="#fff" style={styles.loader} />}
            </View>
          </View>
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
                selectTextOnFocus={true}
              />
            </View>
            <View style={styles.nameBox}>
              <Text style={styles.label}>Item Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Chicken"
                value={manualItem}
                onChangeText={setManualItem}
              />
            </View>
            <TouchableOpacity style={styles.addButton} onPress={handleAddManualItem}>
              <Ionicons name="add" size={28} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Tip: Set quantity before scanning a barcode</Text>
        </View>

        <View style={styles.basketCard}>
          <View style={styles.basketHeader}>
            <Text style={styles.basketTitle}>Current Basket ({items.length})</Text>
            {items.length > 0 && (
              <TouchableOpacity onPress={() => setItems([])}>
                <Text style={styles.clearText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="barcode-outline" size={40} color="#DCDDE1" />
              <Text style={styles.emptyText}>Scan or type to add items</Text>
            </View>
          ) : (
            items.map((item, index) => (
              <View key={index} style={styles.basketItem}>
                <Text style={styles.itemQty}>{item.qty}x</Text>
                <Text style={styles.itemName}>{item.name}</Text>
                <TouchableOpacity onPress={() => setItems(items.filter((_, i) => i !== index))}>
                   <Ionicons name="close-circle" size={20} color="#FF7675" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.secondaryBtn, items.length === 0 && styles.disabled]} 
          onPress={handleAddToFridge}
          disabled={items.length === 0 || isSaving}
        >
          {isSaving ? <ActivityIndicator color="#3498db" /> : <Text style={styles.secondaryBtnText}>Save to Fridge</Text>}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: "800", color: "#2D3436", marginBottom: 20, textAlign: 'center' },
  cameraOuter: { elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, marginBottom: 20 },
  cameraContainer: { width: "100%", height: 250, borderRadius: 24, overflow: "hidden", backgroundColor: "#000" },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  scanLine: { width: "85%", height: 2, backgroundColor: "red", shadowColor: "red", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 },
  loader: { position: 'absolute' },
  inputCard: { backgroundColor: "#fff", padding: 15, borderRadius: 20, marginBottom: 20, elevation: 2 },
  row: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  qtyBox: { width: 55 },
  nameBox: { flex: 1 },
  label: { fontSize: 11, fontWeight: "700", color: "#B2BEC3", marginBottom: 5, marginLeft: 4, textTransform: 'uppercase' },
  hint: { fontSize: 10, color: '#B2BEC3', marginTop: 10, textAlign: 'center', fontStyle: 'italic' },
  qtyInput: { backgroundColor: "#F1F2F6", borderRadius: 12, padding: 12, textAlign: 'center', fontWeight: 'bold', fontSize: 16, color: '#2D3436' },
  input: { backgroundColor: "#F1F2F6", borderRadius: 12, padding: 12, fontSize: 16, color: '#2D3436' },
  addButton: { backgroundColor: "#27AE60", height: 50, width: 50, borderRadius: 15, justifyContent: "center", alignItems: "center" },
  basketCard: { backgroundColor: "#fff", borderRadius: 20, padding: 20, minHeight: 150, marginBottom: 20 },
  basketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  basketTitle: { fontSize: 18, fontWeight: "700", color: "#2D3436" },
  clearText: { color: "#FF7675", fontWeight: "600", fontSize: 13 },
  emptyContainer: { alignItems: 'center', marginTop: 20 },
  emptyText: { color: "#B2BEC3", textAlign: 'center', marginTop: 10, fontSize: 14 },
  basketItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F2F6" },
  itemQty: { fontWeight: "800", color: "#27AE60", marginRight: 12, width: 30, fontSize: 16 },
  itemName: { color: "#2D3436", fontSize: 16, flex: 1, fontWeight: '500' },
  footer: { padding: 20, paddingBottom: 40, flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F2F6' },
  primaryBtn: { flex: 1.5, backgroundColor: "#27AE60", padding: 18, borderRadius: 16, alignItems: "center" },
  secondaryBtn: { flex: 1, backgroundColor: "#fff", padding: 18, borderRadius: 16, alignItems: "center", borderWidth: 2, borderColor: "#3498db" },
  primaryBtnText: { color: "white", fontSize: 16, fontWeight: "bold" },
  secondaryBtnText: { color: "#3498db", fontSize: 16, fontWeight: "bold" },
  disabled: { opacity: 0.4 },
});