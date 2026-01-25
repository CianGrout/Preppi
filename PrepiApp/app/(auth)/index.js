import { useAudioPlayer } from 'expo-audio';
import { Camera, CameraView } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

export default function Home() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const scanLock = useRef(false);
  const [inactive, setInactive] = useState(false);
  const [items, setItems] = useState([]);
  const router = useRouter();
  
  const audioSource = require('./audio/beep-07a.mp3');
  const player = useAudioPlayer(audioSource);
  const recipe_nav=()=>{
    router.push({
      pathname:'/recipe',
      params:{
        items:JSON.stringify(items),
      },
    });
  }

  const fetchData=async(barcode)=>{
      try{                                //ENTER YOUR IP
        const response=await fetch(`http://YOUR IP ADDRESS HERE/barcode-search?barcode=${barcode}`);
        const data=await response.json();
        console.log(data);
        return data.product_name;
      }catch(error){
        console.error('Error fetching data:',error);
        return "not found";
      }
    }
  
  useEffect(() => {
    (async () => {

      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanLock.current) return;
    scanLock.current = true;
    setScanned(true);
    player.seekTo(0);
    player.play();
    const pname= await fetchData(data);
    if(pname!='undefined'){
      setItems(prev => [...prev, `${pname}`]);
    }
    setTimeout(()=>{scanLock.current = false; setScanned(false);},1000) 
    // camera detects new barcode half a second after the last

  };

  if (hasPermission === null) {
    return <Text>Requesting camera permission...</Text>;
  }

  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
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

      <Text>{'\n'}</Text>
      
      <Button
        title={inactive ? "Resume Scanning!" : "Finish scanning!"}
        onPress={() => {
          scanLock.current = false;
          setScanned(false);
          setInactive(prev => !prev)}}
      />

      <Text>{'\n\n'}</Text>
      
      <View>
        <Text>index Scanned Items:{'\n'}</Text>
        <Text>
          {items.length === 0 ? 'No items scanned yet' : items.join('\n')}
        </Text>
      </View>
      <Text>{'\n\n\n'}</Text>
      <Button
        title='Generate Recipe'
        onPress={recipe_nav}
        />
    </View>
    );}

    const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60,
        alignItems: 'center',
        backgroundColor: '#fff',
    },

    title: {
        fontSize: 20,
        marginBottom: 20,
    },

    cameraContainer: {
        width: '90%',
        height: 250, // 
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#000',
    },

    camera: {
        width: '100%',
        height: '100%',
    },

    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
    },

    scanbox: {
        width: '95%',
        height: 1,
        borderWidth: 2,
        borderColor: '#ff1100', 
        borderRadius: 12,
    },
        
        darkOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)', // darkens camera
        zIndex: 10,
    }
    });