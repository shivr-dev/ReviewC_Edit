import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { useTranslation } from '@/i18n/useTranslation';
import SidePanel from '../ui/SidePanel';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/store/useToastStore';
import { ResourceShare } from '@/types';
import { Download, Trash2 } from 'lucide-react';

export default function ResourceCenterPanel() {
  const { user, isAdmin } = useAuthStore();
  const { openPanel, activePanel, showLoader, hideLoader } = useUIStore();
  const { t } = useTranslation();
  const { all, setAll } = useStore();

  const [resources, setResources] = useState<ResourceShare[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activePanel === 'resource-center') {
      fetchResources();
    }
  }, [activePanel]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('resource_center').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setResources(data || []);
    } catch (e: any) {
      toast("连接失败: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const downloadResource = async (res: ResourceShare) => {
    const groupName = prompt(`将【${res.title}】下载到本地分组：`, res.title);
    if (!groupName) return;

    showLoader("合并中...");
    try {
      const dataToInsert = res.json_data.map(item => { 
        const ci = { ...item, group_name: groupName, user_id: user?.id };
        delete ci.id;
        return ci; 
      });
      const { error } = await supabase.from('dictation_items').insert(dataToInsert);
      if (error) throw error;
      toast(`成功导入 ${dataToInsert.length} 个词条！`, "success");
      
      const { data } = await supabase.from('dictation_items').select('*');
      setAll(data || []);
    } catch (e: any) {
      toast("下载失败：" + e.message, "error");
    } finally {
      hideLoader();
    }
  };

  const deleteResource = async (id: string) => {
    if (!confirm("确定要删除这个分享吗？")) return;
    showLoader("删除中...");
    try {
      const { error } = await supabase.from('resource_center').delete().eq('id', id);
      if (error) throw error;
      fetchResources();
    } catch (e: any) {
      toast("删除失败: " + e.message, "error");
    } finally {
      hideLoader();
    }
  };

  const localGroups = Array.from(new Set(all.map(i => i.group_name || '默认分组')));

  return (
    <SidePanel id="resource-center" title={t('panel_rc')}>
      <button className="btn btn-primary w-full mb-4 shrink-0 shadow-sm" onClick={() => openPanel('upload-modal')}>
        {t('btn_share')}
      </button>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 overflow-y-auto pb-4 custom-scrollbar pr-1">
        {loading ? (
          <p className="text-[var(--sub)] text-sm col-span-2 text-center py-4">读取中...</p>
        ) : resources.length === 0 ? (
          <p className="text-[var(--sub)] text-sm col-span-2 text-center py-4">暂无资源分享</p>
        ) : (
          resources.map(res => {
            const canDelete = user && (res.uploader_id === user.id || isAdmin);
            let displayAuthor = res.uploader_email.endsWith('@yanye.local') ? res.uploader_email.replace('@yanye.local', '') : res.uploader_email.split('@')[0];
            if (res.uploader_email === 'admin@yanye.com') displayAuthor = '官方';

            const isDownloaded = localGroups.includes(res.title);

            return (
              <div key={res.id} className="bg-[var(--card)] rounded-[14px] border border-[var(--border)] overflow-hidden flex flex-col transition-shadow hover:shadow-md">
                {res.cover_url && res.cover_url.length > 20 ? (
                   <img src={res.cover_url} className="w-full h-[90px] object-cover border-b border-[var(--bg)]" alt="cover"/>
                ) : (
                   <div className="w-full h-[90px] bg-[var(--bg2)] flex items-center justify-center text-lg tracking-widest text-[var(--sub)] border-b border-[var(--border)] font-sans">DOC</div>
                )}
                
                <div className="p-3 flex-1 flex flex-col">
                  <h4 className="font-medium text-sm m-0 mb-1 text-[var(--title)] font-serif break-words line-clamp-2">{res.title}</h4>
                  <div className="text-[11px] text-[var(--sub-light)] mb-2">{displayAuthor}</div>
                  <p className="text-xs text-[var(--sub)] m-0 mb-2 leading-relaxed line-clamp-2 font-sans flex-1" title={res.description}>{res.description || '暂无简介'}</p>
                </div>
                
                <div className="flex gap-2 p-0 px-3 pb-3">
                  {isDownloaded ? (
                    <button className="btn btn-outline flex-1 !p-[7px] text-xs opacity-50" disabled>已下载</button>
                  ) : (
                    <button className="btn btn-primary flex-1 !p-[7px] text-xs flex justify-center items-center gap-1 shadow-none" onClick={() => downloadResource(res)}><Download size={12}/>下载</button>
                  )}
                  {canDelete && (
                    <button className="btn btn-outline text-red-500 border-red-200 hover:bg-red-50 !p-[7px]" onClick={() => deleteResource(res.id)}>
                      <Trash2 size={12}/>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </SidePanel>
  );
}
