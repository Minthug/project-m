import React, { useRef, useEffect } from 'react';
import { Animated, Pressable, View, StyleSheet, useColorScheme } from 'react-native';

interface SlimeProps {
  color: string;
  size: number;
  x: number;
  y: number;
}

export function Slime({ color, size, x, y }: SlimeProps) {
  const colorScheme = useColorScheme();
  const shadowOpacity = colorScheme === 'dark' ? 0.45 : 0.2;
  const scaleX = useRef(new Animated.Value(0)).current;
  const scaleY = useRef(new Animated.Value(0)).current;

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
            borderTopLeftRadius: size * 0.65,
            borderTopRightRadius: size * 0.45,
            borderBottomLeftRadius: size * 0.5,
            borderBottomRightRadius: size * 0.7,
            shadowOpacity,
            transform: [{ scaleX }, { scaleY }],
          },
        ]}
      >
        <View
          style={{
            position: 'absolute',
            top: size * 0.12,
            left: size * 0.18,
            width: size * 0.28,
            height: size * 0.14,
            backgroundColor: 'rgba(255, 255, 255, 0.35)',
            borderRadius: size * 0.07,
            transform: [{ rotate: '-15deg' }],
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: size * 0.24,
            left: size * 0.26,
            width: size * 0.12,
            height: size * 0.06,
            backgroundColor: 'rgba(255, 255, 255, 0.18)',
            borderRadius: size * 0.03,
            transform: [{ rotate: '-10deg' }],
          }}
        />
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
