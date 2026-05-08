import { createRoute } from '@granite-js/react-native';
import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Slime } from '../components/Slime';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SLIME_COLORS = [
  '#6B21A8',
  '#991B1B',
  '#166534',
  '#92400E',
  '#1E3A5F',
  '#831843',
  '#3F3F46',
  '#7C2D12',
];

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
  const [text, setText] = useState('');
  const [slimes, setSlimes] = useState<SlimeData[]>([]);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const size = Math.min(Math.max(60, 50 + trimmed.length * 1.5), 140);
    const color = SLIME_COLORS[Math.floor(Math.random() * SLIME_COLORS.length)] ?? SLIME_COLORS[0];
    const x = Math.random() * (SCREEN_WIDTH - size - 32) + 16;
    const y = Math.random() * (SCREEN_HEIGHT * 0.55 - size - 32) + 16;

    setSlimes(prev => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, color, size, x, y },
    ]);
    setText('');
  }, [text]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.slimeArea}>
        {slimes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>지금 기분이 어때요?</Text>
            <Text style={styles.emptySubtitle}>털어놓으면 슬라임이 될 거예요</Text>
          </View>
        ) : (
          slimes.map(slime => <Slime key={slime.id} {...slime} />)
        )}
      </View>

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="지금 어떤 기분이에요? 다 털어놔요"
          placeholderTextColor="#6B7280"
          multiline
          maxLength={200}
        />
        <TouchableOpacity
          style={[styles.button, !text.trim() && styles.buttonDisabled]}
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
    backgroundColor: '#0F0F1A',
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
    color: '#9CA3AF',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
  },
  inputArea: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    backgroundColor: '#0F0F1A',
  },
  input: {
    backgroundColor: '#1C1C2E',
    borderRadius: 12,
    padding: 14,
    color: '#F3F4F6',
    fontSize: 16,
    minHeight: 52,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#374151',
  },
  button: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#374151',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
