import { useStore } from '@/store/useStore';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useTranslation } from '@/i18n/useTranslation';
import SidePanel from '../ui/SidePanel';
import { supabase } from '@/lib/supabase';
import { toast } from '@/store/useToastStore';
import { useState, useEffect } from 'react';
import CustomSelect from '@/components/ui/CustomSelect';

export default function SettingsPanel() {
  const { 
    lang, setLang, 
    bgmEnabled, setBgmEnabled, 
    allowDblClickClear, setAllowDblClickClear,
    intenseTime, setIntenseTime 
  } = useStore();
  const { user, isAdmin, logout } = useAuthStore();
  const { t } = useTranslation();
  const { activePanel } = useUIStore();

  const [codes, setCodes] = useState<any[]>([]);

  useEffect(() => {
    if (activePanel === 'settings' && isAdmin) {
      fetchInviteCodesAdmin();
    }
  }, [activePanel, isAdmin]);

  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };

  const handleDeleteAccount = async () => {
    if (!confirm("确定要注销账号并永久销毁所有数据吗？")) return;
    if (prompt("输入【确认注销】：") !== "确认注销") return toast("已中止。", "info");
    
    try {
      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;
      toast("数据已抹除", "success");
      await logout();
      window.location.reload();
    } catch (e: any) {
      toast("注销失败：" + e.message, "error");
    }
  };

  const fetchInviteCodesAdmin = async () => {
    try {
      const { data, error } = await supabase.from('invitation_codes').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setCodes(data || []);
    } catch (e: any) {
      toast("读取失败: " + e.message, "error");
    }
  };

  const generateInviteCode = async () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = ''; 
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    
    try {
      const { error } = await supabase.from('invitation_codes').insert({ code, created_by: user?.id });
      if (error) throw error;
      fetchInviteCodesAdmin();
    } catch (e: any) { 
      toast("生成失败: " + e.message, "error"); 
    }
  };

  const invalidateCode = async (code: string, usedBy: string) => {
    if (!confirm(`确定要作废该邀请码并处理关联用户吗？`)) return;
    try {
      const { error } = await supabase.rpc('admin_delete_invite_and_user', { target_code: code, target_username: usedBy });
      if (error) throw error;
      toast("执行成功", "success");
      fetchInviteCodesAdmin();
    } catch (e: any) { 
      toast("操作失败: " + e.message, "error"); 
    }
  };

  return (
    <SidePanel id="settings" title={t('panel_settings')}>
      
      {isAdmin && (
        <div className="bg-[rgba(212,113,78,0.05)] border border-dashed border-[var(--brand)] rounded-[14px] p-[18px] mb-5">
          <h4 className="m-0 mb-3 text-[var(--brand)] font-medium text-sm">邀请码管理</h4>
          <div className="flex gap-2 mb-3">
            <button onClick={generateInviteCode} className="btn btn-primary flex-1 !p-2 text-[13px]">生成 1 个</button>
            <button onClick={fetchInviteCodesAdmin} className="btn btn-outline !p-2 text-[13px]">刷新</button>
          </div>
          <div className="text-[12px] max-h-[180px] overflow-y-auto custom-scrollbar">
            {codes.map(c => (
              <div key={c.id} className="flex justify-between items-center py-2 px-1 border-b border-dashed border-[var(--border)]">
                <div>
                  <strong style={{color: c.is_used ? 'var(--sub)' : 'var(--color-green)', letterSpacing: '1px', fontSize: '13px'}}>{c.code}</strong>
                  <div className="text-[11px] mt-[3px] text-[var(--sub)]">{c.is_used ? ('已用: ' + c.used_by) : '全新可用'}</div>
                </div>
                <button onClick={() => invalidateCode(c.code, c.used_by)} className="bg-transparent border border-[var(--color-red)] text-[var(--color-red)] rounded-md px-2.5 py-1 text-[11px] cursor-pointer hover:bg-red-50">作废</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center pb-5 border-b border-[var(--border)] mb-5">
        <span className="text-[13px] text-[var(--sub)] block mb-3 font-sans">
          {user ? `已连接: ${user.email === 'admin@yanye.com' ? '管理员' : user.email?.split('@')[0]}` : t('user_not_logged')}
        </span>
        <div className="flex gap-2">
          {user && (
            <>
              <button className="btn btn-outline flex-1 !p-2.5 text-[13px]" onClick={handleLogout}>{t('btn_logout')}</button>
              <button className="btn btn-outline flex-1 !p-2.5 text-[13px] text-[var(--color-red)] border-[var(--color-red)] hover:bg-red-50" onClick={handleDeleteAccount}>{t('btn_delete_acc')}</button>
            </>
          )}
        </div>
      </div>

      <button className="btn btn-outline w-full mb-5" onClick={() => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
      }}>{t('btn_fullscreen')}</button>

      <label className="set-label">{t('label_lang')}</label>
      <div className="flex gap-1.5 flex-wrap mb-6 justify-start">
        {[
          { code: 'zh-CN', label: '简体中文' },
          { code: 'en', label: 'English' },
          { code: 'ja', label: '日本語' },
          { code: 'ko', label: '한국어' }
        ].map(({ code, label }) => (
          <button 
            key={code}
            onClick={() => setLang(code)}
            className={`px-3 py-1.5 rounded-full text-xs cursor-pointer border transition-all ${code === lang ? 'bg-[var(--brand)] border-[var(--brand)] text-white font-medium shadow-sm' : 'bg-[var(--card)] border-[var(--border)] text-[var(--sub)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center mb-4">
        <span className="text-[14px] font-medium text-[var(--title)]">{t('setting_bgm')}</span>
        <label className="relative inline-block w-[44px] h-[24px]">
          <input type="checkbox" className="opacity-0 w-0 h-0 peer" checked={bgmEnabled} onChange={e => setBgmEnabled(e.target.checked)}/>
          <span className="absolute cursor-pointer inset-0 bg-[var(--border)] rounded-full transition-all peer-checked:bg-[var(--brand)] before:absolute before:h-[18px] before:w-[18px] before:left-[3px] before:bottom-[3px] before:bg-white before:rounded-full before:transition-all before:shadow shadow-sm peer-checked:before:translate-x-[20px]" />
        </label>
      </div>

      <div className="flex justify-between items-center mb-5">
        <span className="text-[14px] font-medium text-[var(--title)]">{t('setting_dblclick')}</span>
        <label className="relative inline-block w-[44px] h-[24px]">
          <input type="checkbox" className="opacity-0 w-0 h-0 peer" checked={allowDblClickClear} onChange={e => setAllowDblClickClear(e.target.checked)}/>
          <span className="absolute cursor-pointer inset-0 bg-[var(--border)] rounded-full transition-all peer-checked:bg-[var(--brand)] before:absolute before:h-[18px] before:w-[18px] before:left-[3px] before:bottom-[3px] before:bg-white before:rounded-full before:transition-all before:shadow shadow-sm peer-checked:before:translate-x-[20px]" />
        </label>
      </div>

      <div>
        <label className="set-label">{t('label_intense_time')}</label>
        <CustomSelect 
          value={intenseTime}
          onChange={val => setIntenseTime(parseInt(val))}
          options={[
            { value: '5', label: '每题 5 秒' },
            { value: '8', label: '每题 8 秒' },
            { value: '12', label: '每题 12 秒' }
          ]}
        />
      </div>

    </SidePanel>
  );
}

