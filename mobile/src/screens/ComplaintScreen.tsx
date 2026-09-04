import React, { useState, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
    Alert, ActivityIndicator, Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import api from '../services/api';
import { getCurrentLocation } from '../services/location';

const CATEGORIES = ['General', 'Harassment', 'Accident', 'Theft', 'Medical', 'Fire', 'Other'];

export default function ComplaintScreen({ navigation }: any) {
    const [text, setText] = useState('');
    const [category, setCategory] = useState('General');
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [audioUri, setAudioUri] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const startRecording = async () => {
        try {
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(rec);
            setIsRecording(true);
        } catch (e) { Alert.alert('Error', 'Could not start recording'); }
    };

    const stopRecording = async () => {
        if (!recording) return;
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setAudioUri(uri);
        setRecording(null);
        setIsRecording(false);
        // Upload and transcribe
        if (uri) {
            setLoading(true);
            try {
                const form = new FormData();
                form.append('audio', { uri, name: 'complaint.m4a', type: 'audio/m4a' } as any);
                const res = await api.post('/api/complaint/transcribe', form, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                setTranscript(res.data.transcript);
                setText(res.data.transcript);
                if (res.data.distress?.isDistress) {
                    Alert.alert('⚠️ Distress Detected', 'Potential distress keywords detected. Sending SOS?', [
                        { text: 'No', style: 'cancel' },
                        { text: 'Send SOS', onPress: () => navigation.navigate('Home') },
                    ]);
                }
            } catch {
                Alert.alert('Info', 'Transcription failed — type your complaint manually');
            } finally { setLoading(false); }
        }
    };

    const submitComplaint = async () => {
        if (!text.trim()) { Alert.alert('Error', 'Please describe your complaint'); return; }
        setLoading(true);
        try {
            const loc = await getCurrentLocation().catch(() => ({ latitude: 0, longitude: 0 }));
            await api.post('/api/complaint/submit', { text, category, ...loc });
            setSubmitted(true);
        } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.error || 'Failed to submit complaint');
        } finally { setLoading(false); }
    };

    if (submitted) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 64 }}>✅</Text>
                <Text style={styles.successTitle}>Complaint Submitted</Text>
                <Text style={styles.successSub}>Authorities have been notified. Keep safe.</Text>
                <TouchableOpacity style={styles.button} onPress={() => { setSubmitted(false); setText(''); setTranscript(''); }}>
                    <Text style={styles.buttonText}>Submit Another</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>← Back</Text></TouchableOpacity>
                <Text style={styles.headerTitle}>File a Complaint</Text>
                <View style={{ width: 60 }} />
            </View>
            <ScrollView contentContainerStyle={styles.scroll}>
                {/* Category */}
                <Text style={styles.label}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                    {CATEGORIES.map((c) => (
                        <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
                            <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Audio Recorder */}
                <Text style={styles.label}>Voice Recording</Text>
                <View style={styles.recorderCard}>
                    <TouchableOpacity style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
                        onPress={isRecording ? stopRecording : startRecording}>
                        <Text style={styles.recordIcon}>{isRecording ? '⏹️' : '🎙️'}</Text>
                        <Text style={styles.recordText}>{isRecording ? 'Tap to Stop' : 'Tap to Record'}</Text>
                    </TouchableOpacity>
                    {loading && <ActivityIndicator color="#FF3B3B" style={{ marginTop: 12 }} />}
                    {transcript ? <Text style={styles.transcriptText}>🤖 Transcript: "{transcript}"</Text> : null}
                </View>

                {/* Text Input */}
                <Text style={styles.label}>Complaint Description</Text>
                <TextInput
                    style={styles.textArea} placeholder="Describe the emergency or complaint in detail..."
                    placeholderTextColor="#555" value={text} onChangeText={setText}
                    multiline numberOfLines={6} textAlignVertical="top" />

                <TouchableOpacity style={styles.button} onPress={submitComplaint} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit Complaint</Text>}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0E1A' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, borderBottomWidth: 1, borderBottomColor: '#1A1F35' },
    back: { color: '#FF3B3B', fontSize: 16, fontWeight: '600' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
    scroll: { padding: 20, paddingBottom: 40 },
    label: { color: '#aaa', fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#151928', borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#1E2438' },
    chipActive: { backgroundColor: '#FF3B3B', borderColor: '#FF3B3B' },
    chipText: { color: '#888', fontWeight: '600' },
    chipTextActive: { color: '#fff' },
    recorderCard: { backgroundColor: '#151928', borderRadius: 16, padding: 20, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: '#1E2438' },
    recordBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E2438', padding: 14, borderRadius: 12, gap: 10 },
    recordBtnActive: { backgroundColor: '#FF3B3B33', borderWidth: 1, borderColor: '#FF3B3B' },
    recordIcon: { fontSize: 24 },
    recordText: { color: '#fff', fontWeight: '600', fontSize: 15 },
    transcriptText: { color: '#10B981', fontSize: 13, marginTop: 12, textAlign: 'center', fontStyle: 'italic' },
    textArea: { backgroundColor: '#151928', borderRadius: 14, padding: 16, color: '#fff', fontSize: 15, minHeight: 120, borderWidth: 1, borderColor: '#1E2438', marginBottom: 20 },
    button: { backgroundColor: '#FF3B3B', borderRadius: 12, padding: 16, alignItems: 'center' },
    buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    successTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginTop: 16 },
    successSub: { color: '#888', marginTop: 8, textAlign: 'center', paddingHorizontal: 40, marginBottom: 32 },
});
