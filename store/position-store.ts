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
  offers: { x: 30, y: 40 },
  jobs: { x: 70, y: 40 },
  billings: { x: 50, y: 70 }
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
