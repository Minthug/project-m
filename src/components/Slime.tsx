import React, { useRef, useEffect, useMemo } from 'react';
import { Animated, Pressable, View, StyleSheet, useColorScheme } from 'react-native';

type Expression = 'happy' | 'sad' | 'surprised' | 'blank' | 'angry';

interface SlimeProps {
  color: string;
  size: number;
  x: number;
  y: number;
  text?: string;
}

const KEYWORDS: Record<Expression, string[]> = {
  angry: ['짜증', '열받', '빡', '화나', '싫어', '미치겠', '분노', '억울', '더럽', '진짜로', '왜이래', '어이없', '황당', '최악', '별로', '구려', '망했'],
  sad: ['슬퍼', '울고', '눈물', '힘들', '지쳐', '외로워', '우울', '그리워', '보고싶', '상처', '아파', '힘들어', '지침', '서러', '괴로', '무기력'],
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

export function Slime({ color, size, x, y, text }: SlimeProps) {
  const colorScheme = useColorScheme();
  const shadowOpacity = colorScheme === 'dark' ? 0.45 : 0.2;
  const scaleX = useRef(new Animated.Value(0)).current;
  const scaleY = useRef(new Animated.Value(0)).current;

  const expression = useMemo<Expression>(
    () => (text ? detectExpression(text) : 'blank'),
    [text],
  );

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
        top: size * (0.2 + Math.random() * 0.08),
        left: size * (0.16 + Math.random() * 0.06),
        size: size * (0.1 + Math.random() * 0.04),
      },
      right: {
        top: size * (0.18 + Math.random() * 0.08),
        left: size * (0.48 + Math.random() * 0.06),
        size: size * (0.1 + Math.random() * 0.04),
      },
    }),
    [size],
  );

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleX, { toValue: 1.2, useNativeDriver: true, tension: 120, friction: 4 }),
        Animated.spring(scaleY, { toValue: 0.75, useNativeDriver: true, tension: 120, friction: 4 }),
      ]),
      Animated.parallel([
        Animated.spring(scaleX, { toValue: 1, useNativeDriver: true, tension: 200, friction: 7 }),
        Animated.spring(scaleY, { toValue: 1, useNativeDriver: true, tension: 200, friction: 7 }),
      ]),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleX, { toValue: 1.35, useNativeDriver: true, tension: 400, friction: 10 }),
      Animated.spring(scaleY, { toValue: 0.65, useNativeDriver: true, tension: 400, friction: 10 }),
    ]).start();
  };

  const handlePressOut = () => {
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
  };

  const renderEye = (cfg: { top: number; left: number; size: number }) => {
    const pupilSize = cfg.size * 0.5;
    return (
      <View
        key={`${cfg.left}`}
        style={{
          position: 'absolute',
          width: cfg.size,
          height: cfg.size * 1.15,
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
            top: cfg.size * 0.3,
            left: cfg.size * 0.22,
          }}
        />
      </View>
    );
  };

  const renderMouth = () => {
    const mouthY = size * 0.52;
    const cx = size * 0.5;

    switch (expression) {
      case 'happy':
        return (
          <View
            style={{
              position: 'absolute',
              width: size * 0.32,
              height: size * 0.16,
              borderBottomLeftRadius: size * 0.16,
              borderBottomRightRadius: size * 0.16,
              borderWidth: size * 0.028,
              borderTopWidth: 0,
              borderColor: 'rgba(0,0,0,0.35)',
              top: mouthY,
              left: cx - size * 0.16,
            }}
          />
        );
      case 'sad':
        return (
          <View
            style={{
              position: 'absolute',
              width: size * 0.28,
              height: size * 0.14,
              borderTopLeftRadius: size * 0.14,
              borderTopRightRadius: size * 0.14,
              borderWidth: size * 0.028,
              borderBottomWidth: 0,
              borderColor: 'rgba(0,0,0,0.35)',
              top: mouthY + size * 0.06,
              left: cx - size * 0.14,
            }}
          />
        );
      case 'surprised':
        return (
          <View
            style={{
              position: 'absolute',
              width: size * 0.16,
              height: size * 0.18,
              borderRadius: size * 0.09,
              backgroundColor: 'rgba(0,0,0,0.3)',
              top: mouthY,
              left: cx - size * 0.08,
            }}
          />
        );
      case 'angry':
        return (
          <View
            style={{
              position: 'absolute',
              width: size * 0.26,
              height: size * 0.028,
              backgroundColor: 'rgba(0,0,0,0.38)',
              borderRadius: 2,
              top: mouthY + size * 0.04,
              left: cx - size * 0.13,
              transform: [{ rotate: '8deg' }],
            }}
          />
        );
      default:
        return (
          <View
            style={{
              position: 'absolute',
              width: size * 0.2,
              height: size * 0.025,
              backgroundColor: 'rgba(0,0,0,0.28)',
              borderRadius: 2,
              top: mouthY + size * 0.04,
              left: cx - size * 0.1,
            }}
          />
        );
    }
  };

  return (
    <Pressable
      style={[styles.container, { left: x, top: y }]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.blob,
          {
            width: size,
            height: size * 0.9,
            backgroundColor: color,
            ...borderRadii,
            shadowOpacity,
            transform: [{ scaleX }, { scaleY }],
          },
        ]}
      >
        <View
          style={{
            position: 'absolute',
            top: size * 0.1,
            left: size * 0.15,
            width: size * 0.28,
            height: size * 0.13,
            backgroundColor: 'rgba(255,255,255,0.35)',
            borderRadius: size * 0.07,
            transform: [{ rotate: '-15deg' }],
          }}
        />
        {renderEye(eyeConfig.left)}
        {renderEye(eyeConfig.right)}
        {renderMouth()}
      </Animated.View>
    </Pressable>
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
