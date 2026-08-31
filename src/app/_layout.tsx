import { useEffect } from 'react';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  NotoSansSC_400Regular,
  NotoSansSC_500Medium,
  NotoSansSC_700Bold,
} from '@expo-google-fonts/noto-sans-sc';
import { initDatabase } from '@/db';
import { backfillEmbeddings } from '@/embedding';

// Prevent the splash screen from auto-hiding until Noto Sans SC is loaded,
// so the user does not see the platform default font flash before the
// unified sans typography kicks in. Wrapped in try/catch because the SDK
// can throw on web when the splash screen module is unavailable.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* splash not available (e.g. web) — ignore */
});

export default function RootLayout() {
  const [fontsLoaded, fontsError] = useFonts({
    NotoSansSC_400Regular,
    NotoSansSC_500Medium,
    NotoSansSC_700Bold,
  });

  useEffect(() => {
    initDatabase()
      .then(() => void backfillEmbeddings())
      .catch(console.error);
  }, []);

  useEffect(() => {
    // Hide the splash once fonts are loaded (or have failed — we'd rather show
    // the platform default than stay on a blank splash).
    if (fontsLoaded || fontsError) {
      SplashScreen.hideAsync().catch(() => {
        /* ignore — splash may already be hidden */
      });
    }
  }, [fontsLoaded, fontsError]);

  return (
    <>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
        <Stack.Screen name="library/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="library/[id]/export" options={{ title: '导出笔记' }} />
        <Stack.Screen name="library/add" options={{ title: '添加图书' }} />
        <Stack.Screen name="note/new" options={{ title: '', presentation: 'card', headerShown: false }} />
        <Stack.Screen name="note/chat/[entryId]" options={{ title: '对话' }} />
        <Stack.Screen name="diagnostics" options={{ title: '诊断 / 测试' }} />
      </Stack>
    </>
  );
}