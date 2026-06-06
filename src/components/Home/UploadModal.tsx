import React, { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { useTranslation } from '@/i18n/useTranslation';
import SidePanel from '../ui/SidePanel';
import { supabase } from '@/lib/supabase';
import { toast } from '@/store/useToastStore';

export default function UploadModal() {
  const { user } = useAuthStore();
  const { openPanel, showLoader, hideLoader } = useUIStore();
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [coverBase64, setCoverBase64] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [fileName, setFileName] = useState('点击选取图片');

  const handleLocalImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if(!ctx) return;
        let w = img.width, h = img.height;
        if (w > h && w > 500) { h *= 500 / w; w = 500; }
        else if (h > 500) { w *= 500 / h; h = 500; }
        canvas.width = w; canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        setCoverBase64(canvas.toDataURL('image/jpeg', 0.8));
        setFileName(`已选择: ${file.name}`);
      };
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const submitResource = async () => {
    if (!title.trim() || !jsonText.trim()) return toast("标题和 JSON 数据为必填项！");
    let jsonData = [];
    try { 
      jsonData = JSON.parse(jsonText.trim()); 
      if (!Array.isArray(jsonData)) throw new Error("JSON 必须是数组格式"); 
    } catch (e: any) { 
      return toast("JSON 格式有误: " + e.message, "error"); 
    }
    
    if(!user) return toast("未登录", "error");

    showLoader("上传中...");
    try {
      const { error } = await supabase.from('resource_center').insert({ 
        title: title.trim(), 
        description: desc.trim(), 
        cover_url: coverBase64, 
        json_data: jsonData, 
        uploader_id: user.id, 
        uploader_email: user.email 
      });
      if (error) throw error;
      toast("发布成功", "success");
      setTitle(''); setDesc(''); setJsonText(''); setCoverBase64(''); setFileName('点击选取图片');
      openPanel('resource-center');
    } catch (e: any) { 
      toast("发布失败: " + e.message, "error"); 
    } finally {
      hideLoader();
    }
  };

  return (
    <SidePanel id="upload-modal" title={t('panel_upload')}>
      <div className="flex flex-col gap-4 overflow-y-auto pb-6 pr-1 custom-scrollbar">
        <div>
          <label className="set-label">{t('label_rc_title')}</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="例如：人教版九年级语文下册" />
        </div>

        <div>
          <label className="set-label">{t('label_rc_desc')}</label>
          <textarea rows={2} value={desc} onChange={e => setDesc(e.target.value)} placeholder="简单介绍一下..." />
        </div>

        <div>
          <label className="set-label">{t('label_rc_cover')}</label>
          <div className="relative overflow-hidden w-full mb-3 group">
            <input type="file" accept="image/*" className="absolute left-0 top-0 opacity-0 cursor-pointer h-full w-full z-10" onChange={handleLocalImage} />
            <div className="w-full p-[13px] bg-[var(--bg)] border border-dashed border-[var(--border)] rounded-[11px] text-[var(--sub)] text-[13px] text-center pointer-events-none transition-colors group-hover:border-[var(--brand)] group-hover:text-[var(--brand)]">
              {fileName}
            </div>
          </div>
        </div>

        <div>
          <label className="set-label">{t('label_rc_json')}</label>
          <textarea rows={4} value={jsonText} onChange={e => setJsonText(e.target.value)} placeholder="粘贴 JSON 数组..." />
        </div>

        <button className="btn btn-primary w-full mt-2" onClick={submitResource}>{t('btn_publish')}</button>
      </div>
    </SidePanel>
  );
}
