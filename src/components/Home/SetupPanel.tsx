import { useStore } from '@/store/useStore';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useTranslation } from '@/i18n/useTranslation';
import SidePanel from '@/components/ui/SidePanel';
import { supabase } from '@/lib/supabase';
import { toast } from '@/store/useToastStore';
import { getItemStats } from '@/lib/spacedRepetition';
import CustomSelect from '@/components/ui/CustomSelect';
import { useState } from 'react';

export default function SetupPanel() {
  const { 
    all, setFiltered, activeSession, setActiveSession,
    useSpacedRepetition, setUseSpacedRepetition,
    masteryThreshold, setMasteryThreshold,
    questionFilter, setQuestionFilter, setAll,
    wrongs
  } = useStore();
  
  const { setView, closePanels, openPanel, showLoader, hideLoader } = useUIStore();
  const { user } = useAuthStore();
  const { t } = useTranslation();

  const [importGroup, setImportGroup] = useState('默认分组');
  const [importJson, setImportJson] = useState('');

  const groups = Array.from(new Set(all.map(i => i.group_name || '默认分组')));

  const startNewLearning = () => {
    // Collect selected groups
    const cbs = document.querySelectorAll('.group-cb') as NodeListOf<HTMLInputElement>;
    const selected = Array.from(cbs).filter(cb => cb.checked).map(cb => cb.value);
    
    let base = selected.length > 0 ? all.filter(i => selected.includes(i.group_name || '默认分组')) : [];
    
    if (useSpacedRepetition && questionFilter === 'all') {
      base = base.filter(item => {
        const s = getItemStats(user?.id || 'guest', item);
        if (s.consecutive_correct >= masteryThreshold && s.last_seen) {
          const days = (Date.now() - s.last_seen) / (1000 * 60 * 60 * 24);
          if (days < 1) return false;
        }
        return true;
      });
    }

    let finalFiltered = base;
    if (questionFilter === 'wrong') finalFiltered = wrongs;
    else if (questionFilter === 'sr_hard') finalFiltered = base.filter(i => { const s = getItemStats(user?.id || 'guest', i); return s.memory_weight > 150 && s.consecutive_correct < masteryThreshold; });
    else if (questionFilter === 'sr_mastered') finalFiltered = base.filter(i => getItemStats(user?.id || 'guest', i).consecutive_correct >= masteryThreshold);
    else if (questionFilter === 'poem') finalFiltered = base.filter(i => /(诗|句)/.test(i.cat || ''));
    else if (questionFilter === 'note') finalFiltered = base.filter(i => /(注|释|文)/.test(i.cat || ''));
    else if (questionFilter === 'word') finalFiltered = base.filter(i => !/(诗|句|注|释|文)/.test(i.cat || ''));
    
    setFiltered(finalFiltered);
    setActiveSession(null); 
    closePanels();
    setView('learning');
  };

  const saveProgress = () => {
    if(!activeSession) return;
    localStorage.setItem('active_session', JSON.stringify(activeSession));
    closePanels();
    toast('进度已保存', 'success');
  };

  const deleteLocalGroups = async () => {
    const cbs = document.querySelectorAll('.group-cb') as NodeListOf<HTMLInputElement>;
    const selected = Array.from(cbs).filter(cb => cb.checked).map(cb => cb.value);
    if(selected.length === 0) return toast("请先勾选要删除的词库");
    if(!confirm(`确定要彻底删除以下 ${selected.length} 个词库吗？`)) return;
    
    if(!user) return;
    showLoader("清理中...");
    try {
      const { error } = await supabase.from('dictation_items').delete().eq('user_id', user.id).in('group_name', selected);
      if (error) throw error;
      const { data } = await supabase.from('dictation_items').select('*');
      setAll(data || []);
      toast("删除成功", "success");
    } catch(e:any) {
      toast("删除失败: " + e.message, "error");
    } finally {
      hideLoader();
    }
  };

  const handleImport = async (mode: 'merge'|'cover') => {
    if(!importJson.trim()) return toast("请粘贴 JSON");
    try {
      const data = JSON.parse(importJson).map((item:any) => ({ ...item, group_name: importGroup || '默认分组', user_id: user?.id }));
      if (mode === 'cover') {
        if (!confirm("确定清空云端该分组所有词条并覆盖？")) return;
        await supabase.from('dictation_items').delete().eq('user_id', user?.id).eq('group_name', importGroup || '默认分组');
      }
      showLoader("数据写入中...");
      await supabase.from('dictation_items').insert(data);
      toast("同步成功", "success");
      setImportJson('');
      
      const { data: updated } = await supabase.from('dictation_items').select('*');
      setAll(updated || []);
    } catch (e: any) {
      toast("失败: " + e.message, "error");
    } finally {
      hideLoader();
    }
  };

  const resetAllSRStats = () => {
    if(!confirm('确定要清空记忆数据？')) return;
    localStorage.removeItem(`mem_stats_${user?.id}`);
    toast('数据已归零', 'success');
  };

  let mastered = 0, hard = 0, learning = 0;
  if(useSpacedRepetition) {
    all.forEach(item => {
      const s = getItemStats(user?.id || 'guest', item);
      if (s.consecutive_correct >= masteryThreshold) mastered++;
      else if (s.memory_weight > 150) hard++;
      else learning++;
    });
  }

  return (
    <SidePanel id="setup" title={t('panel_setup')}>
      
      <button className="btn btn-outline w-full mb-5 shadow-sm" onClick={() => openPanel('resource-center')}>
        {t('btn_resource')}
      </button>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-[15px] p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-[14px] text-[var(--title)] font-serif">{t('sr_title')}</span>
          <label className="relative inline-block w-[44px] h-[24px]">
            <input type="checkbox" className="opacity-0 w-0 h-0 peer" checked={useSpacedRepetition} onChange={e => setUseSpacedRepetition(e.target.checked)}/>
            <span className="absolute cursor-pointer inset-0 bg-[var(--border)] rounded-full transition-all peer-checked:bg-[var(--brand)] before:absolute before:h-[18px] before:w-[18px] before:left-[3px] before:bottom-[3px] before:bg-white before:rounded-full before:transition-all before:shadow shadow-sm peer-checked:before:translate-x-[20px]" />
          </label>
        </div>
        <p className="text-[12px] text-[var(--sub)] leading-relaxed mb-3 font-sans">{t('sr_desc')}</p>
        <label className="set-label">{t('mastery_thresh')}</label>
        <CustomSelect 
          value={masteryThreshold} 
          onChange={val => setMasteryThreshold(parseInt(val))}
          options={[
            { value: '3', label: '3 次连续正确' },
            { value: '5', label: '5 次连续正确' },
            { value: '8', label: '8 次连续正确' }
          ]}
        />
        {useSpacedRepetition && (
          <div className="flex justify-between text-xs mt-2 text-[var(--sub)] mb-2 font-sans px-1">
            <span>掌握: <b className="text-[var(--text)] font-medium">{mastered}</b></span>
            <span>学习: <b className="text-[var(--text)] font-medium">{learning}</b></span>
            <span>强化: <b className="text-[var(--title)] font-medium text-[var(--color-red)]">{hard}</b></span>
          </div>
        )}
        <button onClick={resetAllSRStats} className="w-full p-2 bg-transparent text-[var(--sub)] border-none text-xs mt-1 underline cursor-pointer hover:text-[var(--title)] font-sans">
          清空所有记忆数据
        </button>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        <label className="set-label">{t('label_groups')}</label>
        <div className="flex gap-2">
           <button className="px-3 py-1 bg-[var(--card)] border border-[var(--border)] rounded-md text-xs cursor-pointer hover:bg-[var(--bg2)] transition-colors" onClick={() => {
             document.querySelectorAll('.group-cb').forEach(cb => (cb as HTMLInputElement).checked = true);
           }}>{t('btn_all')}</button>
           <button className="px-3 py-1 bg-[var(--card)] border border-[var(--border)] rounded-md text-xs cursor-pointer hover:bg-[var(--bg2)] transition-colors" onClick={() => {
             document.querySelectorAll('.group-cb').forEach(cb => (cb as HTMLInputElement).checked = false);
           }}>{t('btn_none')}</button>
        </div>
        <div className="bg-[var(--bg)] border border-[var(--border)] rounded-xl p-1.5 max-h-[200px] overflow-y-auto mb-1">
          {groups.length === 0 ? <p className="text-[13px] text-center text-[var(--sub)] py-2 m-0">无可选用词库</p> : groups.map(g => (
            <label key={g} className="flex items-center p-2.5 rounded-lg cursor-pointer hover:bg-[var(--card)] transition-colors">
              <div className="relative flex items-center mr-3">
                 <input type="checkbox" value={g} className="group-cb opacity-0 absolute inset-0 w-full h-full cursor-pointer peer" defaultChecked />
                 <div className="w-[18px] h-[18px] border-[1.5px] border-[var(--border)] rounded-[5px] flex items-center justify-center transition-all peer-checked:bg-[var(--brand)] peer-checked:border-[var(--brand)]">
                   <div className="w-1 h-2 border-r-2 border-b-2 border-white rotate-45 mb-0.5 opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                 </div>
              </div>
              <span className="text-[14px] text-[var(--text)] flex-1">{g}</span>
            </label>
          ))}
        </div>
        <button onClick={deleteLocalGroups} className="w-full p-[9px] border border-[var(--border)] bg-transparent text-[var(--sub)] rounded-[10px] text-[13px] mb-3 cursor-pointer hover:bg-[var(--bg)] transition-colors">
          删除选中的词库
        </button>
      </div>

      <div className="mb-6">
        <label className="set-label">{t('label_mode')}</label>
        <CustomSelect 
          value={questionFilter}
          onChange={val => setQuestionFilter(val)}
          options={[
            { value: 'all', label: '随机全部' },
            { value: 'wrong', label: '仅限错题本' },
            { value: 'sr_hard', label: '仅待强化' },
            { value: 'sr_mastered', label: '仅已掌握词条' },
            { value: 'word', label: '仅单纯字词' },
            { value: 'note', label: '仅文言注释' },
            { value: 'poem', label: '仅古诗长句' }
          ]}
        />
      </div>

      <div className="mb-6">
        <label className="set-label">{t('label_import')}</label>
        <p className="text-[11px] text-[var(--sub)] m-0 mb-2 leading-relaxed">JSON: <code>[{"{"}"q":"题","a":"答","cat":"类"{"}"}]</code></p>
        <input type="text" value={importGroup} onChange={e=>setImportGroup(e.target.value)} placeholder="输入分组名，如：期中考试词汇" className="!p-3 !text-sm mb-2" />
        <textarea rows={4} value={importJson} onChange={e=>setImportJson(e.target.value)} placeholder="粘贴 JSON 数组..." className="!p-3 !text-sm mb-2 font-mono text-xs" />
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => handleImport('merge')} className="btn btn-outline !p-2 !rounded-xl text-[13px]">增量合并</button>
          <button onClick={() => handleImport('cover')} className="btn btn-primary !p-2 !rounded-xl text-[13px] !shadow-none">清空覆盖</button>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 pb-6 shrink-0 border-t border-[var(--border)] pt-4">
        {activeSession && (
          <button className="btn btn-outline w-full" onClick={saveProgress}>{t('save_progress')}</button>
        )}
        <button className="btn btn-primary w-full shadow-lg" onClick={startNewLearning}>{t('btn_begin')}</button>
      </div>

    </SidePanel>
  );
}

