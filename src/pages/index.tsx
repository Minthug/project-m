import { createRoute } from '@granite-js/react-native';
import { getAnonymousKey, Storage, eventLog, loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/framework';
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
import { Slime, detectExpression, Expression } from '../components/Slime';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const EXPRESSION_COLORS: Record<Expression, string[]> = {
  angry:    ['#7F1D1D', '#991B1B', '#450A0A', '#3B1F1F'],
  sad:      ['#1E3A5F', '#312E81', '#1F2937', '#374151'],
  surprised:['#4C1D95', '#581C87', '#3B0764', '#2D1B69'],
  blank:    ['#374151', '#4B5563', '#52525B', '#3F3F46'],
  happy:    ['#7C3AED', '#DB2777', '#D97706', '#0891B2'],
  fear:     ['#1A0A2E', '#2D1B69', '#1E0A3C', '#0F0721'],
  disgust:  ['#14532D', '#166534', '#1A3A1A', '#0F3D1A'],
  contempt: ['#1C1C27', '#27272A', '#18181B', '#252530'],
};

interface BackgroundTheme {
  id: string;
  name: string;
  bg: string;
  dotColor: string;
  free: boolean;
}

const BACKGROUND_THEMES: BackgroundTheme[] = [
  { id: 'default',    name: '기본',   bg: '#0F0E17', dotColor: 'rgba(124,58,237,0.08)',  free: true  },
  { id: 'deep_sea',   name: '심해',   bg: '#020B18', dotColor: 'rgba(0,100,200,0.10)',   free: false },
  { id: 'lava',       name: '용암',   bg: '#1C0400', dotColor: 'rgba(200,40,0,0.10)',    free: false },
  { id: 'storm',      name: '폭풍',   bg: '#08080F', dotColor: 'rgba(80,80,180,0.08)',   free: false },
  { id: 'fog_forest', name: '안개숲', bg: '#0C1A10', dotColor: 'rgba(0,140,70,0.08)',    free: false },
];

const AD_GROUP_ID = 'YOUR_AD_GROUP_ID'; // TODO: 앱인토스 콘솔에서 발급

const systemTheme = {
  light: {
    inputAreaBg: '#FFFFFF',
    borderColor: '#E5E0F0',
    inputBg: '#F5F0EC',
    inputText: '#1C1917',
    placeholderText: '#A8A29E',
    emptyTitle: '#E8E0FF',
    emptySubtitle: '#9990AA',
    buttonDisabledBg: '#2A2535',
    headerBg: '#FFFFFF',
    headerText: '#1C1917',
    headerSubText: '#6B7280',
  },
  dark: {
    inputAreaBg: '#1A1825',
    borderColor: '#2A2535',
    inputBg: '#211E2E',
    inputText: '#F5F3FF',
    placeholderText: '#6B7280',
    emptyTitle: '#C4B5FD',
    emptySubtitle: '#6B7280',
    buttonDisabledBg: '#2A2535',
    headerBg: '#13111A',
    headerText: '#EDE9FE',
    headerSubText: '#6B7280',
  },
};

interface SlimeData {
  id: string;
  color: string;
  size: number;
  x: number;
  y: number;
  text: string;
  expression: Expression;
  createdAt: number;
}

function pickColor(expr: Expression): string {
  const palette = EXPRESSION_COLORS[expr];
  return palette[Math.floor(Math.random() * palette.length)] ?? palette[0];
}

function clamp(x: number, y: number, size: number) {
  return {
    x: Math.max(8, Math.min(x, SCREEN_WIDTH - size - 8)),
    y: Math.max(8, Math.min(y, SCREEN_HEIGHT * 0.52 - size - 8)),
  };
}

export const Route = createRoute('/', {
  component: Page,
});

function BackgroundDots({ dotColor }: { dotColor: string }) {
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
            backgroundColor: dotColor,
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
  const theme = colorScheme === 'dark' ? systemTheme.dark : systemTheme.light;

  const [userKey, setUserKey] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [slimes, setSlimes] = useState<SlimeData[]>([]);

  const [activeThemeId, setActiveThemeId] = useState('default');
  const [unlockedThemeIds, setUnlockedThemeIds] = useState<string[]>(['default']);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const pendingThemeIdRef = useRef<string | null>(null);

  const activeTheme = BACKGROUND_THEMES.find(t => t.id === activeThemeId) ?? BACKGROUND_THEMES[0];

  useEffect(() => {
    let mounted = true;

    Storage.getItem('slimes').then(saved => {
      if (mounted && saved) {
        const loaded = JSON.parse(saved) as SlimeData[];
        setSlimes(loaded.map(s => ({ ...s, ...clamp(s.x, s.y, s.size) })));
      }
    });
    Storage.getItem('unlockedThemes').then(saved => {
      if (mounted && saved) setUnlockedThemeIds(JSON.parse(saved));
    });
    Storage.getItem('activeThemeId').then(saved => {
      if (mounted && saved) setActiveThemeId(saved);
    });
    getAnonymousKey().then(result => {
      if (mounted && result && result !== 'INVALID_CATEGORY' && result !== 'ERROR') {
        setUserKey(result.hash);
      }
    });

    eventLog({ log_name: 'screen_view', log_type: 'screen', params: { screen: 'main' } });

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!loadFullScreenAd.isSupported()) return;
    const cleanup = loadFullScreenAd({
      options: { adGroupId: AD_GROUP_ID },
      onEvent: () => setAdLoaded(true),
      onError: () => setAdLoaded(false),
    });
    return cleanup;
  }, []);

  useEffect(() => {
    Storage.setItem('slimes', JSON.stringify(slimes));
  }, [slimes]);

  const reloadAd = useCallback(() => {
    if (!loadFullScreenAd.isSupported()) return;
    setAdLoaded(false);
    loadFullScreenAd({
      options: { adGroupId: AD_GROUP_ID },
      onEvent: () => setAdLoaded(true),
      onError: () => {},
    });
  }, []);

  const handleThemeSelect = useCallback((themeId: string) => {
    if (unlockedThemeIds.includes(themeId)) {
      setActiveThemeId(themeId);
      Storage.setItem('activeThemeId', themeId);
      setShowThemePicker(false);
      return;
    }
    if (!adLoaded || !showFullScreenAd.isSupported()) return;

    pendingThemeIdRef.current = themeId;
    showFullScreenAd({
      options: { adGroupId: AD_GROUP_ID },
      onEvent: (event) => {
        if (event.type === 'userEarnedReward') {
          const id = pendingThemeIdRef.current;
          if (!id) return;
          setUnlockedThemeIds(prev => {
            const next = [...prev, id];
            Storage.setItem('unlockedThemes', JSON.stringify(next));
            return next;
          });
          setActiveThemeId(id);
          Storage.setItem('activeThemeId', id);
          setShowThemePicker(false);
          eventLog({ log_name: 'theme_unlocked', log_type: 'event', params: { theme_id: id } });
          reloadAd();
        }
      },
      onError: () => {},
    });
  }, [unlockedThemeIds, adLoaded, reloadAd]);

  const handleDelete = useCallback((id: string) => {
    setSlimes(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleMove = useCallback((id: string, newX: number, newY: number) => {
    setSlimes(prev => {
      const moved = prev.find(s => s.id === id);
      if (!moved) return prev;

      const target = prev.find(s => {
        if (s.id === id) return false;
        const dist = Math.sqrt(Math.pow(newX - s.x, 2) + Math.pow(newY - s.y, 2));
        return dist < (moved.size + s.size) * 0.38;
      });

      if (target) {
        const mergedSize = Math.min(moved.size + target.size * 0.55, 190);
        eventLog({ log_name: 'slime_merged', log_type: 'event', params: { size: String(Math.round(mergedSize)) } });
        const mergedPos = clamp((newX + target.x) / 2, (newY + target.y) / 2, mergedSize);
        return [
          ...prev.filter(s => s.id !== id && s.id !== target.id),
          {
            id: `merged-${Date.now()}`,
            color: target.size >= moved.size ? target.color : moved.color,
            expression: target.size >= moved.size ? target.expression : moved.expression,
            size: mergedSize,
            x: mergedPos.x,
            y: mergedPos.y,
            text: target.text || moved.text || '',
            createdAt: Date.now(),
          },
        ];
      }

      const clamped = clamp(newX, newY, moved.size);
      return prev.map(s => s.id === id ? { ...s, x: clamped.x, y: clamped.y } : s);
    });
  }, []);

  const handleSplit = useCallback((id: string, sx: number, sy: number, origSize: number) => {
    const newSize = Math.max(50, Math.floor(origSize * 0.58));
    const offset = newSize * 0.65;
    eventLog({ log_name: 'slime_split', log_type: 'event', params: { size: String(origSize) } });
    setSlimes(prev => {
      const original = prev.find(s => s.id === id);
      if (!original) return prev;
      const palette = EXPRESSION_COLORS[original.expression ?? 'blank'];
      const colorL = palette[Math.floor(Math.random() * palette.length)] ?? original.color;
      const rest = palette.filter(c => c !== colorL);
      const colorR = (rest.length > 0 ? rest : palette)[Math.floor(Math.random() * (rest.length || palette.length))] ?? colorL;
      return [
        ...prev.filter(s => s.id !== id),
        { ...original, id: `split-L-${Date.now()}`, color: colorL, size: newSize, ...clamp(sx - offset, sy, newSize), createdAt: Date.now() },
        { ...original, id: `split-R-${Date.now()}`, color: colorR, size: newSize, ...clamp(sx + offset, sy, newSize), createdAt: Date.now() },
      ];
    });
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const size = Math.min(Math.max(60, 50 + trimmed.length * 1.5), 140);
    const expression = detectExpression(trimmed);
    const color = pickColor(expression);
    const x = Math.random() * (SCREEN_WIDTH - size - 32) + 16;
    const y = Math.random() * (SCREEN_HEIGHT * 0.52 - size - 32) + 16;

    eventLog({ log_name: 'slime_created', log_type: 'event', params: { expression, text_length: String(trimmed.length) } });

    setSlimes(prev => [
      ...prev,
      { id: `${userKey ?? 'anon'}-${Date.now()}`, color, size, x, y, text: trimmed, expression, createdAt: Date.now() },
    ]);
    setText('');
    Keyboard.dismiss();
  }, [text, userKey]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: activeTheme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { borderBottomColor: theme.borderColor, backgroundColor: theme.headerBg }]}>
        <Text style={[styles.headerTitle, { color: theme.headerText }]}>들어줄게</Text>
        <Text style={[styles.headerSub, { color: theme.headerSubText }]}>
          {slimes.length > 0 ? `슬라임 ${slimes.length}마리` : '털어놔요'}
        </Text>
        <View style={styles.themePickerBtn}>
          <TouchableOpacity
            onPress={() => setShowThemePicker(v => !v)}
            style={styles.themeDot}
            activeOpacity={0.7}
          >
            <View style={[styles.themeDotInner, { backgroundColor: activeTheme.bg }]} />
          </TouchableOpacity>
        </View>
      </View>

      {showThemePicker && (
        <View style={[styles.themePanel, { backgroundColor: theme.inputAreaBg, borderBottomColor: theme.borderColor }]}>
          {BACKGROUND_THEMES.map(t => {
            const unlocked = unlockedThemeIds.includes(t.id);
            const isActive = t.id === activeThemeId;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => handleThemeSelect(t.id)}
                activeOpacity={0.7}
                style={styles.themeItem}
              >
                <View style={[styles.themeCircle, { backgroundColor: t.bg }, isActive && styles.themeCircleActive]}>
                  {!unlocked && <Text style={styles.themeLock}>🔒</Text>}
                </View>
                <Text style={[styles.themeName, { color: theme.headerSubText }]}>{t.name}</Text>
                {!unlocked && <Text style={[styles.themeAdLabel, { color: theme.headerSubText }]}>광고</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setShowThemePicker(false); }}>
        <View style={[styles.slimeArea, { backgroundColor: activeTheme.bg }]}>
          <BackgroundDots dotColor={activeTheme.dotColor} />
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
            slimes.map(slime => (
              <Slime
                key={slime.id}
                {...slime}
                onDelete={() => handleDelete(slime.id)}
                onMove={(nx, ny) => handleMove(slime.id, nx, ny)}
                onSplit={(sx, sy, sz) => handleSplit(slime.id, sx, sy, sz)}
              />
            ))
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
    alignItems: 'center',
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
    flex: 1,
  },
  themePickerBtn: {
    marginLeft: 'auto',
  },
  themeDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0E17',
  },
  themeDotInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  themePanel: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 16,
  },
  themeItem: {
    alignItems: 'center',
    gap: 4,
  },
  themeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  themeCircleActive: {
    borderWidth: 2.5,
    borderColor: '#7C3AED',
  },
  themeLock: {
    fontSize: 14,
  },
  themeName: {
    fontSize: 11,
    fontWeight: '500',
  },
  themeAdLabel: {
    fontSize: 10,
    opacity: 0.6,
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
