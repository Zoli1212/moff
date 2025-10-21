import { create } from 'zustand';

interface Position {
  x: number;
  y: number;
}

interface PositionsState {
  positions: Record<string, Position>;
  updatePosition: (id: string, x: number, y: number) => void;
  resetPositions: () => void;
}
const defaultPositions = {
  offers: { x: 30, y: 68 },
  jobs: { x: 50, y: 76 },
  billings: { x: 70, y: 68 }
};

export const usePositionStore = create<PositionsState>((set) => ({
  positions: { ...defaultPositions },
  
  updatePosition: (id, x, y) => 
    set((state) => ({
      positions: {
        ...state.positions,
        [id]: { x, y },
      },
    })),
    
  resetPositions: () => set({ positions: { ...defaultPositions } }),
}));
