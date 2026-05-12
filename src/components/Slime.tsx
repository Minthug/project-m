import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Animated, StyleSheet, useColorScheme, PanResponder } from 'react-native';
import { generateHapticFeedback } from '@apps-in-toss/native-modules';
import Svg, { Path, Defs, RadialGradient, Stop, Ellipse, Rect, Circle } from 'react-native-svg';

function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

export type Expression = 'happy' | 'sad' | 'surprised' | 'blank' | 'angry';

interface SlimeProps {
  color: string;
  size: number;
  x: number;
  y: number;
  text?: string;
  createdAt?: number;
  onDelete?: () => void;
  onMove?: (x: number, y: number) => void;
  onSplit?: (x: number, y: number, size: number) => void;
}

const KEYWORDS: Record<Expression, string[]> = {
  angry: ['짜증', '열받', '빡', '화나', '싫어', '미치겠', '분노', '억울', '더럽', '진짜로', '왜이래', '어이없', '황당', '최악', '별로', '구려', '망했', '씨발', '씨바', '시발', '시바', '썅', '개새', '병신', '닥쳐', '꺼져', '죽어', '존나', '졌나', '미친놈', '미친년', '개같', '느금', '보지', '자지', '니애미', '니에미', '개소리', '헛소리', '집어쳐', '꺼지라'],
  sad: ['슬퍼', '울고', '눈물', '힘들', '지쳐', '외로워', '우울', '그리워', '보고싶', '상처', '아파', '힘들어', '지침', '서러', '괴로', '무기력', 'ㅠㅠ', 'ㅜㅜ', 'ㅠ-ㅜ', 'ㅜ-ㅠ', 'ㅠ.ㅠ', 'ㅜ.ㅜ', 'ㅠ', 'ㅜ', 'T_T', 'TT', '흑흑', '훌쩍', '엉엉', '으앙', '으엉'],
  surprised: ['헐', '대박', '미쳤', '말도안돼', '당황', '믿을수없', '뭐야', '진짜', '충격', '놀랐', '설마', '이게뭐', '갑자기'],
  happy: ['좋아', '행복', '신나', '기뻐', '즐거워', '최고', '사랑', '고마워', '감사', '다행', '설레', '기대', '신남'],
  blank: [],
};

const PARTICLE_COUNT = 16;

type ShapeType = 0 | 1 | 2 | 3;

