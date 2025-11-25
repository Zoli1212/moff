import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AnsweredQuestionsState {
  answeredQuestions: Set<string>;
  removedQuestions: Set<string>; // Track questions that were removed/deleted
  addAnsweredQuestion: (question: string) => void;
  addRemovedQuestion: (question: string) => void; // Add method to track removed questions
  clearAnsweredQuestions: () => void;
  clearRemovedQuestions: () => void;
  clearAll: () => void; // Clear both answered and removed
  hasAnswered: (question: string) => boolean;
  hasRemoved: (question: string) => boolean; // Check if question was removed
}

export const useAnsweredQuestionsStore = create<AnsweredQuestionsState>()(
  persist(
    (set, get) => ({
      answeredQuestions: new Set<string>(),
      removedQuestions: new Set<string>(),

      addAnsweredQuestion: (question: string) => {
        const normalized = question.toLowerCase().trim();
        set((state) => ({
          answeredQuestions: new Set([...state.answeredQuestions, normalized]),
        }));
      },

      addRemovedQuestion: (question: string) => {
        const normalized = question.toLowerCase().trim();
        set((state) => ({
          removedQuestions: new Set([...state.removedQuestions, normalized]),
        }));
      },

      clearAnsweredQuestions: () => {
        set({ answeredQuestions: new Set<string>() });
      },

      clearRemovedQuestions: () => {
        set({ removedQuestions: new Set<string>() });
      },

      clearAll: () => {
        set({
          answeredQuestions: new Set<string>(),
          removedQuestions: new Set<string>()
        });
      },

      hasAnswered: (question: string) => {
        const normalized = question.toLowerCase().trim();
        return get().answeredQuestions.has(normalized);
      },

      hasRemoved: (question: string) => {
        const normalized = question.toLowerCase().trim();
        return get().removedQuestions.has(normalized);
      },
    }),
    {
      name: "answered-questions-storage",
      // Custom storage to handle Set serialization
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const { state } = JSON.parse(str);
          return {
            state: {
              ...state,
              answeredQuestions: new Set(state.answeredQuestions || []),
              removedQuestions: new Set(state.removedQuestions || []),
            },
          };
        },
        setItem: (name, value) => {
          const str = JSON.stringify({
            state: {
              ...value.state,
              answeredQuestions: Array.from(value.state.answeredQuestions),
              removedQuestions: Array.from(value.state.removedQuestions),
            },
          });
          localStorage.setItem(name, str);
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);
