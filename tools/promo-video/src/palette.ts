import { staticFile } from 'remotion';

export const FONT_FAMILY = 'AtomIQIntern, -apple-system, BlinkMacSystemFont, sans-serif';

export const FONT_CSS = `
@font-face {
  font-family: 'AtomIQIntern';
  src: url('${staticFile('fonts/Intern-Variable.ttf')}') format('truetype');
  font-weight: 100 900;
  font-style: normal;
  font-display: block;
}
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
`;

export interface ThemePalette {
  bgTop: string;
  bgBottom: string;
  lip: string;
  motifColor: string;
  accent: string;
  accentLip: string;
  textShadow: string;
  subColor: string;
}

export const THEMES: Record<'gold' | 'blue' | 'green' | 'coral' | 'purple' | 'teal', ThemePalette> = {
  gold: {
    bgTop: '#FFD245',
    bgBottom: '#F5B318',
    lip: '#C88908',
    motifColor: '#FFFFFF',
    accent: '#FFFFFF',
    accentLip: '#D9981A',
    textShadow: '0 7px 0 rgba(160, 102, 0, 0.42)',
    subColor: 'rgba(255, 255, 255, 0.96)',
  },
  blue: {
    bgTop: '#24BEFF',
    bgBottom: '#109EE6',
    lip: '#0B77B5',
    motifColor: '#FFFFFF',
    accent: '#FABF24',
    accentLip: '#D9981A',
    textShadow: '0 7px 0 rgba(9, 89, 140, 0.38)',
    subColor: 'rgba(255, 255, 255, 0.94)',
  },
  green: {
    bgTop: '#67D80A',
    bgBottom: '#4BB800',
    lip: '#378C00',
    motifColor: '#FFFFFF',
    accent: '#FABF24',
    accentLip: '#D9981A',
    textShadow: '0 7px 0 rgba(36, 104, 0, 0.40)',
    subColor: 'rgba(255, 255, 255, 0.95)',
  },
  coral: {
    bgTop: '#FF8C42',
    bgBottom: '#F5641E',
    lip: '#C2460B',
    motifColor: '#FFFFFF',
    accent: '#58CC02',
    accentLip: '#46A302',
    textShadow: '0 7px 0 rgba(154, 46, 0, 0.38)',
    subColor: 'rgba(255, 255, 255, 0.95)',
  },
  purple: {
    bgTop: '#A07AE0',
    bgBottom: '#7E54C4',
    lip: '#5B3798',
    motifColor: '#FFFFFF',
    accent: '#FABF24',
    accentLip: '#D9981A',
    textShadow: '0 7px 0 rgba(67, 36, 122, 0.42)',
    subColor: 'rgba(255, 255, 255, 0.94)',
  },
  teal: {
    bgTop: '#22C9B6',
    bgBottom: '#0FA394',
    lip: '#0B7A6F',
    motifColor: '#FFFFFF',
    accent: '#FABF24',
    accentLip: '#D9981A',
    textShadow: '0 7px 0 rgba(6, 92, 83, 0.40)',
    subColor: 'rgba(255, 255, 255, 0.95)',
  },
};

export const UI = {
  ink: '#2B2B2B',
  inkSoft: '#5A5A5A',
  inkMuted: '#7B7B7B',
  surface: '#FFFFFF',
  surfaceAlt: '#F7F8FA',
  border: '#E5E7EB',
  borderLip: '#D1D5DB',
  gold: '#FABF24',
  goldLip: '#D9981A',
  green: '#58CC02',
  greenLip: '#46A302',
  greenBg: '#EBFBD8',
  blue: '#1CB0F6',
  blueLip: '#1899D6',
  blueBg: '#E6F7FF',
  coral: '#FF7A2F',
  coralLip: '#D95D17',
  coralBg: '#FFF1E8',
  purple: '#9069CD',
  purpleLip: '#6F4EA1',
  red: '#FF4B4B',
  redLip: '#D93B3B',
  skyShop: '#DCF3FF',
} as const;
