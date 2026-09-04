import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar } from 'react-native';

export default function SplashScreen({ navigation }: any) {
    const logoScale = useRef(new Animated.Value(0.3)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const taglineOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.parallel([
                Animated.spring(logoScale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
                Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
            ]),
            Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(taglineOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start(() => {
            setTimeout(() => navigation.replace('Auth'), 1200);
        });
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0A0E1A" />
            <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
                <View style={styles.shieldOuter}>
                    <View style={styles.shieldInner}>
                        <Text style={styles.shieldIcon}>🛡️</Text>
                    </View>
                </View>
            </Animated.View>
            <Animated.Text style={[styles.appName, { opacity: textOpacity }]}>SafeLink</Animated.Text>
            <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
                Instant · Reliable · Intelligent{'\n'}Emergency Response
            </Animated.Text>
            <View style={styles.footer}>
                <View style={styles.dot} /><View style={[styles.dot, styles.dotActive]} /><View style={styles.dot} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0E1A', alignItems: 'center', justifyContent: 'center' },
    logoWrap: { marginBottom: 32 },
    shieldOuter: {
        width: 140, height: 140, borderRadius: 70, backgroundColor: '#FF3B3B22',
        alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FF3B3B44',
    },
    shieldInner: {
        width: 100, height: 100, borderRadius: 50, backgroundColor: '#FF3B3B33',
        alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FF3B3B',
    },
    shieldIcon: { fontSize: 48 },
    appName: { fontSize: 42, fontWeight: '900', color: '#FF3B3B', letterSpacing: 4, marginBottom: 12 },
    tagline: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22 },
    footer: { position: 'absolute', bottom: 60, flexDirection: 'row', gap: 8 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333' },
    dotActive: { backgroundColor: '#FF3B3B', width: 24 },
});
