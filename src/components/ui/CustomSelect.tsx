import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export default function CustomSelect({ 
  value, 
  options, 
  onChange,
  className
}: {
  value: string | number;
  options: { value: string | number; label: string }[];
  onChange: (val: any) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const selectedOption = options.find(o => o.value == value);

  return (
    <div ref={ref} className={cn("relative w-full mb-3", className)}>
      <div 
        className={cn(
          "w-full py-[14px] px-[16px] rounded-[11px] bg-[var(--bg)] text-[14px] text-[var(--text)] cursor-pointer flex justify-between items-center border border-[var(--border)] select-none transition-all duration-200 font-sans",
          open && "border-[var(--brand)] bg-[var(--card)] shadow-[0_0_0_3px_rgba(212,113,78,0.1)]"
        )}
        onClick={() => setOpen(!open)}
      >
        {selectedOption?.label}
        <span className={cn("text-[12px] text-[var(--sub)] transition-transform duration-300", open && "rotate-180")}>▾</span>
      </div>
      
      <div className={cn(
        "absolute top-[calc(100%+4px)] left-0 right-0 bg-[var(--card)] border border-[var(--border)] rounded-xl max-h-[220px] overflow-y-auto z-[5000] opacity-0 pointer-events-none -translate-y-2 transition-all duration-200 shadow-lg",
        open && "opacity-100 pointer-events-auto translate-y-0"
      )}>
        {options.map((opt, i) => (
          <div 
            key={opt.value}
            className={cn(
              "p-[13px_16px] text-[14px] cursor-pointer transition-colors duration-150 font-sans",
              i !== options.length - 1 && "border-b border-[var(--bg)]",
              value == opt.value 
                ? "text-[var(--brand)] font-medium bg-[var(--brand-light)]" 
                : "text-[var(--text)] hover:bg-[var(--bg2)] hover:text-[var(--brand)]"
            )}
            onClick={() => {
              onChange(opt.value);
              setOpen(false);
            }}
          >
            {opt.label}
          </div>
        ))}
      </div>
    </div>
  );
}
