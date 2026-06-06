import { useToastStore } from '@/store/useToastStore';
import { cn } from '@/lib/utils';

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div id="toast-container" className="fixed top-5 right-5 z-[999999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "text-white px-5 py-3 rounded-xl text-sm font-medium shadow-lg animate-in slide-in-from-right-10 fade-in duration-300",
            t.type === 'error' && "bg-[#c94f4f]",
            t.type === 'success' && "bg-[#52825c]",
            t.type === 'info' && "bg-[#1c1c1e]"
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