// SVG cubic bezier blob 생성
function makeBlobPath(w: number, h: number, pts: number[]): string {
  const n = pts.length / 2;
  const xs = pts.filter((_, i) => i % 2 === 0);
  const ys = pts.filter((_, i) => i % 2 === 1);

  let d = `M ${xs[0].toFixed(1)} ${ys[0].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = { x: xs[(i - 1 + n) % n], y: ys[(i - 1 + n) % n] };
    const p1 = { x: xs[i], y: ys[i] };
    const p2 = { x: xs[(i + 1) % n], y: ys[(i + 1) % n] };
    const p3 = { x: xs[(i + 2) % n], y: ys[(i + 2) % n] };
    const cp1x = p1.x + (p2.x - p0.x) / 5;
    const cp1y = p1.y + (p2.y - p0.y) / 5;
    const cp2x = p2.x - (p3.x - p1.x) / 5;
    const cp2y = p2.y - (p3.y - p1.y) / 5;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d + ' Z';
}

function generateBlob(size: number, shape: ShapeType, seed: number[]): { path: string; w: number; h: number } {
  const r = (i: number, base: number, range: number) => base + seed[i % seed.length] * range;

  switch (shape) {
    case 0: { // 둥근형
      const w = size, h = size * 0.88;
      const cx = w / 2, cy = h / 2;
      const pts = [
        cx + r(0, -0.05, 0.1) * w, cy - r(1, 0.36, 0.1) * h,
        cx + r(2, 0.32, 0.1) * w, cy - r(3, 0.2, 0.12) * h,
        cx + r(4, 0.38, 0.1) * w, cy + r(5, 0.1, 0.1) * h,
        cx + r(6, 0.15, 0.1) * w, cy + r(7, 0.35, 0.1) * h,
        cx - r(8, 0.12, 0.1) * w, cy + r(9, 0.38, 0.1) * h,
        cx - r(10, 0.38, 0.1) * w, cy + r(11, 0.08, 0.12) * h,
        cx - r(12, 0.35, 0.1) * w, cy - r(13, 0.2, 0.12) * h,
      ];
      return { path: makeBlobPath(w, h, pts), w, h };
    }
    case 1: { // 넓은 납작형
      const w = size * 1.4, h = size * 0.62;
      const cx = w / 2, cy = h / 2;
      const pts = [
        cx - r(0, 0.1, 0.15) * w, cy - r(1, 0.38, 0.1) * h,
        cx + r(2, 0.1, 0.15) * w, cy - r(3, 0.42, 0.08) * h,
        cx + r(4, 0.44, 0.06) * w, cy - r(5, 0.1, 0.15) * h,
        cx + r(6, 0.44, 0.06) * w, cy + r(7, 0.2, 0.15) * h,
        cx + r(8, 0.1, 0.15) * w, cy + r(9, 0.42, 0.08) * h,
        cx - r(10, 0.1, 0.15) * w, cy + r(11, 0.4, 0.1) * h,
        cx - r(12, 0.44, 0.06) * w, cy + r(13, 0.15, 0.15) * h,
        cx - r(14, 0.44, 0.06) * w, cy - r(15, 0.15, 0.15) * h,
      ];
      return { path: makeBlobPath(w, h, pts), w, h };
    }
    case 2: { // 높은 세로형
      const w = size * 0.72, h = size * 1.2;
      const cx = w / 2, cy = h / 2;
      const pts = [
        cx + r(0, -0.05, 0.1) * w, cy - r(1, 0.44, 0.06) * h,
        cx + r(2, 0.38, 0.1) * w, cy - r(3, 0.22, 0.12) * h,
        cx + r(4, 0.42, 0.08) * w, cy + r(5, 0.1, 0.12) * h,
        cx + r(6, 0.2, 0.15) * w, cy + r(7, 0.42, 0.08) * h,
        cx - r(8, 0.18, 0.15) * w, cy + r(9, 0.44, 0.06) * h,
        cx - r(10, 0.42, 0.08) * w, cy + r(11, 0.12, 0.12) * h,
        cx - r(12, 0.4, 0.08) * w, cy - r(13, 0.2, 0.12) * h,
      ];
      return { path: makeBlobPath(w, h, pts), w, h };
    }
    case 3: { // 울퉁불퉁형
      const w = size * 1.05, h = size * 0.95;
      const cx = w / 2, cy = h / 2;
      const pts = [
        cx - r(0, 0.05, 0.1) * w, cy - r(1, 0.42, 0.08) * h,
        cx + r(2, 0.18, 0.18) * w, cy - r(3, 0.38, 0.12) * h,
        cx + r(4, 0.42, 0.08) * w, cy - r(5, 0.08, 0.18) * h,
        cx + r(6, 0.38, 0.12) * w, cy + r(7, 0.18, 0.18) * h,
        cx + r(8, 0.12, 0.18) * w, cy + r(9, 0.42, 0.08) * h,
        cx - r(10, 0.05, 0.18) * w, cy + r(11, 0.38, 0.12) * h,
        cx - r(12, 0.38, 0.12) * w, cy + r(13, 0.2, 0.18) * h,
        cx - r(14, 0.44, 0.06) * w, cy - r(15, 0.08, 0.18) * h,
        cx - r(16, 0.2, 0.18) * w, cy - r(17, 0.38, 0.12) * h,
      ];
      return { path: makeBlobPath(w, h, pts), w, h };
    }
    default:
      return { path: '', w: size, h: size * 0.88 };
  }
}

export function detectExpression(text: string): Expression {
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

export function Slime({ color, size, x, y, text, createdAt, onDelete, onMove, onSplit }: SlimeProps) {
  const colorScheme = useColorScheme();
  const shadowOpacity = colorScheme === 'dark' ? 0.45 : 0.2;

  const scaleX = useRef(new Animated.Value(0)).current;
  const scaleY = useRef(new Animated.Value(0)).current;
  const idleScale = useRef(new Animated.Value(1)).current;
  // popOpacity는 inner view(native driver)에서만 사용
  const popOpacity = useRef(new Animated.Value(computeOpacity(createdAt))).current;
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const isDragging = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialPinchDist = useRef<number | null>(null);
  const onDeleteRef = useRef(onDelete);
  const onMoveRef = useRef(onMove);
  const onSplitRef = useRef(onSplit);
  const [isActive, setIsActive] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  // 파티클 애니메이션 값 (native driver)
  const particleAnims = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(1),
    })),
  ).current;

  // 파티클 고유 속성 (랜덤, 마운트 시 한 번 결정)
  const particleProps = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
        const distance = size * (0.4 + Math.random() * 0.7);
        return {
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance - size * 0.35,
          particleSize: 3 + Math.random() * 5,
          isRect: Math.random() > 0.6,
          duration: 380 + Math.random() * 320,
          delay: Math.floor(Math.random() * 130),
        };
      }),
    [size],
  );

  useEffect(() => { onDeleteRef.current = onDelete; }, [onDelete]);
  useEffect(() => { onMoveRef.current = onMove; }, [onMove]);
  useEffect(() => { onSplitRef.current = onSplit; }, [onSplit]);

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

  const shapeType = useMemo<ShapeType>(() => (Math.floor(Math.random() * 4)) as ShapeType, []);
  const shapeSeed = useMemo(() => Array.from({ length: 20 }, () => Math.random()), []);
  const blob = useMemo(() => generateBlob(size, shapeType, shapeSeed), [size, shapeType, shapeSeed]);


  const triggerPop = () => {
    generateHapticFeedback({ type: 'error' });
    // 파티클 초기화
    particleAnims.forEach(p => {
      p.x.setValue(0);
      p.y.setValue(0);
      p.opacity.setValue(1);
      p.scale.setValue(1);
    });
    setShowParticles(true);

    // 1단계: 몸체 부들부들 + 파티클 즉시 산란 시작
    const shake = Animated.sequence([
      Animated.timing(pan.x, { toValue: 11, duration: 35, useNativeDriver: false }),
      Animated.timing(pan.x, { toValue: -11, duration: 35, useNativeDriver: false }),
      Animated.timing(pan.x, { toValue: 9, duration: 30, useNativeDriver: false }),
      Animated.timing(pan.x, { toValue: -9, duration: 30, useNativeDriver: false }),
      Animated.timing(pan.x, { toValue: 6, duration: 28, useNativeDriver: false }),
      Animated.timing(pan.x, { toValue: -6, duration: 28, useNativeDriver: false }),
      Animated.timing(pan.x, { toValue: 3, duration: 22, useNativeDriver: false }),
      Animated.timing(pan.x, { toValue: -3, duration: 22, useNativeDriver: false }),
      Animated.timing(pan.x, { toValue: 0, duration: 18, useNativeDriver: false }),
    ]);

    const scaleWobble = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleX, { toValue: 1.18, duration: 40, useNativeDriver: true }),
          Animated.timing(scaleY, { toValue: 0.82, duration: 40, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scaleX, { toValue: 0.82, duration: 40, useNativeDriver: true }),
          Animated.timing(scaleY, { toValue: 1.18, duration: 40, useNativeDriver: true }),
        ]),
      ]),
      { iterations: 4 },
    );

    // 파티클 각자 흩어지기 (몸체 떨기 시작과 동시에)
    const particleAnimations = particleAnims.map((p, i) => {
      const { dx, dy, duration, delay } = particleProps[i];
      const slowDuration = duration * 2.2;
      return Animated.sequence([
        Animated.delay(delay * 1.5),
        Animated.parallel([
          Animated.timing(p.x, { toValue: dx * 1.4, duration: slowDuration, useNativeDriver: true }),
          Animated.timing(p.y, { toValue: dy * 1.4, duration: slowDuration, useNativeDriver: true }),
          Animated.timing(p.opacity, { toValue: 0, duration: slowDuration, useNativeDriver: true }),
          Animated.timing(p.scale, { toValue: 0, duration: slowDuration, useNativeDriver: true }),
        ]),
      ]);
    });

    // 파티클은 fire & forget, 몸체 완전히 없어지면 onDelete
    Animated.parallel(particleAnimations).start();

    // 2단계 (300ms 후): 납작해지며 부스러짐
    Animated.parallel([shake, scaleWobble]).start(() => {
      Animated.parallel([
        Animated.spring(scaleX, { toValue: 1.6, useNativeDriver: true, tension: 200, friction: 8 }),
        Animated.spring(scaleY, { toValue: 0.18, useNativeDriver: true, tension: 200, friction: 8 }),
      ]).start(() => {
        // 3단계: 먼지처럼 단계적 소멸
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scaleX, { toValue: 1.1, duration: 120, useNativeDriver: true }),
            Animated.timing(scaleY, { toValue: 0.5, duration: 120, useNativeDriver: true }),
            Animated.timing(popOpacity, { toValue: 0.6, duration: 120, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scaleX, { toValue: 0.6, duration: 110, useNativeDriver: true }),
            Animated.timing(scaleY, { toValue: 0.3, duration: 110, useNativeDriver: true }),
            Animated.timing(popOpacity, { toValue: 0.3, duration: 110, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scaleX, { toValue: 0, duration: 130, useNativeDriver: true }),
            Animated.timing(scaleY, { toValue: 0, duration: 130, useNativeDriver: true }),
            Animated.timing(popOpacity, { toValue: 0, duration: 130, useNativeDriver: true }),
          ]),
        ]).start(() => onDeleteRef.current?.());
      });
    });
  };

  const triggerSplit = () => {
    if (size < 70) return;
    generateHapticFeedback({ type: 'basicWeak' });
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scaleX, { toValue: 0.2, duration: 120, useNativeDriver: true }),
        Animated.timing(scaleY, { toValue: 1.4, duration: 120, useNativeDriver: true }),
      ]),
      Animated.timing(popOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start(() =>
      onSplitRef.current?.(
        x + (pan.x as any)._value,
        y + (pan.y as any)._value,
        size,
      ),
    );
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        isDragging.current = false;
        setIsActive(true);
        generateHapticFeedback({ type: 'tap' });

        Animated.parallel([
          Animated.spring(scaleX, { toValue: 1.2, useNativeDriver: true, tension: 400, friction: 8 }),
          Animated.spring(scaleY, { toValue: 0.78, useNativeDriver: true, tension: 400, friction: 8 }),
        ]).start();

        if (isNegative) {
          longPressTimer.current = setTimeout(() => {
            if (!isDragging.current) {
              generateHapticFeedback({ type: 'tickMedium' });
              triggerPop();
            }
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

      onPanResponderRelease: (_evt, _gs) => {
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
    anim.start(() => {
      const wobble = Animated.loop(
        Animated.sequence([
          Animated.timing(idleScale, { toValue: 1.022, duration: 1900, useNativeDriver: true }),
          Animated.timing(idleScale, { toValue: 0.978, duration: 1900, useNativeDriver: true }),
          Animated.timing(idleScale, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ]),
      );
      wobble.start();
    });
    return () => anim.stop();
  }, []);

  const renderFace = () => {
    const fcx = blob.w / 2;
    const fcy = blob.h * 0.43;
    const eyeR = Math.max(4, size * 0.075);
    const spread = blob.w * 0.18;
    const lEx = fcx - spread;
    const rEx = fcx + spread;
    const eyeY = fcy;
    const bW = eyeR * 1.8;
    const bH = Math.max(2, size * 0.038);
    const bY = eyeY - eyeR * 1.7;
    const mY = fcy + blob.h * 0.21;
    const mW = blob.w * 0.19;
    const sw = Math.max(2, size * 0.027);
    const bf = 'rgba(0,0,0,0.72)';
    const ef = '#111';
    const gl = 'rgba(255,255,255,0.55)';
    const gr = eyeR * 0.2;

    const eyes = (dy = 0) => (<>
      <Circle cx={lEx} cy={eyeY + dy} r={eyeR} fill={ef} />
      <Circle cx={rEx} cy={eyeY + dy} r={eyeR} fill={ef} />
      <Circle cx={lEx - eyeR * 0.22} cy={eyeY + dy - eyeR * 0.28} r={gr} fill={gl} />
      <Circle cx={rEx - eyeR * 0.22} cy={eyeY + dy - eyeR * 0.28} r={gr} fill={gl} />
    </>);

    switch (expression) {
      case 'angry':
        return (<>
          {eyes(eyeR * 0.1)}
          <Rect x={lEx - bW/2} y={bY - bH/2} width={bW} height={bH} fill={bf} rx={2} transform={`rotate(-30, ${lEx}, ${bY})`} />
          <Rect x={rEx - bW/2} y={bY - bH/2} width={bW} height={bH} fill={bf} rx={2} transform={`rotate(30, ${rEx}, ${bY})`} />
          <Rect x={fcx - mW} y={mY} width={mW * 2} height={bH * 0.85} fill="rgba(0,0,0,0.55)" rx={2} />
        </>);
      case 'sad':
        return (<>
          {eyes()}
          <Rect x={lEx - bW/2} y={bY - bH/2} width={bW} height={bH} fill={bf} rx={2} transform={`rotate(24, ${lEx}, ${bY})`} />
          <Rect x={rEx - bW/2} y={bY - bH/2} width={bW} height={bH} fill={bf} rx={2} transform={`rotate(-24, ${rEx}, ${bY})`} />
          <Path d={`M ${fcx-mW} ${mY} Q ${fcx} ${mY - mW*0.65} ${fcx+mW} ${mY}`} stroke="rgba(0,0,0,0.55)" strokeWidth={sw} strokeLinecap="round" fill="none" />
          <Ellipse cx={lEx + eyeR * 0.1} cy={eyeY + eyeR * 1.5} rx={eyeR * 0.18} ry={eyeR * 0.38} fill="rgba(140,210,255,0.88)" />
        </>);
      case 'surprised':
        return (<>
          <Circle cx={lEx} cy={eyeY} r={eyeR * 1.3} fill={ef} />
          <Circle cx={rEx} cy={eyeY} r={eyeR * 1.3} fill={ef} />
          <Circle cx={lEx - eyeR * 0.28} cy={eyeY - eyeR * 0.35} r={gr * 1.2} fill={gl} />
          <Circle cx={rEx - eyeR * 0.28} cy={eyeY - eyeR * 0.35} r={gr * 1.2} fill={gl} />
          <Rect x={lEx - bW/2} y={bY - bH/2 - eyeR * 0.6} width={bW} height={bH} fill={bf} rx={2} />
          <Rect x={rEx - bW/2} y={bY - bH/2 - eyeR * 0.6} width={bW} height={bH} fill={bf} rx={2} />
          <Ellipse cx={fcx} cy={mY + mW * 0.2} rx={mW * 0.5} ry={mW * 0.65} fill="rgba(0,0,0,0.5)" />
        </>);
      case 'happy':
        return (<>
          <Path d={`M ${lEx-eyeR} ${eyeY} A ${eyeR} ${eyeR} 0 0 0 ${lEx+eyeR} ${eyeY} Z`} fill={ef} />
          <Path d={`M ${rEx-eyeR} ${eyeY} A ${eyeR} ${eyeR} 0 0 0 ${rEx+eyeR} ${eyeY} Z`} fill={ef} />
          <Rect x={lEx - bW/2} y={bY - bH/2} width={bW} height={bH} fill="rgba(0,0,0,0.45)" rx={2} transform={`rotate(-8, ${lEx}, ${bY})`} />
          <Rect x={rEx - bW/2} y={bY - bH/2} width={bW} height={bH} fill="rgba(0,0,0,0.45)" rx={2} transform={`rotate(8, ${rEx}, ${bY})`} />
          <Path d={`M ${fcx-mW} ${mY} Q ${fcx} ${mY + mW*0.9} ${fcx+mW} ${mY}`} stroke="rgba(0,0,0,0.52)" strokeWidth={sw} strokeLinecap="round" fill="none" />
        </>);
      default:
        return (<>
          {eyes(eyeR * 0.08)}
          <Rect x={lEx - bW/2} y={bY - bH/2} width={bW} height={bH} fill="rgba(0,0,0,0.35)" rx={2} />
          <Rect x={rEx - bW/2} y={bY - bH/2} width={bW} height={bH} fill="rgba(0,0,0,0.35)" rx={2} />
          <Rect x={fcx - mW * 0.65} y={mY} width={mW * 1.3} height={bH * 0.8} fill="rgba(0,0,0,0.3)" rx={2} />
        </>);
    }
  };

  const cx = blob.w / 2;
  const cy = blob.h / 2;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          left: x,
          top: y,
          zIndex: isActive ? 100 : 1,
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      onTouchStart={(evt) => {
        const t = evt.nativeEvent.touches;
        if (t.length >= 2) {
          if (longPressTimer.current) clearTimeout(longPressTimer.current);
          const dx = t[1].pageX - t[0].pageX;
          const dy = t[1].pageY - t[0].pageY;
          initialPinchDist.current = Math.sqrt(dx * dx + dy * dy);
        }
      }}
      onTouchMove={(evt) => {
        const t = evt.nativeEvent.touches;
        if (t.length >= 2 && initialPinchDist.current !== null) {
          const dx = t[1].pageX - t[0].pageX;
          const dy = t[1].pageY - t[0].pageY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist - initialPinchDist.current > 30) {
            initialPinchDist.current = null;
            triggerSplit();
          }
        }
      }}
      {...panResponder.panHandlers}
    >
      {/* 파티클 레이어 */}
      {showParticles && particleAnims.map((p, i) => {
        const { particleSize, isRect } = particleProps[i];
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: particleSize,
              height: isRect ? particleSize * 0.4 : particleSize,
              borderRadius: isRect ? 1 : particleSize / 2,
              backgroundColor: color,
              left: cx - particleSize / 2,
              top: cy - particleSize / 2,
              opacity: p.opacity,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                { scale: p.scale },
              ],
            }}
          />
        );
      })}

      {/* 슬라임 몸체 */}
      <Animated.View
        style={{
          opacity: popOpacity,
          width: blob.w,
          height: blob.h,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 16,
          shadowOpacity,
          elevation: 14,
          transform: [{ scaleX }, { scaleY }, { scale: idleScale }],
        }}
      >
        <Svg width={blob.w} height={blob.h} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="grad" cx="36%" cy="28%" r="72%">
              <Stop offset="0%"   stopColor={lighten(color, 85)} stopOpacity="1" />
              <Stop offset="48%"  stopColor={color}              stopOpacity="1" />
              <Stop offset="100%" stopColor={lighten(color, -45)} stopOpacity="1" />
            </RadialGradient>
          </Defs>
          <Path d={blob.path} fill="url(#grad)" />
          <Ellipse
            cx={blob.w * 0.34} cy={blob.h * 0.23}
            rx={blob.w * 0.14} ry={blob.h * 0.072}
            fill="rgba(255,255,255,0.32)"
            transform={`rotate(-18, ${blob.w * 0.34}, ${blob.h * 0.23})`}
          />
          <Ellipse
            cx={blob.w * 0.62} cy={blob.h * 0.17}
            rx={blob.w * 0.052} ry={blob.h * 0.032}
            fill="rgba(255,255,255,0.2)"
          />
          {renderFace()}
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    overflow: 'visible',
  },
  blob: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 10,
  },
});
