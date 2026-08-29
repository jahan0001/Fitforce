const colors = {
  light: {
    text: '#1A1A1A',
    tint: '#1B5E3B',

    background: '#F4F5F0',
    foreground: '#1A1A1A',

    card: '#FFFFFF',
    cardForeground: '#1A1A1A',

    primary: '#1B5E3B',
    primaryForeground: '#FFFFFF',

    secondary: '#E8EDE5',
    secondaryForeground: '#2D4A3A',

    muted: '#EEF0EB',
    mutedForeground: '#6B7A6D',

    accent: '#C5A028',
    accentForeground: '#1A1A1A',

    destructive: '#C62828',
    destructiveForeground: '#FFFFFF',

    success: '#2E7D32',
    successForeground: '#FFFFFF',

    warning: '#E65100',
    warningForeground: '#FFFFFF',

    border: '#D5D9D0',
    input: '#D5D9D0',

    roleColors: {
      co: '#1B3A4B',
      '2ic': '#1B5E3B',
      coy_comd: '#4A1B5E',
      adjutant: '#5E3A1B',
      clerk: '#1B4A5E',
      soldier: '#2E5E1B',
    } as Record<string, string>,
  },

  dark: {
    text: '#ECEEE9',
    tint: '#4CAF70',

    background: '#0D1810',
    foreground: '#ECEEE9',

    card: '#1A2D1E',
    cardForeground: '#ECEEE9',

    primary: '#4CAF70',
    primaryForeground: '#0D1810',

    secondary: '#1E3025',
    secondaryForeground: '#B8D4BE',

    muted: '#1E3025',
    mutedForeground: '#8AA890',

    accent: '#D4A830',
    accentForeground: '#0D1810',

    destructive: '#EF5350',
    destructiveForeground: '#FFFFFF',

    success: '#66BB6A',
    successForeground: '#0D1810',

    warning: '#FF7043',
    warningForeground: '#FFFFFF',

    border: '#2A4030',
    input: '#2A4030',

    roleColors: {
      co: '#3A7A9C',
      '2ic': '#4CAF70',
      coy_comd: '#9C5ABF',
      adjutant: '#BF8A5A',
      clerk: '#5A9CBF',
      soldier: '#6ABF4C',
    } as Record<string, string>,
  },

  radius: 10,
};

export default colors;
