import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { weightedPick, updateItemStats, getDifficultyInfo } from '@/lib/spacedRepetition';

export default function LearningPage() {
  const { filtered, activeSession, setActiveSession, isIntenseMode, setIsIntenseMode, useSpacedRepetition, masteryThreshold, setWrongs, wrongs } = useStore();
  const { user } = useAuthStore();
  const { setView, openPanel } = useUIStore();

  const [pool, setPool] = useState(activeSession ? activeSession.pool : [...filtered]);
  const [current, setCurrent] = useState(activeSession ? activeSession.current : null);
  const [sCorrect, setSCorrect] = useState(activeSession ? activeSession.sCorrect : 0);
  const [sWrong, setSWrong] = useState(activeSession ? activeSession.sWrong : 0);
  const [qTimeLeft, setQTimeLeft] = useState(activeSession ? activeSession.qTimeLeft : 8);
  const [sessionStreak, setSessionStreak] = useState(activeSession ? activeSession.sessionStreak : 0);

  const [prepTime, setPrepTime] = useState(0);
  const [ansPop, setAnsPop] = useState(false);
  const [ansText, setAnsText] = useState('');
  const [isTimeoutState, setIsTimeoutState] = useState(false);
  const [finished, setFinished] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const undoStack = useRef<ImageData[]>([]);
  const isEraser = useRef(false);

  useEffect(() => {
    if (!activeSession) {
      startSession();
    }
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const applyBrush = () => {
      if (isEraser.current) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 32;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = 4;
        ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--title').trim() || '#1a1a1a';
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        applyBrush();
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const saveState = () => {
      undoStack.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (undoStack.current.length > 20) undoStack.current.shift();
    };

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const cx = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const cy = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      return { x: cx - rect.left, y: cy - rect.top };
    };

    const startDraw = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      saveState();
      isDrawing.current = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!isDrawing.current) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const endDraw = () => { isDrawing.current = false; };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', endDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    window.addEventListener('touchend', endDraw);

    const checkDblClickClear = () => {
      const allowStr = localStorage.getItem('allow_dblclick');
      return allowStr !== 'false';
    };

    let lastTap = 0;
    const touchStartHandler = (e: TouchEvent) => {
      const t = Date.now();
      const tl = t - lastTap;
      if (tl < 300 && tl > 0 && checkDblClickClear()) {
        clearHandler();
        return;
      }
      lastTap = t;
    };
    canvas.addEventListener('touchstart', touchStartHandler, { passive: false });

    const dblClickHandler = () => {
      if (checkDblClickClear()) clearHandler();
    };
    canvas.addEventListener('dblclick', dblClickHandler);

    const clearHandler = () => { saveState(); ctx.clearRect(0, 0, canvas.width, canvas.height); };
    const undoHandler = () => { if (undoStack.current.length > 0) ctx.putImageData(undoStack.current.pop()!, 0, 0); };
    const eraserHandler = () => { isEraser.current = !isEraser.current; applyBrush(); };

    window.addEventListener('clearCanvas', clearHandler);
    window.addEventListener('undoCanvas', undoHandler);
    window.addEventListener('toggleEraser', eraserHandler);

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousedown', startDraw);
      canvas.removeEventListener('mousemove', draw);
      window.removeEventListener('mouseup', endDraw);
      canvas.removeEventListener('touchstart', startDraw);
      canvas.removeEventListener('touchmove', draw);
      window.removeEventListener('touchend', endDraw);
      window.removeEventListener('clearCanvas', clearHandler);
      window.removeEventListener('undoCanvas', undoHandler);
      window.removeEventListener('toggleEraser', eraserHandler);
    };
  }, [current, isIntenseMode]);

  const startSession = () => {
    window.dispatchEvent(new CustomEvent('playBGM'));
    setFinished(false);
    setAnsPop(false);
    setSCorrect(0);
    setSWrong(0);
    setSessionStreak(0);
    setPool([...filtered]);
    
    if (isIntenseMode) {
      setPrepTime(4);
      const iv = setInterval(() => {
        setPrepTime(p => {
          if (p <= 1) {
            clearInterval(iv);
            nextQ([...filtered]);
            return 0;
          }
          return p - 1;
        });
      }, 1000);
    } else {
      nextQ([...filtered]);
    }
  };

  const nextQ = (currentPool = pool) => {
    if (currentPool.length === 0) {
      setFinished(true);
      return;
    }
    const c = weightedPick(user?.id || 'guest', currentPool, useSpacedRepetition && !isIntenseMode, masteryThreshold);
    setCurrent(c);
    setAnsPop(false);
    
    // reset canvas
    window.dispatchEvent(new Event('clearCanvas'));

    if (isIntenseMode) {
      const initTime = useStore.getState().intenseTime || 8;
      setQTimeLeft(initTime);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setQTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            handleTimeout(c);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
  };

  const handleTimeout = (item: any) => {
    window.dispatchEvent(new CustomEvent('playSFX', { detail: 'no' }));
    setIsTimeoutState(true);
    setAnsText(item.a + '\n(超时自动切换)');
    setAnsPop(true);
    setTimeout(() => {
      mark(false, item);
    }, 1600);
  };

  const mark = (isOk: boolean, item = current) => {
    if (!item) return;

    if (isOk) {
      setSCorrect(c => c + 1);
      setSessionStreak(s => {
        const nextSprint = s + 1;
        if (nextSprint > 0 && nextSprint % 3 === 0) window.dispatchEvent(new CustomEvent('playSFX', { detail: 'streak' })); 
        else window.dispatchEvent(new CustomEvent('playSFX', { detail: 'yes' }));
        return nextSprint;
      });
    } else {
      setSWrong(w => w + 1);
      setSessionStreak(0);
      if (!isIntenseMode) window.dispatchEvent(new CustomEvent('playSFX', { detail: 'no' }));
      if (!wrongs.find(w => w.q === item.q)) {
        setWrongs([...wrongs, item]);
      }
    }

    if (useSpacedRepetition && !isIntenseMode) {
      updateItemStats(user?.id || 'guest', item, isOk, masteryThreshold);
    }

    const newPool = pool.filter(i => i !== item);
    setPool(newPool);
    setAnsPop(false);
    setIsTimeoutState(false);
    
    if (newPool.length === 0) {
      setFinished(true);
    } else {
      setTimeout(() => nextQ(newPool), 350);
    }
  };

  const pauseAndExit = () => {
    clearInterval(timerRef.current);
    if (pool.length > 0 || current) {
      setActiveSession({ pool, current, sCorrect, sWrong, qTimeLeft, isIntenseMode, sessionStreak });
    } else {
      setActiveSession(null);
    }
    setView('home');
  };

  return (
    <div className="fixed inset-0 bg-[var(--bg)] flex items-center justify-center z-50">
      <div className="w-[95%] max-w-[460px] max-h-[95vh] bg-[var(--card)] rounded-[20px] shadow-[0_16px_48px_rgba(0,0,0,0.10)] overflow-hidden flex flex-col border border-[var(--border)] relative z-10">
        
        {finished && (
          <div className="absolute inset-0 bg-[var(--bg)] z-[100] flex flex-col items-center justify-center text-center p-6 animate-in fade-in">
            <h2 className="font-serif text-2xl mb-2 text-[var(--title)]">完成挑战</h2>
            <p className="text-[var(--sub)] font-medium text-sm mb-4">正确 {sCorrect} | 错误 {sWrong}</p>
            <div className="flex flex-col gap-2.5 w-4/5 max-w-[220px]">
              <button className="btn btn-primary w-full" onClick={startSession}>再来一轮</button>
              <button className="btn btn-outline w-full" onClick={() => setView('home')}>返回首页</button>
            </div>
          </div>
        )}

          <div className="h-[3px] w-full bg-[var(--bg)] relative shrink-0">
          <div className="h-full bg-[var(--brand)] transition-all duration-300" style={{ width: `${filtered.length ? ((filtered.length - pool.length) / filtered.length) * 100 : 0}%` }}/>
        </div>

        <div className="flex justify-between items-center p-3 px-4 border-b border-[var(--border)] text-xs text-[var(--sub)] shrink-0 select-none">
          <span className="cursor-pointer px-2 py-1 hover:bg-[var(--bg)] rounded-lg text-[var(--title)] font-medium" onClick={pauseAndExit}>返回</span>
          <span className="cursor-pointer px-2 py-1 hover:bg-[var(--bg)] rounded-lg" onClick={() => openPanel('wrong-sidebar')}>错题</span>
          <span className="cursor-pointer px-2 py-1 hover:bg-[var(--bg)] rounded-lg font-medium text-[var(--title)] bg-[var(--bg)]" onClick={() => setIsIntenseMode(!isIntenseMode)}>
            {isIntenseMode ? '激烈' : '休闲'}
          </span>
          <span className="font-bold">{(!isIntenseMode && sessionStreak > 2) ? `🔥 ${sessionStreak}` : sessionStreak}</span>
          <span>{pool.length}</span>
        </div>

        <div className="p-7 text-center flex flex-col justify-center min-h-[120px] shrink-0 relative">
          {prepTime > 0 ? (
            <>
               <div className="text-[11px] text-[var(--brand)] mb-2.5 font-medium tracking-widest font-sans flex justify-center items-center">PREPARING</div>
               <div className="font-serif text-[28px] text-[var(--title)] m-0">准备迎接...</div>
            </>
          ) : current ? (
            <>
               <div className="text-[11px] text-[var(--brand)] mb-2.5 font-medium tracking-widest font-sans flex justify-center items-center gap-2">
                 <span>{current.cat || '综合'}</span>
                 {!isIntenseMode && <span className="text-[10px] px-2 py-0.5 rounded-lg border border-[var(--border)] text-[var(--sub)] tracking-normal">{getDifficultyInfo(user?.id || 'g', current, masteryThreshold).label}</span>}
               </div>
               <div className="font-serif text-[28px] text-[var(--title)] leading-[1.45] break-words m-0 transition-opacity">
                 {current.q}
               </div>
            </>
          ) : null}
        </div>

        <div className="relative w-full h-[35vh] min-h-[250px] bg-[var(--card)] border-y border-[var(--border)] flex-1 overflow-hidden">
           <div className="absolute inset-0 opacity-25 pointer-events-none" style={{ backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '33.33% 33.33%', backgroundPosition: 'center' }}/>
           {isIntenseMode && prepTime === 0 && (
             <div className="absolute inset-0 flex items-center justify-center text-[96px] font-sans text-[rgba(212,113,78,0.09)] pointer-events-none z-[1] tabular-nums">
               {qTimeLeft}
             </div>
           )}
           <canvas ref={canvasRef} id="main-board" className="relative z-10 w-full h-full cursor-crosshair touch-none" />
        </div>

        {!isIntenseMode && (
          <div className="grid grid-cols-5 gap-2 p-3 shrink-0">
            <button className="py-3 bg-[var(--bg)] rounded-xl text-[13px] font-medium text-[var(--text)] transition-all active:scale-95" onClick={() => window.dispatchEvent(new Event('clearCanvas'))}>清空</button>
            <button className="py-3 bg-[var(--bg)] rounded-xl text-[13px] font-medium text-[var(--text)] transition-all active:scale-95" onClick={() => window.dispatchEvent(new Event('undoCanvas'))}>撤销</button>
            <button className="py-3 bg-[var(--bg)] rounded-xl text-[13px] font-medium text-[var(--text)] transition-all active:scale-95" onClick={() => {
              window.dispatchEvent(new Event('toggleEraser'));
              const btn = document.getElementById('eraser-btn');
              if (btn) btn.innerText = btn.innerText === '橡皮' ? '画笔' : '橡皮';
            }} id="eraser-btn">画笔</button>
            <button className="py-3 bg-[var(--btn-main)] text-white rounded-xl text-[13px] font-medium shadow-sm transition-all active:scale-95 col-span-1 min-w-[80px]" onClick={() => {
              setAnsText(current?.a || '');
              setIsTimeoutState(false);
              setAnsPop(!ansPop);
            }}>核对</button>
            <button className="py-3 bg-[var(--bg)] rounded-xl text-[13px] font-medium text-[var(--text)] transition-all active:scale-95" onClick={() => nextQ()}>跳过</button>
          </div>
        )}

      </div>

      {ansPop && (
        <div className="fixed right-1/2 translate-x-1/2 md:right-5 md:translate-x-0 top-1/2 -translate-y-1/2 w-[88%] md:w-[285px] bg-[var(--card)] border border-[var(--border)] p-6 rounded-[22px] shadow-[0_20px_60px_rgba(0,0,0,0.14)] z-[200] text-center animate-in slide-in-from-right-8 duration-300">
          <span className="text-[11px] text-[var(--sub-light)] block mb-2.5">核对结果</span>
          <div className="font-serif text-[30px] text-[var(--title)] block mb-2.5 leading-[1.2] whitespace-pre-wrap">{ansText}</div>
          
          {!isTimeoutState && (
            <div className="flex gap-2.5 mt-4">
              <button className="flex-1 py-3 rounded-xl font-medium text-sm text-white bg-[var(--color-red)] shadow-[0_2px_8px_rgba(201,79,79,0.3)] active:scale-95 transition-transform" onClick={() => mark(false)}>记错</button>
              <button className="flex-1 py-3 rounded-xl font-medium text-sm text-white bg-[var(--color-green)] shadow-[0_2px_8px_rgba(82,130,92,0.3)] active:scale-95 transition-transform" onClick={() => mark(true)}>正确</button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
