import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Animated, StyleSheet, useColorScheme, PanResponder } from 'react-native';
import { generateHapticFeedback } from '@apps-in-toss/native-modules';
import Svg, { Path, Defs, RadialGradient, Stop, Ellipse, Circle } from 'react-native-svg';

function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

export type Expression = 'happy' | 'sad' | 'surprised' | 'blank' | 'angry' | 'fear' | 'disgust' | 'contempt';

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
  fear:     ['무서워', '무섭다', '공포', '두려워', '겁나', '겁이나', '긴장돼', '긴장된다', '불안해', '불안하다', '떨려', '오싹', '무서운', '두렵다', '겁쟁이', '공황'],
  disgust:  ['역겨워', '역겹다', '구역질', '혐오', '역해', '역하다', '토할것같아', '토나와', '징그러워', '징그럽다', '더러워', '역겨운', '구리다', '냄새나', '역겨'],
  contempt: ['우습네', '우습다', '웃기지마', '웃기네', '하찮아', '하찮다', '무시해', '경멸', '코웃음', '별거아니야', '찌질'],
  angry:    ['짜증', '열받', '빡', '화나', '싫어', '미치겠', '분노', '억울', '더럽', '진짜로', '왜이래', '어이없', '황당', '최악', '별로', '구려', '망했', '씨발', '씨바', '시발', '시바', '썅', '개새', '병신', '닥쳐', '꺼져', '죽어', '존나', '졌나', '미친놈', '미친년', '개같', '느금', '보지', '자지', '니애미', '니에미', '개소리', '헛소리', '집어쳐', '꺼지라'],
  sad:      ['슬퍼', '울고', '눈물', '힘들', '지쳐', '외로워', '우울', '그리워', '보고싶', '상처', '아파', '힘들어', '지침', '서러', '괴로', '무기력', 'ㅠㅠ', 'ㅜㅜ', 'ㅠ-ㅜ', 'ㅜ-ㅠ', 'ㅠ.ㅠ', 'ㅜ.ㅜ', 'ㅠ', 'ㅜ', 'T_T', 'TT', '흑흑', '훌쩍', '엉엉', '으앙', '으엉'],
  surprised:['헐', '대박', '미쳤', '말도안돼', '당황', '믿을수없', '뭐야', '진짜', '충격', '놀랐', '설마', '이게뭐', '갑자기'],
  happy:    ['좋아', '행복', '신나', '기뻐', '즐거워', '최고', '사랑', '고마워', '감사', '다행', '설레', '기대', '신남'],
  blank:    [],
};

const PARTICLE_COUNT = 16;

type ShapeType = 0 | 1 | 2 | 3;

// 메이플스토리 스타일 물방울/테어드랍 형태
// [wr, hr, tipW, sideW] — 모두 w 또는 h 비율
const BLOB_CONFIGS: [number, number, number, number][] = [
  [1.00, 0.96, 0.13, 0.50],  // 0: 기본 물방울
  [1.12, 0.84, 0.17, 0.52],  // 1: 넓적한 물방울
  [0.88, 1.08, 0.10, 0.47],  // 2: 키 큰 물방울
  [1.06, 0.90, 0.15, 0.51],  // 3: 통통한 물방울
];

