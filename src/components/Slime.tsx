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

const SLIME_ASPECT = 0.82;

export function detectExpression(text: string): Expression {
  const t = text.toLowerCase();
  for (const [expr, keywords] of Object.entries(KEYWORDS) as [Expression, string[]][]) {
    if (expr === 'blank') continue;
    if (keywords.some(k => t.includes(k))) return expr;
  }
  return 'blank';
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
