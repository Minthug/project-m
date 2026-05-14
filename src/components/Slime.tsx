import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Animated, StyleSheet, useColorScheme, PanResponder, Image } from 'react-native';
import { generateHapticFeedback } from '@apps-in-toss/native-modules';
import { SLIME_URI } from '../assets/slime-images';

const SLIME_IMAGES = SLIME_URI;


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

// [키워드, 가중치] — 강한 신호일수록 높은 값
const KEYWORD_WEIGHTS: Record<Expression, Array<[string, number]>> = {
  angry: [
    ['씨발', 4], ['씨바', 4], ['시발', 4], ['시바', 4], ['썅', 4], ['개새', 4],
    ['병신', 3], ['닥쳐', 3], ['꺼져', 3], ['존나', 3], ['니애미', 3], ['니에미', 3],
    ['미친놈', 3], ['미친년', 3], ['개같', 3], ['개소리', 3], ['집어쳐', 3],
    ['빡', 2], ['열받', 2], ['짜증', 2], ['화나', 2], ['분노', 2], ['억울', 2],
    ['어이없', 2], ['황당', 2], ['더럽', 2], ['미치겠', 2], ['헛소리', 2], ['꺼지라', 2],
    ['최악', 1], ['별로', 1], ['싫어', 1], ['구려', 1], ['망했', 1], ['왜이래', 1],
  ],
  sad: [
    ['흑흑', 4], ['훌쩍', 4], ['엉엉', 4], ['으앙', 4], ['으엉', 4],
    ['ㅠㅠ', 3], ['ㅜㅜ', 3], ['T_T', 3], ['TT', 3], ['ㅠ-ㅜ', 3], ['ㅜ-ㅠ', 3], ['ㅠ.ㅠ', 3], ['ㅜ.ㅜ', 3],
    ['슬프', 2], ['눈물', 2], ['우울', 2], ['외로워', 2], ['무기력', 2],
    ['힘들', 2], ['보고싶', 2], ['그리워', 2], ['서러', 2], ['괴로', 2],
    ['울고', 1], ['지쳐', 1], ['상처', 1], ['아파', 1], ['지침', 1], ['ㅠ', 1], ['ㅜ', 1],
  ],
  fear: [
    ['공황', 4], ['공포', 3], ['두려워', 3], ['두렵다', 3],
    ['무서워', 2], ['무섭다', 2], ['무서운', 2], ['오싹', 2],
    ['겁나', 1], ['겁이나', 1], ['긴장돼', 1], ['긴장된다', 1],
    ['불안해', 1], ['불안하다', 1], ['떨려', 1], ['겁쟁이', 1],
  ],
  disgust: [
    ['혐오', 4], ['역겨워', 3], ['역겹다', 3], ['구역질', 3], ['토할것같아', 3], ['토나와', 3],
    ['징그러워', 2], ['징그럽다', 2], ['더러워', 2],
    ['역해', 1], ['역하다', 1], ['구리다', 1], ['냄새나', 1], ['역겨', 1],
  ],
  contempt: [
    ['경멸', 4], ['하찮아', 3], ['하찮다', 3], ['무시해', 3], ['코웃음', 3],
    ['웃기지마', 2], ['별거아니야', 2], ['찌질', 2],
    ['우습네', 1], ['우습다', 1], ['웃기네', 1],
  ],
  surprised: [
    ['말도안돼', 3], ['믿을수없', 3], ['충격', 2], ['대박', 2], ['설마', 2], ['이게뭐', 2],
    ['헐', 1], ['뭐야', 1], ['놀랐', 1], ['당황', 1], ['갑자기', 1], ['미쳤', 1],
  ],
  happy: [
    ['행복', 3], ['사랑', 3], ['기뻐', 3], ['즐거워', 3],
    ['감사', 2], ['고마워', 2], ['신남', 2], ['설레', 2], ['다행', 2],
    ['좋아', 1], ['신나', 1], ['최고', 1], ['기대', 1],
  ],
  blank: [],
};

