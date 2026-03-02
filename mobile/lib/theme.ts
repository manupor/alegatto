import { Platform } from "react-native";

export const colors = {
  bg: '#0c1524',
  bgSecondary: '#0f1e30',
  card: '#162032',
  cardHover: '#1c2a40',
  accent: '#10B981',
  accentDark: '#059669',
  accentSoft: 'rgba(16,185,129,0.12)',
  text: '#f0f6ff',
  textSecondary: '#94a8c0',
  muted: '#4a6070',
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.12)',
  danger: '#ef4444',
  dangerSoft: 'rgba(239,68,68,0.12)',
  warning: '#f59e0b',
  warningSoft: 'rgba(245,158,11,0.12)',
  info: '#3b82f6',
  infoSoft: 'rgba(59,130,246,0.12)',
  success: '#10B981',
  successSoft: 'rgba(16,185,129,0.12)',
  inputBg: '#0f1e30',
  tabBarBg: '#09111d',
  tabBarActive: '#10B981',
  tabBarInactive: '#3d5060',
  statusActive: '#10B981',
  statusAppeal: '#f59e0b',
  statusClosed: '#4a6070',
  statusDraft: '#3b82f6',
  statusPending: '#f59e0b',
  statusSigned: '#10B981',
  white: '#ffffff',
  overlay: 'rgba(0,0,0,0.5)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  title: 30,
  hero: 36,
} as const;

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
} as const;

export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    android: { elevation: 2 },
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.28,
      shadowRadius: 10,
    },
    android: { elevation: 6 },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
    },
    android: { elevation: 12 },
  }),
  accent: Platform.select({
    ios: {
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
    },
    android: { elevation: 8 },
  }),
} as const;
