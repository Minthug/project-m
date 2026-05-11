import { createRoute } from '@granite-js/react-native';
import { getAnonymousKey, Storage } from '@apps-in-toss/framework';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
  Keyboard,
  TouchableWithoutFeedback,
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
  '#0891B2',
  '#EA580C',
];

const lightTheme = {
  bg: '#FFF8F3',
  slimeAreaBg: '#FFF8F3',
  inputAreaBg: '#FFFFFF',
  borderColor: '#F0E6DF',
  inputBg: '#F5F0EC',
  inputText: '#1C1917',
  placeholderText: '#A8A29E',
  emptyTitle: '#44403C',
  emptySubtitle: '#A8A29E',
  buttonDisabledBg: '#E7E0DB',
  decorDot: 'rgba(124,58,237,0.06)',
  headerText: '#1C1917',
};

const darkTheme = {
  bg: '#13111A',
  slimeAreaBg: '#13111A',
  inputAreaBg: '#1A1825',
  borderColor: '#2A2535',
  inputBg: '#211E2E',
  inputText: '#F5F3FF',
  placeholderText: '#6B7280',
  emptyTitle: '#C4B5FD',
  emptySubtitle: '#6B7280',
  buttonDisabledBg: '#2A2535',
  decorDot: 'rgba(124,58,237,0.12)',
  headerText: '#EDE9FE',
};

interface SlimeData {
  id: string;
  color: string;
  size: number;
  x: number;
  y: number;
  text: string;
}

export const Route = createRoute('/', {
  component: Page,
});

function BackgroundDots({ theme }: { theme: typeof lightTheme }) {
  const dots = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        id: i,
        size: 60 + Math.random() * 100,
        x: Math.random() * SCREEN_WIDTH,
        y: Math.random() * (SCREEN_HEIGHT * 0.65),
        opacity: 0.4 + Math.random() * 0.6,
      })),
    [],
  );

  return (
    <>
      {dots.map(dot => (
        <View
          key={dot.id}
          style={{
            position: 'absolute',
            width: dot.size,
            height: dot.size,
            borderRadius: dot.size / 2,
            backgroundColor: theme.decorDot,
            left: dot.x - dot.size / 2,
            top: dot.y - dot.size / 2,
            opacity: dot.opacity,
          }}
        />
      ))}
    </>
  );
}

function Page() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const [userKey, setUserKey] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [slimes, setSlimes] = useState<SlimeData[]>([]);

  useEffect(() => {
    Storage.getItem('slimes').then(saved => {
      if (saved) setSlimes(JSON.parse(saved));
    });
    getAnonymousKey().then(result => {
      if (result && result !== 'INVALID_CATEGORY' && result !== 'ERROR') {
        setUserKey(result.hash);
      }
    });
  }, []);

  useEffect(() => {
    Storage.setItem('slimes', JSON.stringify(slimes));
  }, [slimes]);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const size = Math.min(Math.max(60, 50 + trimmed.length * 1.5), 140);
    const color = SLIME_COLORS[Math.floor(Math.random() * SLIME_COLORS.length)] ?? SLIME_COLORS[0];
    const x = Math.random() * (SCREEN_WIDTH - size - 32) + 16;
    const y = Math.random() * (SCREEN_HEIGHT * 0.52 - size - 32) + 16;

    setSlimes(prev => [
      ...prev,
      { id: `${userKey ?? 'anon'}-${Date.now()}`, color, size, x, y, text: trimmed },
    ]);
    setText('');
    Keyboard.dismiss();
  }, [text, userKey]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { borderBottomColor: theme.borderColor }]}>
        <Text style={[styles.headerTitle, { color: theme.headerText }]}>들어줄게</Text>
        <Text style={[styles.headerSub, { color: theme.emptySubtitle }]}>
          {slimes.length > 0 ? `슬라임 ${slimes.length}마리` : '털어놔요'}
        </Text>
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.slimeArea, { backgroundColor: theme.slimeAreaBg }]}>
        <BackgroundDots theme={theme} />
        {slimes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🫧</Text>
            <Text style={[styles.emptyTitle, { color: theme.emptyTitle }]}>
              지금 기분이 어때요?
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.emptySubtitle }]}>
              못된 감정을 털어놓으면{'\n'}슬라임이 될 거예요
            </Text>
          </View>
        ) : (
          slimes.map(slime => <Slime key={slime.id} {...slime} />)
        )}
      </View>
      </TouchableWithoutFeedback>

      <View
        style={[
          styles.inputArea,
          { borderTopColor: theme.borderColor, backgroundColor: theme.inputAreaBg },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBg,
              color: theme.inputText,
              borderColor: theme.borderColor,
            },
          ]}
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
          <Text style={[styles.buttonText, !text.trim() && { color: theme.placeholderText }]}>
            털어내기 🫠
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    fontWeight: '500',
  },
  slimeArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 40,
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputArea: {
    padding: 16,
    paddingBottom: 28,
    gap: 10,
    borderTopWidth: 1,
  },
  input: {
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    minHeight: 52,
    maxHeight: 110,
    borderWidth: 1.5,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
