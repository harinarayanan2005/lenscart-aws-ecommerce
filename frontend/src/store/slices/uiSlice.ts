import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ThemeMode = 'light' | 'dark';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

const THEME_STORAGE_KEY = 'lenscart_theme_mode';

function getInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (saved === 'light' || saved === 'dark') {
      document.documentElement.setAttribute('data-theme', saved);
      return saved;
    }
  } catch {
    // ignore storage errors
  }
  document.documentElement.setAttribute('data-theme', 'light');
  return 'light';
}

interface UiState {
  theme: ThemeMode;
  isCartDrawerOpen: boolean;
  toasts: ToastMessage[];
}

const initialState: UiState = {
  theme: getInitialTheme(),
  isCartDrawerOpen: false,
  toasts: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      const next: ThemeMode = state.theme === 'light' ? 'dark' : 'light';
      state.theme = next;
      localStorage.setItem(THEME_STORAGE_KEY, next);
      document.documentElement.setAttribute('data-theme', next);
    },
    setTheme: (state, action: PayloadAction<ThemeMode>) => {
      state.theme = action.payload;
      localStorage.setItem(THEME_STORAGE_KEY, action.payload);
      document.documentElement.setAttribute('data-theme', action.payload);
    },
    setCartDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.isCartDrawerOpen = action.payload;
    },
    addToast: (state, action: PayloadAction<Omit<ToastMessage, 'id'>>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      state.toasts.push({ id, ...action.payload });
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const { toggleTheme, setTheme, setCartDrawerOpen, addToast, removeToast } =
  uiSlice.actions;
export default uiSlice.reducer;

