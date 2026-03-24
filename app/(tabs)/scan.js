import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const scanLock = useRef(false);
  const [inactive, setInactive] = useState(false);
  const [items, setItems] = useState([]);
  const router = useRouter();

  const recipe_nav = async () => {
    router.push({
      pathname: "/recipe",
      params: {
        items: JSON.stringify(items),
      },
    });
  };

  const fetchData = async (barcode) => {
    try {
      const response = await fetch(
        `http://YOUR IP ADDRESS HERE/barcode-search?barcode=${barcode}`
      );
      const data = await response.json();
      return data.product_name;
    } catch (error) {
      return "not found";
    }
  };

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarCodeScanned = async ({ data }) => {
    if (scanLock.current) return;
    scanLock.current = true;
    setScanned(true);
    const pname = await fetchData(data);
    if (pname !== "undefined") {
      setItems((prev) => [...prev, `${pname}`]);
    }
    setTimeout(() => {
      scanLock.current = false;
      setScanned(false);
    }, 1000);
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>No access to camera</Text>
        <Text style={styles.errorHint}>
          Enable camera in Settings → Apps → Preppi → Permissions, then reopen the app.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan your groceries</Text>
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          onBarcodeScanned={inactive || scanned ? undefined : handleBarCodeScanned}
        />
        {inactive && <View style={styles.darkOverlay} />}
        <View style={styles.overlay}>
          <View style={styles.scanbox} />
        </View>
      </View>

      <Text>{"\n"}</Text>

      <Button
        title={inactive ? "Resume Scanning!" : "Finish scanning!"}
        onPress={() => {
          scanLock.current = false;
          setScanned(false);
          setInactive((prev) => !prev);
        }}
      />

      <Text>{"\n\n"}</Text>

      <View>
        <Text>Scanned Items:{"\n"}</Text>
        <Text>{items.length === 0 ? "No items scanned yet" : items.join("\n")}</Text>
      </View>

      <Text>{"\n\n\n"}</Text>
      <Button title="Generate Recipe" onPress={recipe_nav} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  errorHint: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
  },
  cameraContainer: {
    width: "90%",
    height: 250,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  camera: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none",
  },
  scanbox: {
    width: "95%",
    height: 1,
    borderWidth: 2,
    borderColor: "#ff1100",
    borderRadius: 12,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 10,
  },
});
