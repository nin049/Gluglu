import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';

function Leaf({ delay, angle, radius }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1, duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0, duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * radius;
  const y = Math.sin(rad) * radius;

  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.15, 0.5, 0.15] });
  const scale = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.7, 1.1, 0.7] });

  return (
    <Animated.View style={[
      styles.leaf,
      { opacity, transform: [{ translateX: x }, { translateY: y }, { scale }, { rotate: `${angle + 90}deg` }] },
    ]} />
  );
}

export default function LoadingScreen() {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.4)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1 - Anneau + logo entrent
    Animated.parallel([
      Animated.spring(ringScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
      Animated.timing(ringOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(200),
        Animated.parallel([
          Animated.spring(logoScale, { toValue: 1, friction: 6, useNativeDriver: true }),
          Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(taglineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    ]).start(() => {
      // 2 - Dots séquentiels en boucle
      const dot = (ref, delay) => Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(ref, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(ref, { toValue: 0.2, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      );
      dot(dot1, 0).start();
      dot(dot2, 200).start();
      dot(dot3, 400).start();
    });
  }, []);

  const leaves = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <View style={styles.container}>
      {/* Anneau décoratif avec feuilles animées */}
      <Animated.View style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}>
        {leaves.map((angle, i) => (
          <Leaf key={angle} angle={angle} radius={72} delay={i * 150} />
        ))}
      </Animated.View>

      {/* Logo */}
      <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Text style={styles.logo}>GluGlu</Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        Mangez sans gluten, en toute confiance
      </Animated.Text>

      {/* Dots de chargement */}
      <View style={styles.dotRow}>
        {[dot1, dot2, dot3].map((d, i) => (
          <Animated.View key={i} style={[styles.dot, { opacity: d, transform: [{ scale: d.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C2B1D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    width: 200, height: 200,
    justifyContent: 'center', alignItems: 'center',
  },
  leaf: {
    position: 'absolute',
    width: 10, height: 22,
    borderRadius: 5,
    backgroundColor: '#4A7C59',
  },
  logoWrap: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 52,
    fontWeight: '700',
    color: '#FAFAF8',
    letterSpacing: -1.5,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(250,250,248,0.45)',
    letterSpacing: 0.4,
    marginTop: 12,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 8,
    position: 'absolute',
    bottom: 80,
  },
  dot: {
    width: 7, height: 7,
    borderRadius: 3.5,
    backgroundColor: '#4A7C59',
  },
});
