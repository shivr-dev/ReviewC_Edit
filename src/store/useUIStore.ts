import { create } from 'zustand';

type ViewState = 'auth' | 'home' | 'learning' | 'bank_builder';

type UIStoreState = {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  loader: { show: boolean; text: string };
  showLoader: (text?: string) => void;
  hideLoader: () => void;
  activePanel: string | null;
  openPanel: (panelId: string) => void;
  closePanels: () => void;
};

export const useUIStore = create<UIStoreState>((set) => ({
  currentView: 'auth',
  setView: (currentView) => set({ currentView }),
  loader: { show: false, text: '载入中…' },
  showLoader: (text = '载入中…') => set({ loader: { show: true, text } }),
  hideLoader: () => set({ loader: { show: false, text: '' } }),
  activePanel: null,
  openPanel: (panelId) => set({ activePanel: panelId }),
  closePanels: () => set({ activePanel: null }),
}));
