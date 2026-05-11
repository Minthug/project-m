import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Animated, View, StyleSheet, useColorScheme, PanResponder } from 'react-native';
import Svg, { Path } from 'react-native-svg';

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

export function Slime({ color, size, x, y, text, createdAt, onDelete, onMove, onSplit }: SlimeProps) {
  const colorScheme = useColorScheme();
  const shadowOpacity = colorScheme === 'dark' ? 0.45 : 0.2;

  const scaleX = useRef(new Animated.Value(0)).current;
  const scaleY = useRef(new Animated.Value(0)).current;
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

  const eyeConfig = useMemo(() => {
    const w = blob.w, h = blob.h;
    const es = size * (0.1 + Math.random() * 0.04);
    return {
      left:  { top: h * (0.28 + Math.random() * 0.06), left: w * (0.18 + Math.random() * 0.06), size: es },
      right: { top: h * (0.26 + Math.random() * 0.06), left: w * (0.52 + Math.random() * 0.06), size: es },
    };
  }, [blob.w, blob.h, size]);

  const triggerPop = () => {
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

  const getPinchDist = (touches: any[]) => {
    if (touches.length < 2) return null;
    const dx = touches[1].pageX - touches[0].pageX;
    const dy = touches[1].pageY - touches[0].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const triggerSplit = () => {
    if (size < 70) return;
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
        style={{ position: 'absolute', width: eyeWidth, height: eyeHeight, backgroundColor: 'white', borderRadius: cfg.size, top: cfg.top, left: cfg.left }}
      >
        <View style={{ position: 'absolute', width: pupilSize, height: pupilSize, backgroundColor: '#111', borderRadius: pupilSize, top: eyeHeight * 0.25, left: eyeWidth * 0.22 }} />
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
        return (<><View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.55)', top: by, left: lx, transform: [{ rotate: '25deg' }] }} /><View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.55)', top: by, left: rx, transform: [{ rotate: '-25deg' }] }} /></>);
      case 'sad':
        return (<><View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.4)', top: by, left: lx, transform: [{ rotate: '-20deg' }] }} /><View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.4)', top: by, left: rx, transform: [{ rotate: '20deg' }] }} /></>);
      case 'surprised':
        return (<><View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.4)', top: by - size * 0.05, left: lx }} /><View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.4)', top: by - size * 0.05, left: rx }} /></>);
      case 'happy':
        return (<><View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.3)', top: by - size * 0.02, left: lx, transform: [{ rotate: '-8deg' }] }} /><View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.3)', top: by - size * 0.02, left: rx, transform: [{ rotate: '8deg' }] }} /></>);
      default:
        return (<><View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.28)', top: by, left: lx }} /><View style={{ ...base, backgroundColor: 'rgba(0,0,0,0.28)', top: by, left: rx }} /></>);
    }
  };

  const renderMouth = () => {
    const mouthY = blob.h * 0.62;
    const mcx = blob.w / 2;
    switch (expression) {
      case 'happy':
        return <View style={{ position: 'absolute', width: size * 0.38, height: size * 0.2, borderBottomLeftRadius: size * 0.2, borderBottomRightRadius: size * 0.2, borderWidth: size * 0.03, borderTopWidth: 0, borderColor: 'rgba(0,0,0,0.4)', top: mouthY, left: mcx - size * 0.19 }} />;
      case 'sad':
        return (<><View style={{ position: 'absolute', width: size * 0.3, height: size * 0.16, borderTopLeftRadius: size * 0.16, borderTopRightRadius: size * 0.16, borderWidth: size * 0.03, borderBottomWidth: 0, borderColor: 'rgba(0,0,0,0.4)', top: mouthY + size * 0.04, left: mcx - size * 0.15 }} /><View style={{ position: 'absolute', width: size * 0.055, height: size * 0.08, backgroundColor: 'rgba(100,180,255,0.85)', borderBottomLeftRadius: size * 0.04, borderBottomRightRadius: size * 0.04, borderTopLeftRadius: size * 0.02, borderTopRightRadius: size * 0.02, top: eyeConfig.left.top + eyeConfig.left.size + size * 0.01, left: eyeConfig.left.left + eyeConfig.left.size * 0.2 }} /></>);
      case 'surprised':
        return <View style={{ position: 'absolute', width: size * 0.22, height: size * 0.24, borderRadius: size * 0.12, backgroundColor: 'rgba(0,0,0,0.35)', top: mouthY, left: mcx - size * 0.11 }} />;
      case 'angry':
        return (<><View style={{ position: 'absolute', width: size * 0.28, height: size * 0.03, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 2, top: mouthY + size * 0.02, left: mcx - size * 0.14 }} /><View style={{ position: 'absolute', width: size * 0.08, height: size * 0.03, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 2, top: mouthY + size * 0.03, left: mcx - size * 0.2, transform: [{ rotate: '40deg' }] }} /><View style={{ position: 'absolute', width: size * 0.08, height: size * 0.03, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 2, top: mouthY + size * 0.03, left: mcx + size * 0.12, transform: [{ rotate: '-40deg' }] }} /></>);
      default:
        return <View style={{ position: 'absolute', width: size * 0.2, height: size * 0.025, backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: 2, top: mouthY + size * 0.02, left: mcx - size * 0.1 }} />;
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
          shadowOffset: { width: 0, height: 6 },
          shadowRadius: 10,
          shadowOpacity,
          elevation: 10,
          transform: [{ scaleX }, { scaleY }],
        }}
      >
        <Svg width={blob.w} height={blob.h} style={StyleSheet.absoluteFill}>
          <Path d={blob.path} fill={color} />
        </Svg>
        {/* 광택 */}
        <View style={{ position: 'absolute', top: blob.h * 0.1, left: blob.w * 0.18, width: blob.w * 0.26, height: blob.h * 0.13, backgroundColor: 'rgba(255,255,255,0.32)', borderRadius: size * 0.07, transform: [{ rotate: '-15deg' }] }} />
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
    overflow: 'visible',
  },
  blob: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 10,
  },
});
