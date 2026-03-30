import { Picker } from "@react-native-picker/picker";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { api } from "../../convex/_generated/api";

export default function FridgeScreen() {
    const router = useRouter();
    const [mealType, setMealType] = useState("dinner");
    const user = useQuery(api.users.getMe); 
    const rawItems = useQuery(api.fridge.getMyFridge, { 
        userId: user?._id ?? "loading" 
    }) || [];
    const removeItem = useMutation(api.fridge.removeItem);

    const groupedItems = rawItems.reduce((acc, item) => {
        const existing = acc.find(i => i.name === item.name);
        if (existing) {
            existing.count += 1;
            existing.ids.push(item._id);
        } else {
            acc.push({ name: item.name, count: 1, ids: [item._id] });
        }
        return acc;
    }, []);

    const handleGenerateRecipe = () => {
        if (rawItems.length === 0) {
            Alert.alert("Empty Fridge", "Add items first.");
            return;
        }
        const itemsWithIds = rawItems.map(item => ({
            name: item.name,
            id: item._id
        }));
        router.push({
            pathname: "/recipe",
            params: { 
                items: JSON.stringify(itemsWithIds),
                mealType: mealType 
            }
        });
    };

    if (user === undefined) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>My Fridge</Text>
            
            <View style={styles.pickerContainer}>
                <Text style={styles.label}>Meal Category</Text>
                <Picker
                    selectedValue={mealType}
                    onValueChange={(val) => setMealType(val)}
                    style={styles.picker}
                >
                    <Picker.Item label="Breakfast" value="Breakfast"/>
                    <Picker.Item label="Lunch" value="lunch" />
                    <Picker.Item label="Dinner" value="dinner"/>
                    <Picker.Item label="Dessert" value="dessert" />
                    <Picker.Item label="Snack" value="snack" />
                </Picker>
            </View>

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
                        <TouchableOpacity onPress={() => removeItem({ id: item.ids[0] })}>
                            <Text style={{ color: '#ff4757', fontWeight: 'bold' }}>Remove</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />

            {groupedItems.length > 0 && (
                <TouchableOpacity style={styles.generateBtn} onPress={handleGenerateRecipe}>
                    <Text style={styles.generateBtnText}>Generate {mealType.toUpperCase()}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff', paddingTop: 60 },
    title: { fontSize: 32, fontWeight: 'bold', marginBottom: 10 },
    pickerContainer: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 5, marginBottom: 20 },
    label: { fontSize: 12, color: '#636e72', marginLeft: 10, marginTop: 5, fontWeight: 'bold' },
    picker: { height: 50, width: '100%' },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' },
    itemInfo: { flexDirection: 'row', alignItems: 'center' },
    badge: { backgroundColor: '#27ae60', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginRight: 12, minWidth: 30, alignItems: 'center' },
    badgeText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    itemName: { fontSize: 18 },
    generateBtn: { backgroundColor: '#27ae60', padding: 20, borderRadius: 16, alignItems: 'center', marginTop: 10 },
    generateBtnText: { color: 'white', fontWeight: 'bold', fontSize: 18 }
});