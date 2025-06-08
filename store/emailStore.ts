import { create } from 'zustand';

export type Email = {
  id: string;
  from?: string;
  subject?: string;
  content: string;
  attachments: string[];
};

type EmailStore = {
  emails: Email[];
  setEmails: (emails: Email[]) => void;
};

export const useEmailStore = create<EmailStore>((set) => ({
  emails: [],
  setEmails: (emails) => set({ emails }),
}));
