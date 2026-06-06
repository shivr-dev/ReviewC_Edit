import { useStore } from '../store/useStore';
import { TRANSLATIONS } from './translations';

export function useTranslation() {
  const lang = useStore((state) => state.lang);
  
  const t = (key: string) => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['zh-CN']?.[key] || key;
  };
  
  return { t, lang };
}
