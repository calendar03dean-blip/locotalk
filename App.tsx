import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import {
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  View, Image, Animated, StyleSheet, Text,
} from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import { initIAP, cleanupIAP } from './src/services/iap';

// ── 부팅 로고 애니메이션 ─────────────────────────────────────────────
function SplashOverlay({ onDone }: { onDone: () => void }) {
  const scale   = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. 로고 나타나기
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start(() => {
      // 2. 잠깐 대기 후 사라지기
      setTimeout(() => {
        Animated.timing(fadeOut, { toValue: 0, duration: 350, useNativeDriver: true })
          .start(onDone);
      }, 800);
    });
  }, []);

  return (
    <Animated.View style={[st.splash, { opacity: fadeOut }]}>
      <Animated.View style={{ transform: [{ scale }], opacity }}>
        <Image
          source={require('./assets/logo_white.png')}
          style={st.splashLogo}
          resizeMode="contain"
        />
        <Text style={st.splashName}>Locotalk</Text>
      </Animated.View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  splash:     { ...StyleSheet.absoluteFillObject, backgroundColor: '#40D3B6', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  splashLogo: { width: 100, height: 100 },
  splashName: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -1.5, textAlign: 'center', marginTop: 12 },
});

// ── 앱 루트 ─────────────────────────────────────────────────────────
export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    initIAP();
    return () => { cleanupIAP(); };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <RootNavigator />
        {!splashDone && (
          <SplashOverlay onDone={() => setSplashDone(true)} />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
