# LexAI CR — Mobile App

React Native mobile companion for the LexAI CR legal AI platform, built with Expo SDK 51 and expo-router.

## Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS) or Android Emulator, or Expo Go on a physical device

## Setup

```bash
cd mobile
npm install
```

## Environment Variables

Create a `.env` file in the `mobile/` directory:

```
EXPO_PUBLIC_API_URL=http://localhost:5000
```

Replace with your backend URL when deploying or testing on a physical device.

## Running

```bash
npm start
```

Then press:
- `i` to open in iOS Simulator
- `a` to open in Android Emulator
- Scan QR code with Expo Go on a physical device

## Project Structure

```
mobile/
├── app/              # Expo Router file-based routes
│   ├── _layout.tsx   # Root layout (providers, auth guard)
│   ├── index.tsx     # Entry redirect
│   ├── login.tsx     # Login screen
│   ├── register-firm.tsx
│   └── (tabs)/       # Bottom tab navigator
│       ├── _layout.tsx
│       ├── dashboard/
│       ├── chat/
│       ├── cases/
│       ├── documents/
│       └── settings/
├── components/       # Shared components
├── lib/              # API client, store, theme, query client
├── assets/           # Images, fonts
└── global.css        # Tailwind directives
```
