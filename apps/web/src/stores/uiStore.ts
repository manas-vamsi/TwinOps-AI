import { create } from "zustand";

/**
 * UI-local state (panels, palette, selection).
 * One of the five sanctioned stores — see DEVELOPMENT_RULES §6.
 */
interface UiState {
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  togglePalette: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  paletteOpen: false,
  setPaletteOpen: (open) => set({ paletteOpen: open }),
  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),
}));
