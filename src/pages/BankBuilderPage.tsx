import React, { useState, useRef, useEffect } from 'react';
import { useUIStore } from '@/store/useUIStore';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { DictationItem } from '@/types';
import { toast } from '@/store/useToastStore';
import { Save, Share, Plus, Trash2, LogOut, Copy, ChevronUp, ChevronDown, Trash, Sparkles, X } from 'lucide-react';
import { pinyin } from 'pinyin-pro';

export default function BankBuilderPage() {
  const { setView, showLoader, hideLoader } = useUIStore();
  const { user } = useAuthStore();
  const { setAll } = useStore();
  
  const [bankName, setBankName] = useState('自定义题库1');
  const [items, setItems] = useState<DictationItem[]>([
    { q: '新题目', a: '答案', cat: '自定义' }
  ]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadCover, setUploadCover] = useState('');
  const [importJson, setImportJson] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  // AI Modal States
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [cfAccountId, setCfAccountId] = useState(() => localStorage.getItem('cfAccountId') || '');
  const [isGenerating, setIsGenerating] = useState(false);

  const addItem = () => {
    setItems([...items, { q: '', a: '', cat: '自定义' }]);
    setTimeout(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    }, 50);
  };
  
  const clearAllItems = () => {
    if (confirm("确定要清空所有题目吗？此操作不可逆。")) {
      setItems([{ q: '', a: '', cat: '自定义' }]);
      setPreviewIndex(0);
    }
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= items.length) return;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[index + direction];
    newItems[index + direction] = temp;
    setItems(newItems);
    if (previewIndex === index) {
      setPreviewIndex(index + direction);
    } else if (previewIndex === index + direction) {
      setPreviewIndex(index);
    }
  };
  
  const duplicateItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index + 1, 0, { ...items[index] });
    setItems(newItems);
  };
  
  const handleImportJson = () => {
    const text = importJson.trim();
    if (!text) return toast("请输入 数据", "error");
    try {
      // 尝试作为 JSON 解析
      if (text.startsWith('[') && text.endsWith(']')) {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error("JSON 格式错误，必须是数组");
        setItems([...items, ...parsed]);
        setImportJson('');
        toast("JSON 导入成功", "success");
        return;
      }
      
      // 降级为按行解析（支持 tab 或 - 分隔）
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const newItems: DictationItem[] = [];
      lines.forEach(line => {
        let q = '', a = '';
        if (line.includes('\t')) {
          [q, a] = line.split('\t');
        } else if (line.includes('-')) {
          const parts = line.split('-');
          q = parts[0].trim();
          a = parts.slice(1).join('-').trim();
        } else {
          q = line;
          a = '';
        }
        newItems.push({ q: q.trim(), a: a.trim(), cat: '导入内容' });
      });
      
      if (newItems.length > 0) {
        setItems([...items, ...newItems]);
        setImportJson('');
        toast(`成功解析并导入 ${newItems.length} 行文本`, "success");
      } else {
        throw new Error("无法识别数据格式");
      }
    } catch (e: any) {
      toast("导入失败: " + e.message, "error");
    }
  };
  
  const updateItem = (index: number, field: keyof DictationItem, value: string) => {
    const newItems = [...items];
    const prevItem = newItems[index];
    let updates: Partial<DictationItem> = { [field]: value };
    
    if (field === 'a') {
      const prevPinyin = pinyin(prevItem.a || '');
      if (!prevItem.q || prevItem.q === prevPinyin) {
        updates.q = pinyin(value);
      }
    }
    
    newItems[index] = { ...prevItem, ...updates };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    if (newItems.length === 0) newItems.push({ q: '新题目', a: '答案', cat: '自定义' });
    setItems(newItems);
    setPreviewIndex(Math.max(0, index - 1));
  };

  const saveToLocal = async () => {
    if (!user) return toast("请先登录", "error");
    if (!bankName.trim()) return toast("请输入题库名称", "error");
    const validItems = items.filter(i => i.q.trim() && i.a.trim());
    if (validItems.length === 0) return toast("没有有效的题目", "error");

    showLoader("保存中...");
    try {
      const dataToInsert = validItems.map(item => ({ ...item, group_name: bankName, user_id: user.id }));
      await supabase.from('dictation_items').delete().eq('user_id', user.id).eq('group_name', bankName);
      const { error } = await supabase.from('dictation_items').insert(dataToInsert);
      if (error) throw error;
      
      const { data } = await supabase.from('dictation_items').select('*');
      setAll(data || []);
      
      toast("保存成功", "success");
    } catch (e: any) {
      toast("保存失败: " + e.message, "error");
    } finally {
      hideLoader();
    }
  };

  const removeEmptyItemsBeforeUpload = () => items.filter(i => i.q.trim() && i.a.trim());

  const handleUploadClick = () => {
    if (!user) return toast("请先登录", "error");
    if (!bankName.trim()) return toast("请输入题库名称", "error");
    const validItems = removeEmptyItemsBeforeUpload();
    if (validItems.length === 0) return toast("没有有效的题目可以发布", "error");
    setShowUploadModal(true);
  };

  const handleLocalImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        let w = img.width, h = img.height;
        if (w > h && w > 500) { h *= 500 / w; w = 500; }
        else if (h > 500) { w *= 500 / h; h = 500; }
        canvas.width = w; canvas.height = h;
        if(ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          setUploadCover(canvas.toDataURL('image/jpeg', 0.8));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const uploadToResourceCenter = async () => {
    const validItems = removeEmptyItemsBeforeUpload();
    showLoader("发布中...");
    try {
      const { error } = await supabase.from('resource_center').insert({
        title: bankName,
        description: uploadDesc || '来自自定义题库分享',
        cover_url: uploadCover,
        json_data: validItems,
        uploader_id: user?.id,
        uploader_email: user?.email,
      });
      if (error) throw error;
      toast("发布成功", "success");
      setShowUploadModal(false);
    } catch (e: any) {
      toast("发布失败: " + e.message, "error");
    } finally {
      hideLoader();
    }
  };

  const handleAIGenerate = async () => {
    if (!cfAccountId.trim()) {
      toast("需要提供 Cloudflare Account ID 才能调用 AI", "error");
      return;
    }
    if (!aiPrompt.trim()) {
      toast("请输入想要生成的内容指令", "error");
      return;
    }

    localStorage.setItem('cfAccountId', cfAccountId.trim());
    setIsGenerating(true);
    showLoader("AI 思考中，预计 5~15 秒...");
    
    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          accountId: cfAccountId.trim(),
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'API 请求失败');
      }

      if (data.result && Array.isArray(data.result)) {
        setItems(prev => [...prev, ...data.result]);
        toast(`成功生成 ${data.result.length} 道题目`, "success");
        setAiPrompt('');
        setShowAIModal(false);
        setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
          }
        }, 100);
      } else {
        throw new Error('返回的数据格式异常');
      }
    } catch (e: any) {
      toast("AI 生成失败: " + e.message, "error");
    } finally {
      setIsGenerating(false);
      hideLoader();
    }
  };

  const previewItem = items[previewIndex] || items[0];

  return (
    <div className="fixed inset-0 bg-[var(--bg2)] z-[3000] flex flex-col animate-in slide-in-from-bottom duration-300">
      <div className="h-16 px-6 bg-[var(--card)] border-b border-[var(--border)] flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <input 
            type="text" 
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            className="text-lg font-serif bg-transparent border-none outline-none font-medium text-[var(--title)] !p-0 !m-0 !shadow-none focus:!bg-transparent focus:!shadow-none w-48"
            placeholder="题库名称"
          />
        </div>
        <div className="flex gap-3">
          <button className="btn btn-outline !p-2 !px-4 text-sm gap-2" onClick={async () => {
              showLoader("退出中...");
              await supabase.auth.signOut();
              setView('auth');
              hideLoader();
            }}>
            <LogOut size={16}/> 退出
          </button>
          <button className="btn btn-primary !p-2 !px-4 text-sm gap-2" onClick={saveToLocal}>
            <Save size={16}/> 保存
          </button>
          <button className="btn btn-outline !p-2 !px-4 text-sm gap-2 whitespace-nowrap" onClick={handleUploadClick}>
            <Share size={16}/> 发布到资源中心
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Left Table */}
        <div className="flex-1 md:w-1/2 flex flex-col border-r border-[var(--border)] relative bg-[var(--bg)]">
          <div className="p-4 bg-[var(--card)] border-b border-[var(--border)] flex justify-between items-center shrink-0 shadow-sm z-10">
            <span className="font-medium text-sm text-[var(--sub)]">{items.length} 个词条</span>
            <div className="flex gap-2">
              <button onClick={() => setShowAIModal(true)} className="btn btn-outline !p-1.5 !px-3 text-xs gap-1 border-[var(--brand)] text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white" title="AI智能生成">
                <Sparkles size={14}/> AI智能生成
              </button>
              <button onClick={clearAllItems} className="btn btn-outline !p-1.5 !px-3 text-xs gap-1 text-red-500 border-red-200 hover:bg-red-50" title="清空全部">
                <Trash size={14}/> 清空
              </button>
              <button onClick={addItem} className="btn btn-primary !p-1.5 !px-3 text-xs gap-1">
                <Plus size={14}/> 添加
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24" ref={listRef}>
            {items.map((item, idx) => (
              <div 
                key={idx} 
                className={`bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm p-4 cursor-pointer transition-all ${previewIndex === idx ? 'ring-2 ring-[var(--brand)] border-transparent' : 'hover:border-[var(--brand)] hover:shadow-md'}`}
                onClick={() => setPreviewIndex(idx)}
              >
                <div className="flex items-center justify-between mb-3 border-b border-[var(--bg2)] pb-2">
                  <input 
                    value={item.cat || ''}
                    onChange={(e) => updateItem(idx, 'cat', e.target.value)}
                    placeholder="分类 (如: 诗句)"
                    className="text-xs text-[var(--brand)] font-medium !bg-transparent !p-0 !m-0 !border-none !shadow-none focus:!shadow-none w-24 outline-none"
                  />
                  <div className="flex items-center gap-0.5">
                    <button onClick={(e) => { e.stopPropagation(); moveItem(idx, -1); }} disabled={idx === 0} className="text-[var(--sub)] hover:text-[var(--title)] p-1.5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronUp size={16}/></button>
                    <button onClick={(e) => { e.stopPropagation(); moveItem(idx, 1); }} disabled={idx === items.length - 1} className="text-[var(--sub)] hover:text-[var(--title)] p-1.5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronDown size={16}/></button>
                    <div className="w-[1px] h-4 bg-[var(--border)] mx-1"></div>
                    <button onClick={(e) => { e.stopPropagation(); duplicateItem(idx); }} className="text-[var(--sub)] hover:text-[var(--title)] p-1.5 transition-colors" title="提取副本"><Copy size={14}/></button>
                    <button onClick={(e) => { e.stopPropagation(); removeItem(idx); }} className="text-red-400 hover:text-red-500 p-1.5 transition-colors" title="删除"><Trash2 size={14}/></button>
                  </div>
                </div>
                <input 
                  value={item.q}
                  onChange={(e) => updateItem(idx, 'q', e.target.value)}
                  placeholder="新题目"
                  className="font-serif text-lg text-[var(--title)] !bg-transparent !p-0 !mb-2 !border-none !shadow-none focus:!shadow-none placeholder:text-[var(--sub-light)] outline-none w-full"
                />
                <input 
                  value={item.a}
                  onChange={(e) => updateItem(idx, 'a', e.target.value)}
                  placeholder="在此输入答案"
                  className="text-sm text-[var(--sub)] !bg-transparent !p-0 !mb-0 !border-none !shadow-none focus:!shadow-none placeholder:text-[var(--sub-light)] outline-none w-full"
                />
              </div>
            ))}
            
            <div className="mt-8 pt-6 border-t border-[var(--border)]">
              <label className="set-label flex items-center gap-2">
                <span className="font-semibold text-sm">批量导入与提取</span>
                <span className="text-[10px] bg-[var(--bg2)] px-2 py-0.5 rounded text-[var(--sub)]">高级</span>
              </label>
              <textarea 
                rows={4}
                value={importJson}
                onChange={e => setImportJson(e.target.value)}
                placeholder={'支持：\n1. JSON格式 ( [ {"q":"题目", "a":"答案", "cat":"分类"} ... ] )\n2. 纯文本逐行 ( 题目 - 答案 )，或无答案回车换行'}
                className="w-full text-xs font-mono p-3 bg-[var(--card)] border border-[var(--border)] rounded-lg outline-none mb-3 resize-none focus:border-[var(--brand)] transition-colors shadow-inner"
              />
              <div className="flex gap-2">
                <button className="btn btn-outline !p-2 text-sm w-1/2 font-medium" onClick={handleImportJson}>
                  解析并导入
                </button>
                <button className="btn btn-outline !p-2 text-sm w-1/2 font-medium" onClick={() => {
                  setImportJson(JSON.stringify(items, null, 2));
                  toast("已将当前题库转为 JSON，您可以复制保存", "success");
                }}>
                  生成 JSON
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview */}
        <div className="hidden md:flex flex-col w-1/2 items-center justify-center bg-[var(--bg2)] p-10">
          <div className="w-[360px] h-full max-h-[700px] bg-[var(--card)] rounded-[20px] shadow-[0_16px_48px_rgba(0,0,0,0.10)] border border-[var(--border)] flex flex-col overflow-hidden relative">
            <div className="p-4 border-b border-[var(--border)] text-center text-xs text-[var(--sub)] bg-[var(--bg)]">预览: {bankName}</div>
            
            <div className="flex-1 flex flex-col justify-center items-center p-8 text-center relative pointer-events-none group">
              <input 
                className="text-[11px] text-[var(--brand)] mb-[10px] font-medium tracking-[1.5px] border border-transparent hover:border-dashed hover:border-[var(--border)] p-1 pointer-events-auto cursor-text bg-transparent text-center focus:outline-none focus:border-[var(--brand)] transition-colors rounded"
                value={previewItem.cat || ''}
                placeholder="自定义"
                onChange={(e) => updateItem(previewIndex, 'cat', e.target.value)}
              />
              <textarea 
                className="text-[32px] font-serif text-[var(--title)] leading-[1.45] break-words m-0 border border-transparent hover:border-dashed hover:border-[var(--border)] p-4 pointer-events-auto cursor-text bg-transparent text-center resize-none focus:outline-none focus:border-[var(--brand)] transition-colors rounded-xl w-full h-[180px] scrollbar-none"
                value={previewItem.q || ''}
                placeholder="新题目"
                onChange={(e) => updateItem(previewIndex, 'q', e.target.value)}
              />
              
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                <button 
                  className="bg-[var(--card)] border border-[var(--border)] rounded-full px-3 py-1.5 text-xs text-[var(--sub)] hover:text-[var(--brand)] hover:border-[var(--brand)] shadow-sm transition-colors"
                  onClick={() => {
                    const newQ = pinyin(previewItem.a || '');
                    updateItem(previewIndex, 'q', newQ);
                    toast("已生成拼音题目", "success");
                  }}
                  title="根据答案生成拼音作为题目"
                >
                  智能拼音
                </button>
                <button 
                  className="bg-[var(--card)] border border-[var(--border)] rounded-full px-3 py-1.5 text-xs text-[var(--sub)] hover:text-[var(--title)] shadow-sm transition-colors"
                  onClick={() => {
                    const temp = previewItem.q;
                    updateItem(previewIndex, 'q', previewItem.a || '');
                    updateItem(previewIndex, 'a', temp);
                  }}
                  title="互换题目和答案的内容"
                >
                  对调问答
                </button>
              </div>
            </div>

            <div className="h-[250px] w-full bg-[var(--bg)] border-t border-[var(--border)] relative pointer-events-auto z-10 transition-colors focus-within:bg-[var(--card)]">
              <div className="absolute inset-0 opacity-20 pointer-events-none grid-bg" />
              <textarea 
                className="absolute inset-0 pt-20 font-serif text-[var(--title)] opacity-30 hover:opacity-100 focus:opacity-100 transition-opacity text-[42px] bg-transparent text-center focus:outline-none w-full h-full border-none resize-none px-6"
                value={previewItem.a || ''}
                placeholder="在此输入答案"
                onChange={(e) => updateItem(previewIndex, 'a', e.target.value)}
              />
            </div>
            
            <div className="absolute top-1/2 right-4 -translate-y-1/2 p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-20 text-center pointer-events-none">
              <span className="text-[11px] text-[var(--sub)] block mb-2">核对结果</span>
              <div className="text-xl font-serif text-[var(--title)]">{previewItem?.a || '答案'}</div>
            </div>
          </div>
        </div>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[4000] flex items-center justify-center p-4" onClick={(e) => { if(e.target === e.currentTarget) setShowUploadModal(false); }}>
          <div className="bg-[var(--card)] w-full max-w-sm rounded-[20px] shadow-2xl overflow-hidden border border-[var(--border)] animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg)]">
              <h2 className="m-0 font-serif text-[18px] text-[var(--title)]">发布到资源中心</h2>
              <button className="text-[var(--sub)] hover:text-[var(--title)] border-none bg-transparent cursor-pointer text-xl mb-1" onClick={() => setShowUploadModal(false)}>×</button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="set-label">题库标题</label>
                <input 
                  type="text" 
                  disabled
                  value={bankName}
                  className="w-full p-3 rounded-xl border border-[var(--border)] bg-[var(--bg2)] text-[var(--sub)] text-sm outline-none"
                />
              </div>
              <div>
                <label className="set-label">简介描述</label>
                <textarea 
                  rows={2} 
                  value={uploadDesc}
                  onChange={e => setUploadDesc(e.target.value)}
                  placeholder="简单介绍一下..."
                  className="w-full p-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm outline-none focus:border-[var(--brand)] transition-colors resize-none"
                />
              </div>
              <div>
                <label className="set-label">封面图片</label>
                <div className="relative overflow-hidden w-full mb-1">
                  <input type="file" accept="image/*" onChange={handleLocalImage} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" />
                  <div className="w-full p-3 bg-[var(--bg)] border border-dashed border-[var(--border)] rounded-xl text-[var(--sub)] text-sm text-center transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)]">
                    {uploadCover ? '已选择图片 (点击更换)' : '点击选取封面图片'}
                  </div>
                </div>
                {uploadCover && <img src={uploadCover} className="h-16 w-16 object-cover rounded-lg border border-[var(--border)] mt-2" alt="cover preview"/>}
              </div>
              
              <button className="btn btn-primary w-full mt-2" onClick={uploadToResourceCenter}>确认发布</button>
            </div>
          </div>
        </div>
      )}

      {/* AI Modal */}
      {showAIModal && (
        <div className="fixed inset-0 z-[4000] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] w-full max-w-md rounded-2xl p-6 relative shadow-[0_16px_48px_rgba(0,0,0,0.15)] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4 border-b border-[var(--border)] pb-3">
              <h3 className="text-xl font-serif font-medium flex items-center gap-2 text-[var(--title)]">
                <Sparkles size={20} className="text-[var(--brand)]"/> AI 智能生成题目
              </h3>
              <button disabled={isGenerating} onClick={() => setShowAIModal(false)} className="text-[var(--sub)] hover:text-[var(--title)] disabled:opacity-50"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="set-label font-medium mb-2 block">1. Cloudflare Account ID</label>
                <input 
                  type="text"
                  value={cfAccountId}
                  onChange={e => setCfAccountId(e.target.value)}
                  className="w-full text-sm p-3 bg-[var(--bg2)] rounded-lg outline-none focus:ring-1 ring-[var(--brand)] transition-shadow border border-[var(--border)]"
                  placeholder="请输入您的 Account ID"
                  disabled={isGenerating}
                />
                <div className="text-[10px] text-[var(--sub)] mt-1 ml-1 text-red-500">
                  调用模型的必需参数（将保存在本地）
                </div>
              </div>
              <div className="pt-2">
                <label className="set-label font-medium mb-2 block">2. 生成指令</label>
                <textarea 
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  className="w-full text-sm p-3 bg-[var(--bg2)] rounded-lg outline-none resize-none h-28 focus:ring-1 ring-[var(--brand)] transition-shadow border border-[var(--border)]"
                  placeholder="例如：生成5个关于中国古代诗词填空的题目，格式要符合题库要求。"
                  disabled={isGenerating}
                />
              </div>
              <button 
                className="btn btn-primary w-full py-3 mt-4 text-[14px] font-medium" 
                onClick={handleAIGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? '正在生成中，请耐心等待...' : '提交指令'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
