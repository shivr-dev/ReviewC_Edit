import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n/useTranslation';
import SidePanel from '@/components/ui/SidePanel';
import { ResponsiveContainer, LineChart, Line, Dot } from 'recharts';
import SetupPanel from '@/components/Home/SetupPanel';
import SettingsPanel from '@/components/Home/SettingsPanel';
import WrongSidebar from '@/components/Home/WrongSidebar';

export default function HomePage() {
  const { user } = useAuthStore();
  const { setView, openPanel, showLoader, hideLoader } = useUIStore();
  const { t } = useTranslation();
  const { all, setAll, activeSession } = useStore();

  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      showLoader('同步词库数据...');
      const { data } = await supabase.from('dictation_items').select('*');
      setAll(data || []);
      
      const histStr = localStorage.getItem(`session_history_${user.id}`);
      if (histStr) {
        setHistory(JSON.parse(histStr));
      }
      hideLoader();
    };
    fetchData();
  }, [user, setAll]);

  const accData = history.slice(-14).map(h => {
    const t = h.correct + h.wrong;
    return { name: h.date, correct: t>0?h.correct/t*100:0, wrong: t>0?h.wrong/t*100:0 };
  });

  const recent = JSON.parse(localStorage.getItem(`recent_groups_${user?.id}`) || '[]');

  return (
    <div className="w-full max-w-[480px] flex flex-col gap-[22px] px-5 py-10 relative z-10 max-h-screen overflow-y-auto w-full animate-in fade-in zoom-in-95 fill-mode-both duration-300">
      
      <div className="flex items-center justify-center gap-3 mb-1.5">
        <svg className="claude-star small text-[var(--brand)]" viewBox="0 0 200 100" fill="currentColor">
           <path d="m19.6 66.5 19.7-11 .3-1-.3-.5h-1l-3.3-.2-11.2-.3L14 53l-9.5-.5-2.4-.5L0 49l.2-1.5 2-1.3 2.9.2 6.3.5 9.5.6 6.9.4L38 49.1h1.6l.2-.7-.5-.4-.4-.4L29 41l-10.6-7-5.6-4.1-3-2-1.5-2-.6-4.2 2.7-3 3.7.3.9.2 3.7 2.9 8 6.1L37 36l1.5 1.2.6-.4.1-.3-.7-1.1L33 25l-6-10.4-2.7-4.3-.7-2.6c-.3-1-.4-2-.4-3l3-4.2L28 0l4.2.6L33.8 2l2.6 6 4.1 9.3L47 29.9l2 3.8 1 3.4.3 1h.7v-.5l.5-7.2 1-8.7 1-11.2.3-3.2 1.6-3.8 3-2L61 2.6l2 2.9-.3 1.8-1.1 7.7L59 27.1l-1.5 8.2h.9l1-1.1 4.1-5.4 6.9-8.6 3-3.5L77 13l2.3-1.8h4.3l3.1 4.7-1.4 4.9-4.4 5.6-3.7 4.7-5.3 7.1-3.2 5.7.3.4h.7l12-2.6 6.4-1.1 7.6-1.3 3.5 1.6.4 1.6-1.4 3.4-8.2 2-9.6 2-14.3 3.3-.2.1.2.3 6.4.6 2.8.2h6.8l12.6 1 3.3 2 1.9 2.7-.3 2-5.1 2.6-6.8-1.6-16-3.8-5.4-1.3h-.8v.4l4.6 4.5 8.3 7.5L89 80.1l.5 2.4-1.3 2-1.4-.2-9.2-7-3.6-3-8-6.8h-.5v.7l1.8 2.7 9.8 14.7.5 4.5-.7 1.4-2.6 1-2.7-.6-5.8-8-6-9-4.7-8.2-.5.4-2.9 30.2-1.3 1.5-3 1.2-2.5-2-1.4-3 1.4-6.2 1.6-8 1.3-6.4 1.2-7.9.7-2.6v-.2H49L43 72l-9 12.3-7.2 7.6-1.7.7-3-1.5.3-2.8L24 86l10-12.8 6-7.9 4-4.6-.1-.5h-.3L17.2 77.4l-4.7.6-2-2 .2-3 1-1 8-5.5Z" />
        </svg>
        <div className="font-serif text-[26px] font-normal text-[var(--title)] tracking-wide">{t('app_name')}</div>
      </div>

      <div className="text-center">
        <h2 className="font-serif text-[30px] font-normal mb-1.5 text-[var(--title)]">
          欢迎回来，<span id="home-username">{user?.email?.split('@')[0]}</span>
        </h2>
        <p className="text-[14px] text-[var(--sub)]">{t('welcome_sub')}</p>
      </div>

      <div className="bg-[var(--card)] rounded-[18px] p-[18px] flex justify-around text-center border border-[var(--border)] shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.04)] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] opacity-50 bg-gradient-to-r from-transparent via-[var(--brand)] to-transparent" />
        <div className="flex flex-col"><div className="text-[22px] font-semibold text-[var(--title)] font-serif">0</div><div className="text-[11px] text-[var(--sub-light)] mt-[3px]">{t('stat_streak')}</div></div>
        <div className="flex flex-col"><div className="text-[22px] font-semibold text-[var(--title)] font-serif">{all.length}</div><div className="text-[11px] text-[var(--sub-light)] mt-[3px]">{t('stat_total')}</div></div>
        <div className="flex flex-col"><div className="text-[22px] font-semibold text-[var(--title)] font-serif">0%</div><div className="text-[11px] text-[var(--sub-light)] mt-[3px]">{t('stat_acc')}</div></div>
      </div>

      <div className="bg-[var(--card)] rounded-[18px] p-[18px] pb-3.5 border border-[var(--border)] shadow-[0_4px_24px_rgba(0,0,0,0.06),0_1px_4px_rgba(0,0,0,0.04)] hidden">
        {/* Simplified space, not adding recharts for now unless requested */}
      </div>

      <div className="flex flex-col gap-2.5">
        <button className="btn btn-primary" onClick={() => openPanel('setup')}>{t('btn_start')}</button>
        {activeSession && (
          <button className="btn btn-outline" onClick={() => setView('learning')}>{t('btn_resume')}</button>
        )}
        <button className="btn btn-outline" onClick={() => setView('bank_builder')}>{t('btn_custom_bank')}</button>
        <button className="btn btn-outline" onClick={() => openPanel('settings')}>{t('btn_settings')}</button>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="text-[14px] font-medium text-[var(--sub)] tracking-wide">{t('recent_title')}</div>
        <div>
          {recent.length === 0 ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-[13px] p-3.5 text-[14px] text-[var(--sub-light)] text-center">{t('no_recent')}</div>
          ) : (
            recent.map((r: string) => (
              <div key={r} className="bg-[var(--card)] border border-[var(--border)] rounded-[13px] p-3.5 text-[14px] text-[var(--text)] mb-2 cursor-pointer hover:bg-[var(--bg2)] hover:border-[var(--brand)] hover:translate-x-px transition-all">
                → {r}
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
