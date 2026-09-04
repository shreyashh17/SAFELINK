import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

interface User {
    uid: string;
    name: string;
    email: string;
    role: string;
    token: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const stored = await AsyncStorage.getItem('user');
            if (stored) setUser(JSON.parse(stored));
            setLoading(false);
        })();
    }, []);

    const login = async (email: string, password: string) => {
        const res = await api.post('/api/auth/login', { email, password });
        const u: User = res.data;
        await AsyncStorage.setItem('token', u.token);
        await AsyncStorage.setItem('user', JSON.stringify(u));
        setUser(u);
    };

    const register = async (name: string, email: string, password: string, phone?: string) => {
        const res = await api.post('/api/auth/register', { name, email, password, phone });
        const u: User = res.data;
        await AsyncStorage.setItem('token', u.token);
        await AsyncStorage.setItem('user', JSON.stringify(u));
        setUser(u);
    };

    const logout = async () => {
        await AsyncStorage.multiRemove(['token', 'user']);
        setUser(null);
    };

    return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