const PARTICLE_COUNT = 16;

const SLIME_ASPECT = 0.82;

export function detectExpression(text: string): Expression {
  const t = text.toLowerCase();
  let best: Expression = 'blank';
  let bestScore = 0;

  for (const [expr, pairs] of Object.entries(KEYWORD_WEIGHTS) as [Expression, Array<[string, number]>][]) {
    if (expr === 'blank') continue;
    const score = pairs.reduce((sum, [kw, w]) => sum + (t.includes(kw) ? w : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = expr;
    }
  }

  return best;
}

// 자정 기준 경과 일수 계산
function getDayAge(createdAt?: number): number {
  if (!createdAt) return 0;
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const created = new Date(createdAt);
  const createdMidnight = new Date(created.getFullYear(), created.getMonth(), created.getDate()).getTime();
  return Math.floor((todayMidnight - createdMidnight) / (24 * 60 * 60 * 1000));
}

// Day 0=1.0, Day 1=0.8, Day 3=0.5, Day 6=0.2, Day 7+=0
function computeOpacityByAge(dayAge: number): number {
  if (dayAge <= 0) return 1.0;
  if (dayAge === 1) return 0.8;
  if (dayAge === 2) return 0.65;
  if (dayAge === 3) return 0.5;
  if (dayAge === 4) return 0.4;
  if (dayAge === 5) return 0.3;
  if (dayAge === 6) return 0.2;
  return 0;
}

// 나이 들수록 느리게 숨쉬기
function getIdleWobbleDuration(dayAge: number): number {
  if (dayAge <= 0) return 1900;
  if (dayAge === 1) return 2600;
  if (dayAge === 2) return 3400;
  return 4800;
}

export function Slime({ color, size, x, y, text, createdAt, onDelete, onMove, onSplit }: SlimeProps) {
  const colorScheme = useColorScheme();
  const shadowOpacity = colorScheme === 'dark' ? 0.45 : 0.2;

  const dayAge = useMemo(() => getDayAge(createdAt), [createdAt]);
  const initialOpacity = useMemo(() => computeOpacityByAge(dayAge), [dayAge]);
  const wobbleDuration = useMemo(() => getIdleWobbleDuration(dayAge), [dayAge]);

  const scaleX = useRef(new Animated.Value(0)).current;
  const scaleY = useRef(new Animated.Value(0)).current;
  const idleScale = useRef(new Animated.Value(1)).current;
  // popOpacity는 inner view(native driver)에서만 사용
  const popOpacity = useRef(new Animated.Value(initialOpacity)).current;
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

  const imgW = size * SLIME_ASPECT;
  const imgH = size;


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
          Animated.timing(idleScale, { toValue: 1.022, duration: wobbleDuration, useNativeDriver: true }),
          Animated.timing(idleScale, { toValue: 0.978, duration: wobbleDuration, useNativeDriver: true }),
          Animated.timing(idleScale, { toValue: 1, duration: wobbleDuration * 0.63, useNativeDriver: true }),
        ]),
      );
      wobble.start();
    });
    return () => anim.stop();
  }, []);

  const cx = imgW / 2;
  const cy = imgH / 2;

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
          const dx = t[1]!.pageX - t[0]!.pageX;
          const dy = t[1]!.pageY - t[0]!.pageY;
          initialPinchDist.current = Math.sqrt(dx * dx + dy * dy);
        }
      }}
      onTouchMove={(evt) => {
        const t = evt.nativeEvent.touches;
        if (t.length >= 2 && initialPinchDist.current !== null) {
          const dx = t[1]!.pageX - t[0]!.pageX;
          const dy = t[1]!.pageY - t[0]!.pageY;
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
          width: imgW,
          height: imgH,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 16,
          shadowOpacity,
          elevation: 14,
          transform: [{ scaleX }, { scaleY }, { scale: idleScale }],
        }}
      >
        <Image
          source={SLIME_IMAGES[expression]}
          style={{ width: imgW, height: imgH }}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    overflow: 'visible',
  },
});
