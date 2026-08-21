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
        <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
        <Stack.Screen name="library/[id]" options={{ title: '图书详情' }} />
        <Stack.Screen name="library/add" options={{ title: '添加图书' }} />
        <Stack.Screen name="note/new" options={{ title: '新增笔记', presentation: 'modal' }} />
        <Stack.Screen name="note/[id]" options={{ title: '笔记详情' }} />
        <Stack.Screen name="note/chat/[entryId]" options={{ title: '对话' }} />
      </Stack>
    </>
  );
}