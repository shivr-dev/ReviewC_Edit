import { create } from 'zustand';
import { DictationItem } from '../types';

type ActiveSession = {
  pool: DictationItem[];
  current: DictationItem | null;
  sCorrect: number;
  sWrong: number;
  qTimeLeft: number;
  isIntenseMode: boolean;
  sessionStreak: number;
};

type StoreState = {
  lang: string;
  setLang: (lang: string) => void;
  
  all: DictationItem[];
  filtered: DictationItem[];
  wrongs: DictationItem[];
  setAll: (all: DictationItem[]) => void;
  setFiltered: (filtered: DictationItem[]) => void;
  setWrongs: (wrongs: DictationItem[]) => void;
  
  useSpacedRepetition: boolean;
  setUseSpacedRepetition: (val: boolean) => void;
  
  masteryThreshold: number;
  setMasteryThreshold: (val: number) => void;
  
  activeSession: ActiveSession | null;
  setActiveSession: (session: ActiveSession | null) => void;
  
  isIntenseMode: boolean;
  setIsIntenseMode: (val: boolean) => void;

  questionFilter: string;
  setQuestionFilter: (val: string) => void;

  intenseTime: number;
  setIntenseTime: (val: number) => void;

  allowDblClickClear: boolean;
  setAllowDblClickClear: (val: boolean) => void;

  bgmEnabled: boolean;
  setBgmEnabled: (val: boolean) => void;
};

export const useStore = create<StoreState>((set) => ({
  lang: localStorage.getItem('lang') || 'zh-CN',
  setLang: (lang) => {
    localStorage.setItem('lang', lang);
    set({ lang });
  },
  
  all: [],
  filtered: [],
  wrongs: [],
  setAll: (all) => set({ all }),
  setFiltered: (filtered) => set({ filtered }),
  setWrongs: (wrongs) => set({ wrongs }),
  
  useSpacedRepetition: localStorage.getItem('use_sr') !== 'false',
  setUseSpacedRepetition: (useSpacedRepetition) => {
    localStorage.setItem('use_sr', useSpacedRepetition.toString());
    set({ useSpacedRepetition });
  },
  
  masteryThreshold: parseInt(localStorage.getItem('mastery_thresh') || '5'),
  setMasteryThreshold: (masteryThreshold) => {
    localStorage.setItem('mastery_thresh', masteryThreshold.toString());
    set({ masteryThreshold });
  },
  
  activeSession: JSON.parse(localStorage.getItem('active_session') || 'null'),
  setActiveSession: (activeSession) => {
    if (activeSession) {
      localStorage.setItem('active_session', JSON.stringify(activeSession));
    } else {
      localStorage.removeItem('active_session');
    }
    set({ activeSession });
  },
  
  isIntenseMode: false,
  setIsIntenseMode: (isIntenseMode) => set({ isIntenseMode }),

  questionFilter: 'all',
  setQuestionFilter: (questionFilter) => set({ questionFilter }),

  intenseTime: parseInt(localStorage.getItem('intense_time') || '8'),
  setIntenseTime: (intenseTime) => {
    localStorage.setItem('intense_time', intenseTime.toString());
    set({ intenseTime });
  },

  allowDblClickClear: localStorage.getItem('allow_dblclick') !== 'false',
  setAllowDblClickClear: (allowDblClickClear) => {
    localStorage.setItem('allow_dblclick', allowDblClickClear.toString());
    set({ allowDblClickClear });
  },

  bgmEnabled: localStorage.getItem('bgm_enabled') !== 'false',
  setBgmEnabled: (bgmEnabled) => {
    localStorage.setItem('bgm_enabled', bgmEnabled.toString());
    set({ bgmEnabled });
  }
}));

