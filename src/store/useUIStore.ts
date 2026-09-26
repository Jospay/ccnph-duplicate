import { create } from "zustand";

interface UIStore {
  comingSoonVisible: boolean;
  setComingSoonVisible: (visible: boolean) => void;
  handleComingSoon: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  comingSoonVisible: false,
  setComingSoonVisible: (visible: boolean) =>
    set({ comingSoonVisible: visible }),
  handleComingSoon: () => set({ comingSoonVisible: true }),
}));
