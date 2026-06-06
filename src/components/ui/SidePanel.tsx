import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';

export default function SidePanel({
  id, 
  title, 
  children,
  side = 'right'
}: {
  id: string;
  title: string;
  children: ReactNode;
  side?: 'left' | 'right';
}) {
  const { activePanel, closePanels } = useUIStore();
  const isOpen = activePanel === id;

  return (
    <>
      <div 
        className={cn(
          "fixed inset-0 z-[1500] pointer-events-none transition-all duration-350",
          isOpen && "pointer-events-auto bg-black/20 backdrop-blur-sm"
        )}
        onClick={closePanels}
      />
      <div 
        className={cn(
          "fixed top-0 w-full max-w-[360px] h-full bg-[var(--bg)] z-[2000] p-8 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          side === 'right' ? "right-0 border-l border-[var(--border)] translate-x-[110%] shadow-[-4px_0_24px_rgba(0,0,0,0.06)]" 
                           : "left-0 border-r border-[var(--border)] -translate-x-[110%] shadow-[4px_0_24px_rgba(0,0,0,0.06)]",
          isOpen && "translate-x-0"
        )}
      >
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h2 className="m-0 text-[19px] text-[var(--title)] font-serif whitespace-nowrap">{title}</h2>
          <button 
            className="bg-[var(--bg2)] border-none w-[30px] h-[30px] rounded-full flex items-center justify-center text-[var(--sub)] cursor-pointer transition-colors hover:bg-[var(--border)] hover:text-[var(--title)]"
            onClick={closePanels}
          >
            <X size={16} strokeWidth={2.5}/>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col">
          {children}
        </div>
      </div>
    </>
  );
}
