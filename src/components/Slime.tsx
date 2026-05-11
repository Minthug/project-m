import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Animated, View, StyleSheet, useColorScheme, PanResponder } from 'react-native';

type Expression = 'happy' | 'sad' | 'surprised' | 'blank' | 'angry';

interface SlimeProps {
  color: string;
  size: number;
  x: number;
  y: number;
  text?: string;
  createdAt?: number;
  onDelete?: () => void;
  onMove?: (x: number, y: number) => void;
}

const KEYWORDS: Record<Expression, string[]> = {
  angry: ['짜증', '열받', '빡', '화나', '싫어', '미치겠', '분노', '억울', '더럽', '진짜로', '왜이래', '어이없', '황당', '최악', '별로', '구려', '망했', '씨발', '씨바', '시발', '시바', '썅', '개새', '병신', '닥쳐', '꺼져', '죽어', '존나', '졌나', '미친놈', '미친년', '개같', '느금', '보지', '자지', '니애미', '니에미', '개소리', '헛소리', '집어쳐', '꺼지라'],
  sad: ['슬퍼', '울고', '눈물', '힘들', '지쳐', '외로워', '우울', '그리워', '보고싶', '상처', '아파', '힘들어', '지침', '서러', '괴로', '무기력', 'ㅠㅠ', 'ㅜㅜ', 'ㅠ-ㅜ', 'ㅜ-ㅠ', 'ㅠ.ㅠ', 'ㅜ.ㅜ', 'ㅠ', 'ㅜ', 'T_T', 'TT', '흑흑', '훌쩍', '엉엉', '으앙', '으엉'],
  surprised: ['헐', '대박', '미쳤', '말도안돼', '당황', '믿을수없', '뭐야', '진짜', '충격', '놀랐', '설마', '이게뭐', '갑자기'],
  happy: ['좋아', '행복', '신나', '기뻐', '즐거워', '최고', '사랑', '고마워', '감사', '다행', '설레', '기대', '신남'],
  blank: [],
};

function detectExpression(text: string): Expression {
  const t = text.toLowerCase();
  for (const [expr, keywords] of Object.entries(KEYWORDS) as [Expression, string[]][]) {
    if (expr === 'blank') continue;
    if (keywords.some(k => t.includes(k))) return expr;
  }
  return 'blank';
}

function computeOpacity(createdAt?: number): number {
  if (!createdAt) return 1;
  const FADE_AFTER = 2 * 60 * 60 * 1000;
  const FULL_FADE = 24 * 60 * 60 * 1000;
  const age = Date.now() - createdAt;
  if (age < FADE_AFTER) return 1;
  const progress = Math.min((age - FADE_AFTER) / (FULL_FADE - FADE_AFTER), 1);
  return Math.max(0.35, 1 - progress * 0.65);
}