function generateBlob(size: number, shape: ShapeType, seed: number[]): { path: string; w: number; h: number } {
  const cfg = BLOB_CONFIGS[shape] ?? BLOB_CONFIGS[0]!;
  const [wr, hr, tipWr, sideWr] = cfg;
  const w = size * wr, h = size * hr;
  const cx = w / 2;
  const v = (i: number, base: number) => base * (1 + (seed[i % seed.length]! - 0.5) * 0.09);

  const tipW = v(0, w * tipWr);   // 꼭대기 좌우 퍼짐 (뾰족함 조절)
  const sideW = v(1, w * sideWr); // 최대 너비
  const midH = v(2, h * 0.54);    // 최대 너비 y 위치
  const topH = v(3, h * 0.20);    // 어깨 높이
  const lowH = v(4, h * 0.80);    // 하단 곡선 시작
  const botW = v(5, w * 0.38);    // 바닥 좌우 퍼짐

  const f = (n: number) => n.toFixed(1);
  const d = [
    `M ${f(cx)} 0`,
    `C ${f(cx+tipW)} 0 ${f(cx+sideW)} ${f(topH)} ${f(cx+sideW)} ${f(midH)}`,
    `C ${f(cx+sideW)} ${f(lowH)} ${f(cx+botW)} ${f(h)} ${f(cx)} ${f(h)}`,
    `C ${f(cx-botW)} ${f(h)} ${f(cx-sideW)} ${f(lowH)} ${f(cx-sideW)} ${f(midH)}`,
    `C ${f(cx-sideW)} ${f(topH)} ${f(cx-tipW)} 0 ${f(cx)} 0`,
    'Z',
  ].join(' ');

  return { path: d, w, h };
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

  const isNegative = expression === 'angry' || expression === 'sad' || expression === 'fear';

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
      const { dx, dy, duration, delay } = particleProps[i]!;
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
    // 물방울 형태: 얼굴이 몸체 하단부에 위치 (위 뾰족한 부분 피함)
    const eyeR = size * 0.095;
    const pupR = eyeR * 0.54;
    const spread = size * 0.20;
    const lEx = fcx - spread;
    const rEx = fcx + spread;
    const eyeY = blob.h * 0.58;
    const mY = blob.h * 0.76;
    const mW = size * 0.10;
    const sw = size * 0.030;
    const bsw = size * 0.028;
    const ms = 'rgba(0,0,0,0.58)';
    const dk = '#1a1a1a';

    // 메이플 스타일 눈: 흰자 + 동공 + 하이라이트
    const eye = (cx: number, cy: number, pDx = 0, pDy = 0.1, r = eyeR) => {
      const pr = pupR * (r / eyeR);
      const px = cx + pDx * r;
      const py = cy + pDy * r;
      return (<>
        <Circle cx={cx} cy={cy} r={r} fill="white" />
        <Circle cx={px} cy={py} r={pr} fill={dk} />
        <Circle cx={px - pr * 0.28} cy={py - pr * 0.32} r={pr * 0.28} fill="rgba(255,255,255,0.92)" />
      </>);
    };

    switch (expression) {
      case 'happy':
        return (<>
          <Path d={`M ${lEx-eyeR} ${eyeY} A ${eyeR} ${eyeR} 0 0 0 ${lEx+eyeR} ${eyeY} Z`} fill={dk} />
          <Path d={`M ${rEx-eyeR} ${eyeY} A ${eyeR} ${eyeR} 0 0 0 ${rEx+eyeR} ${eyeY} Z`} fill={dk} />
          <Path d={`M ${fcx-mW*1.4} ${mY} Q ${fcx} ${mY+mW*1.1} ${fcx+mW*1.4} ${mY}`} stroke={ms} strokeWidth={sw} strokeLinecap="round" fill="none" />
        </>);
      case 'sad':
        return (<>
          {eye(lEx, eyeY, 0, 0.28)}
          {eye(rEx, eyeY, 0, 0.28)}
          <Path d={`M ${fcx-mW} ${mY} Q ${fcx} ${mY-mW*0.85} ${fcx+mW} ${mY}`} stroke={ms} strokeWidth={sw} strokeLinecap="round" fill="none" />
          <Ellipse cx={lEx + eyeR*0.05} cy={eyeY + eyeR*1.25} rx={eyeR*0.2} ry={eyeR*0.45} fill="rgba(100,180,255,0.88)" />
        </>);
      case 'angry':
        return (<>
          {eye(lEx, eyeY, -0.12, 0.12)}
          {eye(rEx, eyeY, 0.12, 0.12)}
          <Path d={`M ${lEx-eyeR*1.1} ${eyeY-eyeR*1.6} L ${lEx+eyeR*0.55} ${eyeY-eyeR*1.02}`} stroke={dk} strokeWidth={bsw*1.1} strokeLinecap="round" />
          <Path d={`M ${rEx-eyeR*0.55} ${eyeY-eyeR*1.02} L ${rEx+eyeR*1.1} ${eyeY-eyeR*1.6}`} stroke={dk} strokeWidth={bsw*1.1} strokeLinecap="round" />
          <Path d={`M ${fcx-mW} ${mY} L ${fcx+mW} ${mY}`} stroke={ms} strokeWidth={sw*0.85} strokeLinecap="round" />
        </>);
      case 'surprised':
        return (<>
          {eye(lEx, eyeY, 0, 0, eyeR*1.22)}
          {eye(rEx, eyeY, 0, 0, eyeR*1.22)}
          <Circle cx={fcx} cy={mY + eyeR*0.22} r={eyeR*0.72} fill={dk} />
        </>);
      case 'fear':
        return (<>
          {eye(lEx, eyeY, 0.12, 0.18, eyeR*1.1)}
          {eye(rEx, eyeY, -0.12, 0.18, eyeR*1.1)}
          <Path d={`M ${lEx-eyeR*0.85} ${eyeY-eyeR*1.05} L ${lEx+eyeR*0.52} ${eyeY-eyeR*1.62}`} stroke={dk} strokeWidth={bsw} strokeLinecap="round" />
          <Path d={`M ${rEx-eyeR*0.52} ${eyeY-eyeR*1.62} L ${rEx+eyeR*0.85} ${eyeY-eyeR*1.05}`} stroke={dk} strokeWidth={bsw} strokeLinecap="round" />
          <Path d={`M ${fcx-mW*0.75} ${mY} Q ${fcx} ${mY+mW*0.62} ${fcx+mW*0.75} ${mY}`} stroke={ms} strokeWidth={sw} strokeLinecap="round" fill="none" />
        </>);
      case 'disgust':
        return (<>
          {eye(lEx, eyeY, 0, 0.15)}
          {eye(rEx, eyeY, 0, 0.15)}
          <Path d={`M ${fcx-mW} ${mY+mW*0.2} Q ${fcx-mW*0.25} ${mY+mW*0.48} ${fcx} ${mY+mW*0.26} Q ${fcx+mW*0.32} ${mY+mW*0.06} ${fcx+mW} ${mY+mW*0.24}`} stroke={ms} strokeWidth={sw} strokeLinecap="round" fill="none" />
        </>);
      case 'contempt':
        return (<>
          {eye(lEx, eyeY, 0, 0, eyeR*0.82)}
          {eye(rEx, eyeY)}
          <Path d={`M ${fcx} ${mY} Q ${fcx+mW*0.62} ${mY-mW*0.25} ${fcx+mW*1.2} ${mY-mW*0.54}`} stroke={ms} strokeWidth={sw} strokeLinecap="round" fill="none" />
        </>);
      default:
        return (<>
          {eye(lEx, eyeY)}
          {eye(rEx, eyeY)}
          <Path d={`M ${fcx-mW*0.7} ${mY} L ${fcx+mW*0.7} ${mY}`} stroke={ms} strokeWidth={sw*0.82} strokeLinecap="round" />
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
        const { particleSize, isRect } = particleProps[i]!;
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
          {/* 메이플 스타일 광택 — 물방울 상단 좌측 */}
          <Ellipse
            cx={blob.w * 0.38} cy={blob.h * 0.28}
            rx={blob.w * 0.16} ry={blob.h * 0.085}
            fill="rgba(255,255,255,0.46)"
            transform={`rotate(-20, ${blob.w * 0.38}, ${blob.h * 0.28})`}
          />
          <Ellipse
            cx={blob.w * 0.58} cy={blob.h * 0.20}
            rx={blob.w * 0.06} ry={blob.h * 0.036}
            fill="rgba(255,255,255,0.30)"
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
