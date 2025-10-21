import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  isTenant: boolean;
  isLoading: boolean;
  userEmail: string | null; // Email a cache érvényesség ellenőrzéséhez
  setUserData: (isTenant: boolean, userEmail: string) => void;
  setLoading: (isLoading: boolean) => void;
  clearUserData: () => void;
  shouldRefetch: (currentUserEmail: string | null) => boolean;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      isTenant: true,
      isLoading: false, // NE legyen loading alapból, hogy gyors legyen a UI
      userEmail: null,
      
      setUserData: (isTenant: boolean, userEmail: string) => {
        set({ isTenant, isLoading: false, userEmail });
      },
      
      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },
      
      clearUserData: () => {
        // KRITIKUS: Teljes törlés kijelentkezéskor
        set({ isTenant: true, isLoading: false, userEmail: null });
      },
      
      // Csak akkor frissítsen, ha megváltozott a felhasználó
      shouldRefetch: (currentUserEmail: string | null) => {
        const { userEmail } = get();
        // Ha nincs email a store-ban, vagy megváltozott a user, akkor frissítsen
        return !userEmail || userEmail !== currentUserEmail;
      },
    }),
    {
      name: 'user-storage',
    }
  )
);
