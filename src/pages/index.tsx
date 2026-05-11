import { createRoute } from '@granite-js/react-native';
import { getAnonymousKey } from '@apps-in-toss/framework';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from 'react-native';
import { Slime } from '../components/Slime';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SLIME_COLORS = [
  '#7C3AED',
  '#DC2626',
  '#16A34A',
  '#D97706',
  '#2563EB',
  '#DB2777',
  '#525252',
  '#EA580C',
];

const lightTheme = {
  bg: '#FFFFFF',
  slimeAreaBg: '#F9FAFB',
  inputAreaBg: '#FFFFFF',
  borderColor: '#E5E7EB',
  inputBg: '#F3F4F6',
  inputText: '#111827',
  placeholderText: '#9CA3AF',
  emptyTitle: '#374151',
  emptySubtitle: '#9CA3AF',
  buttonDisabledBg: '#D1D5DB',
};

const darkTheme = {
  bg: '#0F0F1A',
  slimeAreaBg: '#0F0F1A',
  inputAreaBg: '#0F0F1A',
  borderColor: '#1F2937',
  inputBg: '#1C1C2E',
  inputText: '#F3F4F6',
  placeholderText: '#6B7280',
  emptyTitle: '#9CA3AF',
  emptySubtitle: '#4B5563',
  buttonDisabledBg: '#374151',
};

interface SlimeData {
  id: string;
  color: string;
  size: number;
  x: number;
  y: number;
}

export const Route = createRoute('/', {
  component: Page,
});

function Page() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const [userKey, setUserKey] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [slimes, setSlimes] = useState<SlimeData[]>([]);

  useEffect(() => {
    AsyncStorage.getItem('slimes').then(saved => {
      if (saved) setSlimes(JSON.parse(saved));
    });
    getAnonymousKey().then(result => {
      if (result && result !== 'INVALID_CATEGORY' && result !== 'ERROR') {
        setUserKey(result.hash);
      }
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('slimes', JSON.stringify(slimes));
  }, [slimes]);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const size = Math.min(Math.max(60, 50 + trimmed.length * 1.5), 140);
    const color = SLIME_COLORS[Math.floor(Math.random() * SLIME_COLORS.length)] ?? SLIME_COLORS[0];
    const x = Math.random() * (SCREEN_WIDTH - size - 32) + 16;
    const y = Math.random() * (SCREEN_HEIGHT * 0.55 - size - 32) + 16;

    setSlimes(prev => [
      ...prev,
      { id: `${userKey ?? 'anon'}-${Date.now()}`, color, size, x, y },
    ]);
    setText('');
  }, [text, userKey]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.slimeArea, { backgroundColor: theme.slimeAreaBg }]}>
        {slimes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: theme.emptyTitle }]}>지금 기분이 어때요?</Text>
            <Text style={[styles.emptySubtitle, { color: theme.emptySubtitle }]}>털어놓으면 슬라임이 될 거예요</Text>
          </View>
        ) : (
          slimes.map(slime => <Slime key={slime.id} {...slime} />)
        )}
      </View>

      <View style={[styles.inputArea, { borderTopColor: theme.borderColor, backgroundColor: theme.inputAreaBg }]}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.inputText, borderColor: theme.borderColor }]}
          value={text}
          onChangeText={setText}
          placeholder="지금 어떤 기분이에요? 다 털어놔요"
          placeholderTextColor={theme.placeholderText}
          multiline
          maxLength={200}
        />
        <TouchableOpacity
          style={[styles.button, !text.trim() && { backgroundColor: theme.buttonDisabledBg }]}
          onPress={handleSubmit}
          disabled={!text.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>털어내기</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slimeArea: {
    flex: 1,
    position: 'relative',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  inputArea: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
    borderTopWidth: 1,
  },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 52,
    maxHeight: 120,
    borderWidth: 1,
  },
  button: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
