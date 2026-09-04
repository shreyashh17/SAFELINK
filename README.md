# 🛡️ SafeLink — Real-Time Emergency Help & Disaster Response System

> **Instant. Reliable. Intelligent.** Emergency communication for everyone, everywhere.

## 📁 Project Structure

```
SafeLink/
├── mobile/          # React Native (Expo) mobile app
├── backend/         # Node.js + Express REST API + WebSocket
└── dashboard/       # React.js Admin Dashboard
```

---

## 🚀 Quick Start

### 1. Backend
```bash
cd backend
cp .env.example .env          # Fill in Firebase, Twilio, OpenAI keys
npm install
npm run dev                    # Starts on http://localhost:5000
```

### 2. Mobile App
```bash
cd mobile
npm install
npx expo start                 # Scan QR with Expo Go app
```

### 3. Admin Dashboard
```bash
cd dashboard
npm install
REACT_APP_API_URL=http://localhost:5000 npm start
# Opens http://localhost:3000
```

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🚨 **SOS Button** | Large animated button with haptic feedback, 3-second alert to backend |
| 📞 **Emergency Dial** | One-tap call to Police (100), Ambulance (108), Fire (101) |
| 📍 **Live GPS** | Real-time location tracking, synced to Firebase RTDB |
| 📱 **SMS Fallback** | Twilio SMS alert when internet is unavailable |
| 🎙️ **Voice Complaint** | Record audio → auto-transcribed by OpenAI Whisper → submitted as text |
| 🤖 **AI Distress Detection** | Keywords matched on transcripts to auto-escalate alerts |
| 📡 **Geofencing** | Zone-based safety monitoring for events/concerts |
| 🎭 **Event Mode** | Contact event security room directly from within a zone |
| 🌐 **Admin Dashboard** | Live alerts, user map, complaints log, crowd density charts |
| 🔐 **Secure Auth** | JWT authentication + bcrypt password hashing |

---

## 🔑 Environment Variables (backend/.env)

```env
PORT=5000
JWT_SECRET=your_jwt_secret          # Random 64-char string

# Firebase (Admin SDK)
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...

# OpenAI (Whisper speech-to-text)
OPENAI_API_KEY=sk-...

# Twilio (SMS fallback)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1xxxxxxxxxx
ADMIN_EMERGENCY_NUMBER=+91xxxxxxxxxx
```

---

## 🏗️ Architecture

```
Mobile App (Expo)
    │  HTTPS + JWT
    ▼
Backend API (Express + Node.js)
    ├── Firebase Realtime DB  ──► Admin Dashboard (WebSocket live feed)
    ├── Firestore             ──► Persistent storage
    ├── OpenAI Whisper        ──► Audio → Text
    ├── Twilio                ──► SMS fallback
    └── FCM                   ──► Push notifications
```

---

## 🛡️ Security

- All API routes protected by JWT middleware
- Passwords hashed with bcrypt (cost 12)
- HTTPS enforced in production via Helmet.js  
- Audio files deleted from server immediately after transcription
- Admin-only routes gated by role-based access control

---

## 📦 Tech Stack

| Layer | Tech |
|-------|------|
| Mobile | React Native + Expo |
| Backend | Node.js + Express + TypeScript |
| Database | Firebase Realtime DB + Firestore |
| Auth | JWT + Firebase |
| Speech-to-Text | OpenAI Whisper API |
| SMS | Twilio |
| Push Notifications | Firebase Cloud Messaging |
| Maps | React-Leaflet (Dashboard) + expo-location (Mobile) |
| Charts | Recharts |
| Real-time | WebSocket (ws) |
