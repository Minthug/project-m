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
    // 화남은 눈을 약간 찡그리게
    const eyeHeight = expression === 'angry' ? cfg.size * 0.75 : cfg.size * 1.15;
    // 놀람은 눈을 크게
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

    const base = {
      position: 'absolute' as const,
      width: bw,
      height: bh,
      borderRadius: 3,
    };

    switch (expression) {
      case 'angry':
        // \ / 형태 — 안쪽이 내려와 찡그린 모양
        return (
          <>
            <View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.55)', top: by, left: lx, transform: [{ rotate: '25deg' }] }} />
            <View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.55)', top: by, left: rx, transform: [{ rotate: '-25deg' }] }} />
          </>
        );
      case 'sad':
        // / \ 형태 — 안쪽이 올라가는 처진 눈썹
        return (
          <>
            <View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.4)', top: by, left: lx, transform: [{ rotate: '-20deg' }] }} />
            <View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.4)', top: by, left: rx, transform: [{ rotate: '20deg' }] }} />
          </>
        );
      case 'surprised':
        // 높이 올라간 눈썹
        return (
          <>
            <View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.4)', top: by - size * 0.05, left: lx }} />
            <View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.4)', top: by - size * 0.05, left: rx }} />
          </>
        );
      case 'happy':
        // 살짝 올라간 눈썹
        return (
          <>
            <View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.3)', top: by - size * 0.02, left: lx, transform: [{ rotate: '-8deg' }] }} />
            <View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.3)', top: by - size * 0.02, left: rx, transform: [{ rotate: '8deg' }] }} />
          </>
        );
      default:
        // 평평한 눈썹
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
        // 크고 둥근 미소
        return (
          <View
            style={{
              position: 'absolute',
              width: size * 0.38,
              height: size * 0.2,
              borderBottomLeftRadius: size * 0.2,
              borderBottomRightRadius: size * 0.2,
              borderWidth: size * 0.03,
              borderTopWidth: 0,
              borderColor: 'rgba(0,0,0,0.4)',
              top: mouthY,
              left: cx - size * 0.19,
            }}
          />
        );
      case 'sad':
        // 아래로 처진 입 + 눈물
        return (
          <>
            <View
              style={{
                position: 'absolute',
                width: size * 0.3,
                height: size * 0.16,
                borderTopLeftRadius: size * 0.16,
                borderTopRightRadius: size * 0.16,
                borderWidth: size * 0.03,
                borderBottomWidth: 0,
                borderColor: 'rgba(0,0,0,0.4)',
                top: mouthY + size * 0.04,
                left: cx - size * 0.15,
              }}
            />
            {/* 눈물 */}
            <View
              style={{
                position: 'absolute',
                width: size * 0.055,
                height: size * 0.08,
                backgroundColor: 'rgba(100,180,255,0.85)',
                borderBottomLeftRadius: size * 0.04,
                borderBottomRightRadius: size * 0.04,
                borderTopLeftRadius: size * 0.02,
                borderTopRightRadius: size * 0.02,
                top: eyeConfig.left.top + eyeConfig.left.size + size * 0.01,
                left: eyeConfig.left.left + eyeConfig.left.size * 0.2,
              }}
            />
          </>
        );
      case 'surprised':
        // 크게 벌린 O 입
        return (
          <View
            style={{
              position: 'absolute',
              width: size * 0.22,
              height: size * 0.24,
              borderRadius: size * 0.12,
              backgroundColor: 'rgba(0,0,0,0.35)',
              top: mouthY,
              left: cx - size * 0.11,
            }}
          />
        );
      case 'angry':
        // 짧고 굳은 선 + 양쪽 끝이 내려감
        return (
          <>
            <View
              style={{
                position: 'absolute',
                width: size * 0.28,
                height: size * 0.03,
                backgroundColor: 'rgba(0,0,0,0.45)',
                borderRadius: 2,
                top: mouthY + size * 0.02,
                left: cx - size * 0.14,
              }}
            />
            {/* 왼쪽 끝 내려가는 선 */}
            <View
              style={{
                position: 'absolute',
                width: size * 0.08,
                height: size * 0.03,
                backgroundColor: 'rgba(0,0,0,0.45)',
                borderRadius: 2,
                top: mouthY + size * 0.03,
                left: cx - size * 0.2,
                transform: [{ rotate: '40deg' }],
              }}
            />
            {/* 오른쪽 끝 내려가는 선 */}
            <View
              style={{
                position: 'absolute',
                width: size * 0.08,
                height: size * 0.03,
                backgroundColor: 'rgba(0,0,0,0.45)',
                borderRadius: 2,
                top: mouthY + size * 0.03,
                left: cx + size * 0.12,
                transform: [{ rotate: '-40deg' }],
              }}
            />
          </>
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
              top: mouthY + size * 0.02,
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
        {renderEyebrows()}
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
