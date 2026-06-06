@import "tailwindcss";

@theme {
  --font-sans: system-ui, -apple-system, Inter, Roboto, "Noto Sans SC", "Noto Sans JP", "Noto Sans KR", sans-serif;
  --font-serif: Georgia, "Times New Roman", serif;
  --font-cn-title: "Noto Serif SC", Georgia, serif;
}

@layer base {
  :root {
    --bg: #f5f5f3;
    --bg2: #eeeeec;
    --title: #141414;
    --text: #1a1a1a;
    --sub: #707070;
    --sub-light: #9a9a9a;
    --card: #ffffff;
    --brand: #d4714e;
    --brand-light: rgba(212,113,78,0.12);
    --dot-inactive: #e0e0dd;
    --btn-main: #1c1c1e;
    --border: #d8d8d5;
    --color-red: #c94f4f;
    --color-green: #52825c;
  }

  .intense-mode {
    --bg: #0f0a0a;
    --bg2: #150d0d;
    --card: #1a1111;
    --text: #fdf5f5;
    --sub: #8b8b8b;
    --border: #2e1c1c;
    --title: #ffffff;
    --color-red: #d94848;
    --color-green: #c9813a;
    --brand: #d6833c;
    --btn-main: rgba(214,131,60,0.2);
  }

  body {
    @apply bg-[var(--bg)] text-[var(--text)] font-sans antialiased min-h-screen transition-colors duration-300;
  }
}

@layer components {
  .btn {
    @apply p-[15px] rounded-[14px] text-[15px] font-medium font-sans border-none cursor-pointer transition-all duration-200 text-center relative overflow-hidden inline-flex items-center justify-center leading-[1.2] active:scale-[0.97];
  }
  .btn-primary {
    @apply bg-[var(--btn-main)] text-white shadow-[0_2px_8px_rgba(0,0,0,0.18)] hover:bg-[#2c2c2e] hover:shadow-[0_4px_12px_rgba(0,0,0,0.24)];
  }
  
  .intense-mode .btn-primary {
    @apply hover:bg-[rgba(214,131,60,0.3)];
  }

  .btn-outline {
    @apply bg-transparent border border-[var(--border)] text-[var(--text)] hover:bg-[var(--bg2)];
  }

  .set-label {
    @apply block text-xs font-medium text-[var(--sub)] mb-[7px] text-left tracking-wider uppercase;
  }
}

  @keyframes star-breathe {
    0%, 100% { opacity: 0.85; transform: scale(1) rotate(0deg); }
    50% { opacity: 1; transform: scale(1.07) rotate(2deg); }
  }
  @keyframes star-think {
    0% { transform: rotate(0deg) scale(1); }
    25% { transform: rotate(15deg) scale(1.05); }
    50% { transform: rotate(0deg) scale(0.95); }
    75% { transform: rotate(-15deg) scale(1.05); }
    100% { transform: rotate(0deg) scale(1); }
  }
  @keyframes star-burst {
    0% { transform: scale(1); filter: brightness(1); }
    30% { transform: scale(1.4); filter: brightness(1.5); }
    60% { transform: scale(0.9); filter: brightness(1.2); }
    100% { transform: scale(1); filter: brightness(1); }
  }
  @keyframes star-spin-in {
    0% { opacity: 0; transform: scale(0.3) rotate(-180deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  
  .claude-star {
    @apply w-[34px] h-[34px] text-[var(--brand)] origin-center transition-colors duration-300 block shrink-0 z-10;
    shape-rendering: geometricPrecision;
    animation: star-breathe 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  .claude-star.large { @apply w-[48px] h-[48px]; }
  .claude-star.small { @apply w-[22px] h-[22px]; }
  .claude-star.thinking { animation: star-think 1.5s ease-in-out infinite; }
  .claude-star.celebrating { animation: star-burst 0.6s ease-out; }
  
  .canvas-area {
    @apply relative w-full h-[35vh] min-h-[250px] bg-[var(--card)] border-y border-[var(--border)] flex-1;
  }
  .grid-bg {
    @apply absolute inset-0 opacity-25 pointer-events-none;
    background-image:
      linear-gradient(var(--border) 1px, transparent 1px),
      linear-gradient(90deg, var(--border) 1px, transparent 1px);
    background-size: 33.33% 33.33%;
    background-position: center;
  }
  
input[type="text"], input[type="email"], input[type="password"], input[type="number"], textarea {
  @apply w-full py-[14px] px-[16px] rounded-[11px] border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] mb-3 text-[15px] outline-none transition-all duration-200 focus:border-[var(--brand)] focus:bg-[var(--card)] focus:shadow-[0_0_0_3px_rgba(212,113,78,0.1)] font-sans;
}

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

