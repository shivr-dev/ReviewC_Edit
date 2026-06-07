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
  const [cfToken, setCfToken] = useState(() => localStorage.getItem('cfToken') || 'cfut_TbqHfokK5npH4ou57VMvdfCAkWb5X6wG19Z9kzVKf23f75a0');
  const [cfMaxTokens, setCfMaxTokens] = useState(() => localStorage.getItem('cfMaxTokens') || '4096');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [previewAiItems, setPreviewAiItems] = useState<DictationItem[]>([]);
  const [activeTab, setActiveTab] = useState<'visual'|'code'>('visual');
  const [aiStreamRaw, setAiStreamRaw] = useState('');
  const [aiHistory, setAiHistory] = useState<any[]>([]);
  const [aiFollowUp, setAiFollowUp] = useState('');
  const streamRef = useRef<HTMLDivElement>(null);

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

  const renderStream = () => {
    if (!aiStreamRaw) return '等待响应...';
    const hasThink = aiStreamRaw.includes('<think>');
    if (!hasThink) return aiStreamRaw;
    
    const parts = aiStreamRaw.split('<think>');
    if (parts.length <= 1) return aiStreamRaw;
    
    const afterThinkOpen = parts[1];
    const thinkParts = afterThinkOpen.split('</think>');
    const thinkContent = thinkParts[0];
    const restContent = thinkParts[1] || '';
    
    return (
      <div className="flex flex-col gap-2 pointer-events-auto">
        <div className="text-[var(--sub)] bg-[var(--brand)]/5 p-2 rounded border border-[var(--brand)]/20">
          <strong className="text-[var(--brand)] mb-1 block">🤔 思考过程：</strong>
          {thinkContent}
        </div>
        {restContent && (
          <div className="p-2">
            <strong className="text-[var(--title)] mb-1 block">✨ 生成内容：</strong>
            {restContent}
          </div>
        )}
      </div>
    );
  };

  const handleAIGenerate = async (isFollowUp = false) => {
    if (!cfAccountId.trim()) {
      toast("需要提供 Cloudflare Account ID 才能调用 AI", "error");
      return;
    }
    const currentInput = isFollowUp ? aiFollowUp.trim() : aiPrompt.trim();
    if (!currentInput) {
      toast("请输入想要生成的内容指令", "error");
      return;
    }

    if (!cfToken.trim()) {
      toast("需要提供 Cloudflare API Token 才能调用 AI", "error");
      return;
    }

    localStorage.setItem('cfAccountId', cfAccountId.trim());
    localStorage.setItem('cfToken', cfToken.trim());
    localStorage.setItem('cfMaxTokens', cfMaxTokens.toString());
    setIsGenerating(true);
    setAiStreamRaw('');
    
    let currentHistory = [...aiHistory];
    
    if (!isFollowUp) {
       currentHistory = [
          { 
            role: 'system', 
            content: 'You are a JavaScript automated generator. Output strictly a valid JavaScript code block that returns an array of objects. The array must contain objects with exactly these keys: `q` (question text), `a` (answer text), `cat` (category string). Example structure:\n```javascript\nreturn [\n  { q: "1+1=", a: "2", cat: "Math" }\n];\n```\nInclude no other text or explanation unless it is within a <think> element if you choose to reason first. The final evaluated expression inside the code must return this array. IMPORTANT: You must output a complete array, do not get cut off.' 
          },
          { 
            role: 'user', 
            content: currentInput
          }
       ];
    } else {
       currentHistory.push({ role: 'user', content: currentInput });
    }
    setAiHistory(currentHistory);

    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId.trim()}/ai/v1/chat/completions`;
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      
      const aiResponse = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfToken.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: '@cf/qwen/qwen2.5-coder-32b-instruct',
          messages: currentHistory,
          max_tokens: parseInt(cfMaxTokens) || 4096,
          stream: true
        })
      });

      if (!aiResponse.ok) {
        let errText = await aiResponse.text();
        try { errText = JSON.stringify(JSON.parse(errText)); } catch(e) {}
        throw new Error(`Cloudflare API Error: ${errText}`);
      }

      const reader = aiResponse.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let aiContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
               const dataStr = line.substring(6).trim();
               if (dataStr === '[DONE]') continue;
               try {
                 const data = JSON.parse(dataStr);
                 const text = data?.choices?.[0]?.delta?.content || data?.response || '';
                 aiContent += text;
                 setAiStreamRaw(aiContent);
                 setTimeout(() => {
                   if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
                 }, 0);
               } catch(e) {}
            }
          }
        }
      }

      // After streaming
      setAiHistory(prev => [...prev, { role: 'assistant', content: aiContent }]);

      // Pre-process thinking block if any
      let cleanContent = aiContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      if (cleanContent.includes('<think>')) {
        cleanContent = cleanContent.split('<think>')[0].trim();
      }

      // Extract javascript block if any
      const jsMatch = cleanContent.match(/```(?:javascript|js|json)\n([\s\S]*?)(?:\n```|$)/);
      let jsCode = jsMatch ? jsMatch[1].trim() : cleanContent.trim();
      
      // Also try to strip non-code prefix/suffix if backticks missed
      if (!jsMatch && jsCode.includes('return [')) {
         jsCode = jsCode.substring(jsCode.indexOf('return ['));
      }
      if (!jsMatch && jsCode.trim().startsWith('[')) {
         jsCode = 'return ' + jsCode.trim();
      }

      const tryParse = (codeStr: string) => {
        try {
          const fn = new Function(`return (function(){ ${codeStr.includes('return') ? codeStr : 'return ' + codeStr} })()`);
          return fn();
        } catch(e) {
          return null;
        }
      };

      let parsedItems: any[] = [];
      let res = tryParse(jsCode);
      if (Array.isArray(res)) {
         parsedItems = res;
      } else {
         // Auto-fix for cut-off code
         const fixes = [
           "}]",
           "\"}]",
           "'}]",
           "\", cat: \"未分类\"}]",
           "', cat: '未分类'}]",
           "\"}, {q:\"未完整\", a:\"已截断\", cat:\"未分类\"}]"
         ];
         let fixed = false;
         for (let fix of fixes) {
            let attempt = tryParse(jsCode + fix);
            if (Array.isArray(attempt)) {
               parsedItems = attempt;
               jsCode = jsCode + fix;
               fixed = true;
               break;
            }
         }
         
         if (!fixed) {
           let tryArray = tryParse("return " + jsCode + "]");
           if (Array.isArray(tryArray)) {
              parsedItems = tryArray;
              jsCode = "return " + jsCode + "]";
           }
         }
      }

      setGeneratedCode(jsCode);
      
      if (parsedItems.length > 0) {
        setPreviewAiItems(parsedItems);
        setActiveTab('visual');
      } else {
        setPreviewAiItems([]);
        setActiveTab('code');
      }

      setShowCodePreview(true);
      setShowAIModal(false);
      if (isFollowUp) {
        setAiFollowUp('');
      } else {
        setAiPrompt('');
      }
      toast("AI 已生成内容，请预览并确认", "success");

    } catch (e: any) {
      toast("AI 生成失败: " + e.message, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExecuteCode = () => {
    try {
      const fn = new Function(`
        try {
          ${generatedCode}
        } catch(e) {
          throw new Error("执行代码报错: " + e.message);
        }
      `);
      const result = fn();
      
      if (Array.isArray(result) && result.length > 0 && result[0].hasOwnProperty('q') && result[0].hasOwnProperty('a')) {
        setItems(prev => [...prev, ...result]);
        toast(`成功添加 ${result.length} 道题目`, "success");
        setShowCodePreview(false);
        setGeneratedCode('');
        setPreviewAiItems([]);
        setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
          }
        }, 100);
      } else {
        throw new Error('代码未返回有效的题目数组格式！');
      }
    } catch(e: any) {
      toast(e.message, "error");
    }
  };

  // Re-evaluate when code changes in code tab
  const handleCodeChange = (e: any) => {
    const newCode = e.target.value;
    setGeneratedCode(newCode);
    try {
      const fn = new Function(`return (function(){ ${newCode} })()`);
      const res = fn();
      if (Array.isArray(res)) setPreviewAiItems(res);
    } catch(err) {
      // ignore
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
                <button className="btn btn-outline !p-2 text-sm w-1/3 font-medium flex-1 truncate" onClick={handleImportJson} title="解析输入框中的文本/JSON">
                  解析并导入
                </button>
                <button className="btn btn-outline !p-2 text-sm w-1/3 font-medium flex-1 truncate" onClick={() => {
                  setImportJson(JSON.stringify(items, null, 2));
                  toast("已将当前题库转为 JSON，您可以复制或编辑", "success");
                }} title="将当前题库生成为JSON">
                  JSON提取
                </button>
                <button className="btn btn-outline !p-2 text-sm w-1/3 font-medium flex-1 truncate" onClick={() => {
                  const txt = items.filter(i => i.q.trim() || i.a.trim()).map(i => `${i.q} - ${i.a}`).join('\n');
                  if (!txt) return toast("没有可提取的内容", "error");
                  setImportJson(txt);
                  toast("已将当前题库提取为纯文本，您可以复制或编辑", "success");
                }} title="将当前题库生成为文本格式">
                  文本提取
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button className="btn btn-outline hover:bg-[var(--bg2)] text-[var(--sub)] hover:text-[var(--title)] !p-1.5 text-xs w-full truncate border-[var(--border)]" onClick={() => {
                  const cleaned = items.filter(i => i.q.trim() || i.a.trim());
                  if (cleaned.length === items.length) return toast("没有空行需要清理", "success");
                  if (cleaned.length === 0) return toast("清理后将没有题目，请直接使用清空功能", "error");
                  setItems(cleaned);
                  setPreviewIndex(0);
                  toast(`清理了 ${items.length - cleaned.length} 个空行`, "success");
                }} title="清除没有问题和答案的内容">
                  清理所有空白行
                </button>
                <button className="btn btn-outline hover:bg-[var(--bg2)] text-[var(--sub)] hover:text-[var(--title)] !p-1.5 text-xs w-full truncate border-[var(--border)]" onClick={() => {
                  const reversed = [...items].map(i => ({ ...i, q: i.a, a: i.q }));
                  setItems(reversed);
                  toast("已全局互换题目和答案", "success");
                }} title="将所有题目的问题与答案互相调换">
                  全局问答对调
                </button>
                <button className="btn btn-outline hover:bg-[var(--bg2)] text-[var(--sub)] hover:text-[var(--title)] !p-1.5 text-xs w-full truncate border-[var(--border)]" onClick={() => {
                  const shuffled = [...items].sort(() => Math.random() - 0.5);
                  setItems(shuffled);
                  toast("已打乱题目顺序", "success");
                }} title="随机打乱题目顺序">
                  全局随机打乱
                </button>
                <button className="btn btn-outline hover:bg-[var(--bg2)] text-[var(--sub)] hover:text-[var(--title)] !p-1.5 text-xs w-full truncate border-[var(--border)]" onClick={() => {
                  const map = new Map();
                  items.forEach(item => {
                    const key = item.q.trim();
                    if (key && !map.has(key)) map.set(key, item);
                  });
                  const deduplicated = Array.from(map.values()) as DictationItem[];
                  if (deduplicated.length === items.length) return toast("没有发现重复项", "success");
                  setItems(deduplicated);
                  setPreviewIndex(Math.min(previewIndex, deduplicated.length - 1));
                  toast(`去重完成，移除了 ${items.length - deduplicated.length} 个重复问题`, "success");
                }} title="移除问题完全相同的重复题目">
                  智能自动去重
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
                  调用模型的必需参数（将保存在浏览器本地缓存）
                </div>
              </div>
              <div className="pt-2 flex gap-4">
                <div className="flex-1 min-w-0">
                  <label className="set-label font-medium mb-2 block flex items-center justify-between">
                    <span>2. Cloudflare AI Token</span>
                    <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noreferrer" className="text-[10px] text-[var(--brand)] hover:underline whitespace-nowrap ml-2">去获取 Token</a>
                  </label>
                  <input 
                    type="text"
                    value={cfToken}
                    onChange={e => setCfToken(e.target.value)}
                    className="w-full text-sm p-3 bg-[var(--bg2)] rounded-lg outline-none focus:ring-1 ring-[var(--brand)] transition-shadow border border-[var(--border)]"
                    placeholder="请输入您的 Token (以 cfut_ 等开头)"
                    disabled={isGenerating}
                  />
                  <div className="text-[10px] text-[var(--sub)] mt-1 ml-1 leading-relaxed">
                    需要创建自定义 API Token，并授予 <strong>Account {">"} Workers AI {">"} Read</strong> 权限。
                  </div>
                </div>
                <div className="w-28 shrink-0">
                  <label className="set-label font-medium mb-2 block truncate" title="调整最大生成长度，防止长文本被截断">Max Tokens</label>
                  <input 
                    type="number"
                    value={cfMaxTokens}
                    onChange={e => setCfMaxTokens(e.target.value)}
                    className="w-full text-sm p-3 bg-[var(--bg2)] rounded-lg outline-none focus:ring-1 ring-[var(--brand)] transition-shadow border border-[var(--border)]"
                    placeholder="4096"
                    disabled={isGenerating}
                  />
                </div>
              </div>
              <div className="pt-2">
                <div className="flex justify-between items-end mb-2 block">
                  <label className="set-label font-medium mb-0">3. 生成指令</label>
                  <div className="flex gap-2">
                    <button onClick={() => setAiPrompt("生成5道关于中国历史的知识问答题。")} className="text-[10px] text-[var(--brand)] bg-[var(--brand)]/10 px-2 py-1 rounded hover:bg-[var(--brand)]/20 transition-colors">历史题</button>
                    <button onClick={() => setAiPrompt("生成5道高中常考英语单词及其中文翻译。")} className="text-[10px] text-[var(--brand)] bg-[var(--brand)]/10 px-2 py-1 rounded hover:bg-[var(--brand)]/20 transition-colors">英语单词</button>
                    <button onClick={() => setAiPrompt("生成5道基础物理常识问答题。")} className="text-[10px] text-[var(--brand)] bg-[var(--brand)]/10 px-2 py-1 rounded hover:bg-[var(--brand)]/20 transition-colors">常识题</button>
                  </div>
                </div>
                <textarea 
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  className="w-full text-sm p-3 bg-[var(--bg2)] rounded-lg outline-none resize-none h-28 focus:ring-1 ring-[var(--brand)] transition-shadow border border-[var(--border)]"
                  placeholder="例如：生成5个关于中国古代诗词填空的题目，格式要符合题库要求。"
                  disabled={isGenerating}
                />
              </div>
              
              {isGenerating && (
                <div className="mt-4 p-4 bg-[var(--bg)] border border-[var(--border)] rounded-xl animate-in fade-in duration-300">
                  <div className="text-sm font-medium text-[var(--brand)] mb-2 flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-[var(--brand)] border-t-transparent animate-spin"></div>
                    AI 正在思考并输出...
                  </div>
                  <div 
                    ref={streamRef}
                    className="text-[11px] text-[var(--sub)] font-mono overflow-y-auto h-32 max-h-32 whitespace-pre-wrap p-2 bg-[var(--bg2)] rounded border border-[var(--border)] pointer-events-auto"
                  >
                    {renderStream()}
                  </div>
                </div>
              )}

              {!isGenerating && (
                <button 
                  className="btn btn-primary w-full py-3 mt-4 text-[14px] font-medium" 
                  onClick={() => handleAIGenerate(false)}
                >
                  提交指令
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Code Preview Modal */}
      {showCodePreview && (
        <div className="fixed inset-0 z-[4000] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] w-full max-w-2xl rounded-2xl p-6 relative shadow-[0_16px_48px_rgba(0,0,0,0.15)] animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4 border-b border-[var(--border)] pb-3">
              <h3 className="text-xl font-serif font-medium flex items-center gap-2 text-[var(--title)]">
                <Sparkles size={20} className="text-[var(--brand)]"/> AI 生成预览 ({previewAiItems.length})
              </h3>
              <button onClick={() => setShowCodePreview(false)} className="text-[var(--sub)] hover:text-[var(--title)]"><X size={20}/></button>
            </div>
            
            <div className="flex gap-4 border-b border-[var(--border)] mb-4 pb-0">
              <button 
                className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'visual' ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-transparent text-[var(--sub)] hover:text-[var(--title)]'}`}
                onClick={() => setActiveTab('visual')}
              >
                列表预览
              </button>
              <button 
                className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'code' ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-transparent text-[var(--sub)] hover:text-[var(--title)]'}`}
                onClick={() => setActiveTab('code')}
              >
                高级：查看源码
              </button>
            </div>

            <div className="space-y-4">
              {activeTab === 'visual' ? (
                 <div className="h-64 overflow-y-auto space-y-3 pr-2 scrollbar-custom bg-[var(--bg)] p-3 rounded-xl border border-[var(--border)]">
                   {previewAiItems.length > 0 ? previewAiItems.map((item, idx) => (
                     <div key={idx} className="bg-[var(--card)] p-3 rounded-lg shadow-sm border border-[var(--border)] flex flex-col gap-2">
                       <div className="flex justify-between items-start">
                         <div className="text-sm font-medium text-[var(--title)] flex-1">{item.q}</div>
                         <div className="text-[10px] text-[var(--brand)] bg-[var(--brand)]/10 px-2 py-0.5 rounded-full ml-2 w-max shrink-0">{item.cat}</div>
                       </div>
                       <div className="text-sm text-[var(--sub)] border-t border-[var(--border)] pt-2 mt-1">
                         A: {item.a}
                       </div>
                     </div>
                   )) : (
                     <div className="flex items-center justify-center h-full text-sm text-[var(--sub)]">
                       未提取到有效题目结构，请查看大模型输出源码或重试。
                     </div>
                   )}
                 </div>
              ) : (
                <div className="pt-2">
                  <textarea 
                    value={generatedCode}
                    onChange={handleCodeChange}
                    className="w-full text-xs font-mono p-4 bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none resize-none h-64 focus:border-[var(--brand)] transition-colors"
                    spellCheck={false}
                  />
                </div>
              )}
              
              {isGenerating ? (
                <div className="mt-4 p-4 bg-[var(--bg)] border border-[var(--border)] rounded-xl animate-in fade-in duration-300">
                  <div className="text-sm font-medium text-[var(--brand)] mb-2 flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-[var(--brand)] border-t-transparent animate-spin"></div>
                    AI 正在思考并修正...
                  </div>
                  <div 
                    ref={streamRef}
                    className="text-[11px] text-[var(--sub)] font-mono overflow-y-auto h-32 max-h-32 whitespace-pre-wrap p-2 bg-[var(--bg2)] rounded border border-[var(--border)] pointer-events-auto"
                  >
                    {renderStream()}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex gap-3 mt-4 pt-2">
                    <button 
                      className="btn btn-outline flex-1 py-3" 
                      onClick={() => setShowCodePreview(false)}
                    >
                      取消并废弃
                    </button>
                    <button 
                      className="btn btn-primary flex-1 py-3 font-medium" 
                      onClick={handleExecuteCode}
                      disabled={previewAiItems.length === 0}
                    >
                      确认导入这 {previewAiItems.length} 道题
                    </button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-[var(--border)]">
                    <label className="set-label font-medium mb-2 block">对结果不满意？让 AI 继续修改：</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={aiFollowUp}
                        onChange={e => setAiFollowUp(e.target.value)}
                        placeholder="例如：稍微难一点、再加两道题..."
                        className="flex-1 text-sm p-3 bg-[var(--bg2)] rounded-lg outline-none focus:ring-1 ring-[var(--brand)] transition-shadow border border-[var(--border)]"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && aiFollowUp.trim()) handleAIGenerate(true);
                        }}
                      />
                      <button 
                        className="btn btn-primary !px-6"
                        onClick={() => handleAIGenerate(true)}
                        disabled={!aiFollowUp.trim()}
                      >
                        发送修正
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
