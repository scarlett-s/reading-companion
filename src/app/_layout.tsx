import { useEffect } from 'react';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { initDatabase } from '@/db';

export default function RootLayout() {
  useEffect(() => {
    initDatabase().catch(console.error);
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="book/list" options={{ title: '全部图书' }} />
        <Stack.Screen name="book/search" options={{ title: '添加图书' }} />
        <Stack.Screen name="book/[id]" options={{ title: '图书详情' }} />
        <Stack.Screen name="entry/new" options={{ title: '记录进度' }} />
        <Stack.Screen name="entry/discuss" options={{ title: 'Discuss' }} />
      </Stack>
    </>
  );
}
