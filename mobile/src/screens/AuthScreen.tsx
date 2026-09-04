import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }: any) {
    const { login, register } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!email || !password) { Alert.alert('Error', 'Email and password are required'); return; }
        setLoading(true);
        try {
            if (isLogin) {
                await login(email, password);
            } else {
                if (!name) { Alert.alert('Error', 'Name is required'); setLoading(false); return; }
                await register(name, email, password, phone);
            }
        } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.error || e.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <Text style={styles.logoIcon}>🛡️</Text>
                    <Text style={styles.appName}>SafeLink</Text>
                    <Text style={styles.tagline}>Your Emergency Lifeline</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>

                    {!isLogin && (
                        <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#999"
                            value={name} onChangeText={setName} />
                    )}
                    <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#999"
                        value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                    <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#999"
                        value={password} onChangeText={setPassword} secureTextEntry />
                    {!isLogin && (
                        <TextInput style={styles.input} placeholder="Phone Number (optional)" placeholderTextColor="#999"
                            value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                    )}

                    <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isLogin ? 'Login' : 'Register'}</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                        <Text style={styles.switchText}>
                            {isLogin ? "Don't have an account? " : 'Already have an account? '}
                            <Text style={styles.switchLink}>{isLogin ? 'Register' : 'Login'}</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0E1A' },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    logoContainer: { alignItems: 'center', marginBottom: 32 },
    logoIcon: { fontSize: 64 },
    appName: { fontSize: 36, fontWeight: '800', color: '#FF3B3B', letterSpacing: 2 },
    tagline: { fontSize: 14, color: '#888', marginTop: 4 },
    card: { backgroundColor: '#151928', borderRadius: 20, padding: 24, shadowColor: '#FF3B3B', shadowOpacity: 0.2, shadowRadius: 20 },
    title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 20 },
    input: {
        backgroundColor: '#1E2438', borderRadius: 12, padding: 14,
        color: '#fff', fontSize: 15, marginBottom: 14, borderWidth: 1, borderColor: '#2A3050',
    },
    button: { backgroundColor: '#FF3B3B', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
    buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    switchText: { textAlign: 'center', color: '#888', marginTop: 16 },
    switchLink: { color: '#FF3B3B', fontWeight: '700' },
});
