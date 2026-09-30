import type { BusinessSettings } from '../types/invoice';

export interface PdfThemeStyles {
  primaryColor: string;
  accentColor: string;
  balanceBg: string;
  balanceBorder: string;
  balanceText: string;
  fontFamily: string;
  showPaymentHistory: boolean;
  showAmountInWords: boolean;
  showSignatory: boolean;
  signatoryTitle: string;
  footerSeparator: string;
  footerDisclaimer: string;
}

export const BALANCE_THEMES = {
  brown: {
    id: 'brown',
    label: 'Warm Amber Brown (Recommended)',
    bg: '#fef3c7',
    border: '#fde68a',
    text: '#78350f',
  },
  espresso: {
    id: 'espresso',
    label: 'Deep Espresso Brown',
    bg: '#fdf6ed',
    border: '#e8d5c4',
    text: '#451a03',
  },
  'soft-red': {
    id: 'soft-red',
    label: 'Soft Crimson Red',
    bg: '#fef2f2',
    border: '#fecaca',
    text: '#991b1b',
  },
  slate: {
    id: 'slate',
    label: 'Minimalist Zinc / Slate',
    bg: '#f4f4f5',
    border: '#e4e4e7',
    text: '#18181b',
  },
} as const;

export const PRIMARY_COLOR_PRESETS = [
  { label: 'Obsidian Black', value: '#09090b' },
  { label: 'Rich Espresso', value: '#451a03' },
  { label: 'Midnight Navy', value: '#0f172a' },
  { label: 'Emerald Forest', value: '#064e3b' },
  { label: 'Royal Burgundy', value: '#4c0519' },
  { label: 'Slate Indigo', value: '#312e81' },
];

export const FONT_PRESETS = [
  { label: 'Plus Jakarta Sans (Modern Clean)', value: 'Plus Jakarta Sans', css: "'Plus Jakarta Sans', sans-serif" },
  { label: 'Inter (Crisp Corporate)', value: 'Inter', css: "'Inter', sans-serif" },
  { label: 'Outfit (Contemporary)', value: 'Outfit', css: "'Outfit', sans-serif" },
  { label: 'Playfair Display (Editorial / Serif)', value: 'Playfair', css: "'Playfair Display', Georgia, serif" },
  { label: 'Roboto (Standard)', value: 'Roboto', css: "'Roboto', sans-serif" },
];

export const getPdfTheme = (settings?: Partial<BusinessSettings>): PdfThemeStyles => {
  const primaryColor = settings?.pdfPrimaryColor || '#09090b';
  const accentColor = settings?.pdfAccentColor || primaryColor;
  const themeKey = (settings?.pdfBalanceTheme && BALANCE_THEMES[settings.pdfBalanceTheme]) 
    ? settings.pdfBalanceTheme 
    : 'brown';
  
  const theme = BALANCE_THEMES[themeKey];

  const fontPreset = FONT_PRESETS.find((f) => f.value === settings?.pdfFontFamily);
  const fontFamily = fontPreset ? fontPreset.css : "'Plus Jakarta Sans', sans-serif";

  return {
    primaryColor,
    accentColor,
    balanceBg: theme.bg,
    balanceBorder: theme.border,
    balanceText: theme.text,
    fontFamily,
    showPaymentHistory: settings?.pdfShowPaymentHistory !== false,
    showAmountInWords: settings?.pdfShowAmountInWords !== false,
    showSignatory: settings?.pdfShowSignatory !== false,
    signatoryTitle: settings?.pdfSignatoryTitle?.trim() || 'AUTHORISED SIGNATORY',
    footerSeparator: settings?.pdfFooterSeparator || '|',
    footerDisclaimer: settings?.pdfFooterDisclaimer?.trim() || '',
  };
};