export function Slime({ color, size, x, y, text, createdAt, onDelete, onMove }: SlimeProps) {
  const colorScheme = useColorScheme();
  const shadowOpacity = colorScheme === 'dark' ? 0.45 : 0.2;

  const scaleX = useRef(new Animated.Value(0)).current;
  const scaleY = useRef(new Animated.Value(0)).current;
  const popOpacity = useRef(new Animated.Value(1)).current;
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const isDragging = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDeleteRef = useRef(onDelete);
  const onMoveRef = useRef(onMove);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => { onDeleteRef.current = onDelete; }, [onDelete]);
  useEffect(() => { onMoveRef.current = onMove; }, [onMove]);

  // 부모에서 x/y가 갱신되면(merge 후) pan 리셋
  useEffect(() => {
    pan.setValue({ x: 0, y: 0 });
    pan.setOffset({ x: 0, y: 0 });
    pan.flattenOffset();
  }, [x, y]);

  const expression = useMemo<Expression>(
    () => (text ? detectExpression(text) : 'blank'),
    [text],
  );

  const isNegative = expression === 'angry' || expression === 'sad';

  const borderRadii = useMemo(
    () => ({
      borderTopLeftRadius: size * (0.5 + Math.random() * 0.3),
      borderTopRightRadius: size * (0.3 + Math.random() * 0.3),
      borderBottomLeftRadius: size * (0.35 + Math.random() * 0.3),
      borderBottomRightRadius: size * (0.5 + Math.random() * 0.3),
    }),
    [size],
  );

  const eyeConfig = useMemo(
    () => ({
      left: {
        top: size * (0.26 + Math.random() * 0.06),
        left: size * (0.16 + Math.random() * 0.06),
        size: size * (0.1 + Math.random() * 0.04),
      },
      right: {
        top: size * (0.24 + Math.random() * 0.06),
        left: size * (0.48 + Math.random() * 0.06),
        size: size * (0.1 + Math.random() * 0.04),
      },
    }),
    [size],
  );

  const ageOpacity = useMemo(() => computeOpacity(createdAt), [createdAt]);

  const triggerPop = () => {
    // 1단계: 부들부들 떨기
    const shake = Animated.sequence([
      Animated.timing(pan.x, { toValue: 12, duration: 35, useNativeDriver: false }),
      Animated.timing(pan.x, { toValue: -12, duration: 35, useNativeDriver: false }),
      Animated.timing(pan.x, { toValue: 10, duration: 30, useNativeDriver: false }),
      Animated.timing(pan.x, { toValue: -10, duration: 30, useNativeDriver: false }),
      Animated.timing(pan.x, { toValue: 7, duration: 28, useNativeDriver: false }),
      Animated.timing(pan.x, { toValue: -7, duration: 28, useNativeDriver: false }),
      Animated.timing(pan.x, { toValue: 4, duration: 25, useNativeDriver: false }),
      Animated.timing(pan.x, { toValue: -4, duration: 25, useNativeDriver: false }),
      Animated.timing(pan.x, { toValue: 0, duration: 20, useNativeDriver: false }),
    ]);

    const scaleWobble = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleX, { toValue: 1.18, duration: 45, useNativeDriver: true }),
          Animated.timing(scaleY, { toValue: 0.82, duration: 45, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scaleX, { toValue: 0.82, duration: 45, useNativeDriver: true }),
          Animated.timing(scaleY, { toValue: 1.18, duration: 45, useNativeDriver: true }),
        ]),
      ]),
      { iterations: 4 },
    );

    Animated.parallel([shake, scaleWobble]).start(() => {
      // 2단계: 납작하게 쭈그러들기
      Animated.parallel([
        Animated.spring(scaleX, { toValue: 1.7, useNativeDriver: true, tension: 400, friction: 6 }),
        Animated.spring(scaleY, { toValue: 0.2, useNativeDriver: true, tension: 400, friction: 6 }),
      ]).start(() => {
        // 3단계: 먼지처럼 부스러지기 (단계적으로)
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scaleX, { toValue: 1.2, duration: 60, useNativeDriver: true }),
            Animated.timing(scaleY, { toValue: 0.6, duration: 60, useNativeDriver: true }),
            Animated.timing(popOpacity, { toValue: 0.75, duration: 60, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scaleX, { toValue: 0.7, duration: 55, useNativeDriver: true }),
            Animated.timing(scaleY, { toValue: 0.4, duration: 55, useNativeDriver: true }),
            Animated.timing(popOpacity, { toValue: 0.45, duration: 55, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scaleX, { toValue: 0.3, duration: 50, useNativeDriver: true }),
            Animated.timing(scaleY, { toValue: 0.2, duration: 50, useNativeDriver: true }),
            Animated.timing(popOpacity, { toValue: 0.2, duration: 50, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scaleX, { toValue: 0, duration: 60, useNativeDriver: true }),
            Animated.timing(scaleY, { toValue: 0, duration: 60, useNativeDriver: true }),
            Animated.timing(popOpacity, { toValue: 0, duration: 60, useNativeDriver: true }),
          ]),
        ]).start(() => onDeleteRef.current?.());
      });
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        isDragging.current = false;
        setIsActive(true);

        Animated.parallel([
          Animated.spring(scaleX, { toValue: 1.2, useNativeDriver: true, tension: 400, friction: 8 }),
          Animated.spring(scaleY, { toValue: 0.78, useNativeDriver: true, tension: 400, friction: 8 }),
        ]).start();

        if (isNegative) {
          longPressTimer.current = setTimeout(() => {
            if (!isDragging.current) triggerPop();
          }, 600);
        }

        pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
        pan.setValue({ x: 0, y: 0 });
      },

      onPanResponderMove: (_, gs) => {
        if (!isDragging.current && (Math.abs(gs.dx) > 6 || Math.abs(gs.dy) > 6)) {
          isDragging.current = true;
          if (longPressTimer.current) clearTimeout(longPressTimer.current);
          Animated.parallel([
            Animated.spring(scaleX, { toValue: 1.05, useNativeDriver: true }),
            Animated.spring(scaleY, { toValue: 0.95, useNativeDriver: true }),
          ]).start();
        }
        pan.x.setValue(gs.dx);
        pan.y.setValue(gs.dy);
      },

      onPanResponderRelease: (_, gs) => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        setIsActive(false);
        pan.flattenOffset();

        if (isDragging.current) {
          Animated.sequence([
            Animated.parallel([
              Animated.spring(scaleX, { toValue: 1.15, useNativeDriver: true, tension: 200, friction: 6 }),
              Animated.spring(scaleY, { toValue: 0.85, useNativeDriver: true, tension: 200, friction: 6 }),
            ]),
            Animated.parallel([
              Animated.spring(scaleX, { toValue: 1, useNativeDriver: true, tension: 250, friction: 8 }),
              Animated.spring(scaleY, { toValue: 1, useNativeDriver: true, tension: 250, friction: 8 }),
            ]),
          ]).start();
          onMoveRef.current?.(x + (pan.x as any)._value, y + (pan.y as any)._value);
        } else {
          Animated.sequence([
            Animated.parallel([
              Animated.spring(scaleX, { toValue: 0.9, useNativeDriver: true, tension: 200, friction: 6 }),
              Animated.spring(scaleY, { toValue: 1.1, useNativeDriver: true, tension: 200, friction: 6 }),
            ]),
            Animated.parallel([
              Animated.spring(scaleX, { toValue: 1, useNativeDriver: true, tension: 250, friction: 8 }),
              Animated.spring(scaleY, { toValue: 1, useNativeDriver: true, tension: 250, friction: 8 }),
            ]),
          ]).start();
        }
      },
    }),
  ).current;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleX, { toValue: 1.2, useNativeDriver: true, tension: 120, friction: 4 }),
        Animated.spring(scaleY, { toValue: 0.75, useNativeDriver: true, tension: 120, friction: 4 }),
      ]),
      Animated.parallel([
        Animated.spring(scaleX, { toValue: 1, useNativeDriver: true, tension: 200, friction: 7 }),
        Animated.spring(scaleY, { toValue: 1, useNativeDriver: true, tension: 200, friction: 7 }),
      ]),
    ]);
    anim.start();
    return () => anim.stop();
  }, []);

  const renderEye = (cfg: { top: number; left: number; size: number }) => {
    const pupilSize = cfg.size * 0.5;
    const eyeHeight = expression === 'angry' ? cfg.size * 0.75 : cfg.size * 1.15;
    const eyeWidth = expression === 'surprised' ? cfg.size * 1.2 : cfg.size;
    return (
      <View
        key={`${cfg.left}`}
        style={{
          position: 'absolute',
          width: eyeWidth,
          height: eyeHeight,
          backgroundColor: 'white',
          borderRadius: cfg.size,
          top: cfg.top,
          left: cfg.left,
        }}
      >
        <View
          style={{
            position: 'absolute',
            width: pupilSize,
            height: pupilSize,
            backgroundColor: '#111',
            borderRadius: pupilSize,
            top: eyeHeight * 0.25,
            left: eyeWidth * 0.22,
          }}
        />
      </View>
    );
  };

  const renderEyebrows = () => {
    const bw = size * 0.15;
    const bh = size * 0.032;
    const lx = eyeConfig.left.left - size * 0.01;
    const rx = eyeConfig.right.left - size * 0.01;
    const by = eyeConfig.left.top - size * 0.1;
    const base = { position: 'absolute' as const, width: bw, height: bh, borderRadius: 3 };

    switch (expression) {
      case 'angry':
        return (
          <>
            <View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.55)', top: by, left: lx, transform: [{ rotate: '25deg' }] }} />
            <View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.55)', top: by, left: rx, transform: [{ rotate: '-25deg' }] }} />
          </>
        );
      case 'sad':
        return (
          <>
            <View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.4)', top: by, left: lx, transform: [{ rotate: '-20deg' }] }} />
            <View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.4)', top: by, left: rx, transform: [{ rotate: '20deg' }] }} />
          </>
        );
      case 'surprised':
        return (
          <>
            <View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.4)', top: by - size * 0.05, left: lx }} />
            <View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.4)', top: by - size * 0.05, left: rx }} />
          </>
        );
      case 'happy':
        return (
          <>
            <View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.3)', top: by - size * 0.02, left: lx, transform: [{ rotate: '-8deg' }] }} />
            <View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.3)', top: by - size * 0.02, left: rx, transform: [{ rotate: '8deg' }] }} />
          </>
        );
      default:
        return (
          <>
            <View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.28)', top: by, left: lx }} />
            <View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.28)', top: by, left: rx }} />
          </>
        );
    }
  };

  const renderMouth = () => {
    const mouthY = size * 0.58;
    const cx = size * 0.5;
    switch (expression) {
      case 'happy':
        return (
          <View style={{ position: 'absolute', width: size * 0.38, height: size * 0.2, borderBottomLeftRadius: size * 0.2, borderBottomRightRadius: size * 0.2, borderWidth: size * 0.03, borderTopWidth: 0, borderColor: 'rgba(0,0,0,0.4)', top: mouthY, left: cx - size * 0.19 }} />
        );
      case 'sad':
        return (
          <>
            <View style={{ position: 'absolute', width: size * 0.3, height: size * 0.16, borderTopLeftRadius: size * 0.16, borderTopRightRadius: size * 0.16, borderWidth: size * 0.03, borderBottomWidth: 0, borderColor: 'rgba(0,0,0,0.4)', top: mouthY + size * 0.04, left: cx - size * 0.15 }} />
            <View style={{ position: 'absolute', width: size * 0.055, height: size * 0.08, backgroundColor: 'rgba(100,180,255,0.85)', borderBottomLeftRadius: size * 0.04, borderBottomRightRadius: size * 0.04, borderTopLeftRadius: size * 0.02, borderTopRightRadius: size * 0.02, top: eyeConfig.left.top + eyeConfig.left.size + size * 0.01, left: eyeConfig.left.left + eyeConfig.left.size * 0.2 }} />
          </>
        );
      case 'surprised':
        return (
          <View style={{ position: 'absolute', width: size * 0.22, height: size * 0.24, borderRadius: size * 0.12, backgroundColor: 'rgba(0,0,0,0.35)', top: mouthY, left: cx - size * 0.11 }} />
        );
      case 'angry':
        return (
          <>
            <View style={{ position: 'absolute', width: size * 0.28, height: size * 0.03, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 2, top: mouthY + size * 0.02, left: cx - size * 0.14 }} />
            <View style={{ position: 'absolute', width: size * 0.08, height: size * 0.03, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 2, top: mouthY + size * 0.03, left: cx - size * 0.2, transform: [{ rotate: '40deg' }] }} />
            <View style={{ position: 'absolute', width: size * 0.08, height: size * 0.03, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 2, top: mouthY + size * 0.03, left: cx + size * 0.12, transform: [{ rotate: '-40deg' }] }} />
          </>
        );
      default:
        return (
          <View style={{ position: 'absolute', width: size * 0.2, height: size * 0.025, backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: 2, top: mouthY + size * 0.02, left: cx - size * 0.1 }} />
        );
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          left: x,
          top: y,
          zIndex: isActive ? 100 : 1,
          opacity: popOpacity,
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Animated.View
        style={{
          opacity: ageOpacity,
          ...styles.blob,
          width: size,
          height: size * 0.9,
          backgroundColor: color,
          ...borderRadii,
          shadowOpacity,
          transform: [{ scaleX }, { scaleY }],
        }}
      >
        <View style={{ position: 'absolute', top: size * 0.1, left: size * 0.15, width: size * 0.28, height: size * 0.13, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: size * 0.07, transform: [{ rotate: '-15deg' }] }} />
        {renderEyebrows()}
        {renderEye(eyeConfig.left)}
        {renderEye(eyeConfig.right)}
        {renderMouth()}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
  blob: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 10,
  },
});
