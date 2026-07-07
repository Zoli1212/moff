import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setTheme as saveThemeToDb } from '@/actions/theme.actions';

type Theme = 'company' | 'corporate' | 'common';

interface ThemeState {
  theme: Theme;
  isInitialized: boolean;
  setTheme: (theme: Theme) => void;
  initializeTheme: (theme: Theme) => void;
  syncThemeWithDb: (userId: string) => Promise<void>;
}

// Initialize with default theme
const DEFAULT_THEME: Theme = 'corporate';

// Map theme names to their file extensions
const THEME_EXTENSIONS: Record<Theme, string> = {
  company: 'jpg',
  corporate: 'png',
  common: 'png'
};

// Get the full theme file path with extension
export const getThemeImagePath = (theme: Theme): string => {
  return `/${theme}.${THEME_EXTENSIONS[theme]}`;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: DEFAULT_THEME,
      isInitialized: false,
      setTheme: async (theme: Theme) => {
        set({ theme });
        // Try to save to database if user is logged in
        try {
          await saveThemeToDb(theme);
        } catch (error) {
          console.error('Failed to save theme to database:', error);
        }
      },
      initializeTheme: (theme: Theme) => {
        if (!get().isInitialized) {
          set({ theme, isInitialized: true });
        }
      },
      syncThemeWithDb: async (userId: string) => {
        const { theme } = get();
        try {
          await saveThemeToDb(theme);
        } catch (error) {
          console.error('Failed to sync theme with database:', error);
        }
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        isInitialized: state.isInitialized
      }),
      migrate: (persistedState: any, version: number) => {
        let state = persistedState;
        // Version 0: migrate landing -> corporate
        if (version < 1) {
          state = {
            ...state,
            theme: state.theme === 'landing' ? 'corporate' : state.theme,
          };
        }
        // Version 1: migrate any leftover landing -> company
        if (version < 2) {
          state = {
            ...state,
            theme: state.theme === 'landing' ? 'company' : state.theme,
          };
        }
        return state;
      },
      version: 2,
    }
  )
);

export type { Theme };
