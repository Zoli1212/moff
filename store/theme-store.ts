import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setTheme as saveThemeToDb } from '@/actions/theme.actions';

type Theme = 'landing' | 'corporate' | 'common';

interface ThemeState {
  theme: Theme;
  isInitialized: boolean;
  setTheme: (theme: Theme) => void;
  initializeTheme: (theme: Theme) => void;
  syncThemeWithDb: (userId: string) => Promise<void>;
}

// Initialize with default theme
const DEFAULT_THEME: Theme = 'landing';

// Map theme names to their file extensions
const THEME_EXTENSIONS: Record<Theme, string> = {
  landing: 'jpg',
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
    }
  )
);

export type { Theme };
