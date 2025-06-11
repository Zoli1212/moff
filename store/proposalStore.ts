// stores/proposalStore.ts
import { create } from 'zustand';
import { Proposal } from '@/types/proposal'; // vagy ahonnan exportálod

interface ProposalState {
  proposal: Proposal | null;
  setProposal: (proposal: Proposal) => void;
  clearProposal: () => void;
}

export const useProposalStore = create<ProposalState>((set) => ({
  proposal: null,
  setProposal: (proposal) => set({ proposal }),
  clearProposal: () => set({ proposal: null }),
}));
