import { useEffect, useRef } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { useUIStore } from './store/useUIStore';
import { useStore } from './store/useStore';
import { supabase } from './lib/supabase';
import { ToastContainer } from './components/ui/ToastContainer';
import AuthPage from './pages/AuthPage';
import BankBuilderPage from './pages/BankBuilderPage';
import GlobalLoader from './components/ui/GlobalLoader';

export default function App() {
  const { user, setUser } = useAuthStore();
  const { currentView, setView, showLoader, hideLoader } = useUIStore();
  const { bgmEnabled, isIntenseMode } = useStore();

  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) {
        setView('bank_builder');
      } else {
        setView('auth');
      }
      hideLoader();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        if(useUIStore.getState().currentView === 'auth') {
          setView('bank_builder');
        }
      } else {
        setView('auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setView, hideLoader]);

  useEffect(() => {
    const playSFX = (e: any) => {
      const type = e.detail;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'yes') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.25, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'streak') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.22, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(); osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
      }
    };

    window.addEventListener('playSFX', playSFX);
    return () => window.removeEventListener('playSFX', playSFX);
  }, []);

  return (
    <div className={`w-full min-h-screen text-[var(--text)] flex justify-center items-center overflow-hidden relative ${isIntenseMode ? 'intense-mode' : ''}`}>
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.025]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")` }}
      />
      
      {!isIntenseMode && (
        <div className="fixed top-[30%] left-1/2 -translate-x-[50%] -translate-y-[50%] w-[600px] h-[400px] pointer-events-none z-0"
          style={{ background: 'radial-gradient(ellipse, rgba(212,113,78,0.06) 0%, transparent 70%)' }}
        />
      )}
      {isIntenseMode && (
        <div className="fixed top-[30%] left-1/2 -translate-x-[50%] -translate-y-[50%] w-[600px] h-[400px] pointer-events-none z-0"
          style={{ background: 'radial-gradient(ellipse, rgba(214,131,60,0.12) 0%, transparent 70%)' }}
        />
      )}
      
      <GlobalLoader />
      <ToastContainer />

      {currentView === 'auth' && <AuthPage />}
      {currentView === 'bank_builder' && <BankBuilderPage />}
    </div>
  );
}
