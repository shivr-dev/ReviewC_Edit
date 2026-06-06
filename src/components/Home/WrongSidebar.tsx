import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n/useTranslation';
import SidePanel from '../ui/SidePanel';

export default function WrongSidebar() {
  const { wrongs, setWrongs } = useStore();
  const { t } = useTranslation();

  const clearWrongs = () => {
    if (confirm("清空本地错题记录？")) {
      setWrongs([]);
    }
  };

  return (
    <SidePanel id="wrong-sidebar" title={t('panel_wrong')} side="left">
      <div className="flex-1 overflow-y-auto mb-4 custom-scrollbar">
        {wrongs.length > 0 ? (
          wrongs.map((i, idx) => (
            <div key={idx} className="py-3 border-b border-[var(--border)] flex flex-col gap-1">
              <div className="font-semibold text-[18px] text-[var(--title)] font-serif">{i.a}</div>
              <div className="text-[13px] text-[var(--sub)]">{i.q}</div>
            </div>
          ))
        ) : (
          <div className="text-[var(--sub)] text-center p-5 text-[13px]">暂无错题记录</div>
        )}
      </div>

      <div className="flex flex-col gap-2 shrink-0">
        <button className="btn btn-outline" onClick={clearWrongs}>{t('btn_clear_wrong')}</button>
      </div>
    </SidePanel>
  );
}
