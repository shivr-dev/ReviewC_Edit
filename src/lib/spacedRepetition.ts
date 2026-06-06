import { DictationItem, MemoryStats } from '../types';

export const WEIGHT_DEFAULT = 100;
export const WEIGHT_MAX = 600;
export const WEIGHT_MIN = 5;
export const REVIEW_BOOST_DAYS = 3;

export function getItemKey(item: DictationItem) {
  if (item.id) return String(item.id);
  const str = item.q + item.a;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return 'q_' + hash;
}

export function getMemoryStatsMap(userId: string): Record<string, MemoryStats> {
  return JSON.parse(localStorage.getItem(`mem_stats_${userId}`) || '{}');
}

export function saveMemoryStatsMap(userId: string, stats: Record<string, MemoryStats>) {
  localStorage.setItem(`mem_stats_${userId}`, JSON.stringify(stats));
}

export function getItemStats(userId: string, item: DictationItem): MemoryStats {
  const map = getMemoryStatsMap(userId);
  const key = getItemKey(item);
  return map[key] || { wrong_count: 0, consecutive_correct: 0, memory_weight: WEIGHT_DEFAULT, last_seen: null };
}

export function updateItemStats(userId: string, item: DictationItem, isCorrect: boolean, masteryThreshold: number) {
  const map = getMemoryStatsMap(userId);
  const key = getItemKey(item);
  const stats = map[key] || { wrong_count: 0, consecutive_correct: 0, memory_weight: WEIGHT_DEFAULT, last_seen: null };
  
  if (isCorrect) {
    stats.consecutive_correct++;
    stats.memory_weight = Math.max(WEIGHT_MIN, Math.round(stats.memory_weight * Math.max(0.4, 0.7 - stats.consecutive_correct * 0.04)));
  } else {
    stats.consecutive_correct = 0;
    stats.wrong_count++;
    stats.memory_weight = Math.min(WEIGHT_MAX, Math.round(stats.memory_weight * (1.6 + Math.min(stats.wrong_count, 5) * 0.08) + 60));
  }
  stats.last_seen = Date.now();
  map[key] = stats;
  saveMemoryStatsMap(userId, map);
}

export function getEffectiveWeight(userId: string, item: DictationItem, masteryThreshold: number): number {
  const stats = getItemStats(userId, item);
  let w = stats.memory_weight;
  let daysSince = 0;
  if (stats.last_seen) {
    daysSince = (Date.now() - stats.last_seen) / (1000 * 60 * 60 * 24);
    if (daysSince > REVIEW_BOOST_DAYS) {
      w = Math.min(WEIGHT_MAX, w + Math.floor(daysSince * 15));
    }
  }
  if (stats.consecutive_correct >= masteryThreshold) {
    return (daysSince >= 1) ? Math.min(WEIGHT_DEFAULT, WEIGHT_MIN + Math.floor(daysSince * 8)) : 0;
  }
  return w;
}

export function weightedPick(userId: string, items: DictationItem[], useSpacedRepetition: boolean, masteryThreshold: number): DictationItem {
  if (!useSpacedRepetition || items.length === 0) {
    return items[Math.floor(Math.random() * items.length)];
  }
  let valid = items.filter(i => getEffectiveWeight(userId, i, masteryThreshold) > 0);
  if (valid.length === 0) valid = items; // fallback
  const weights = valid.map(i => getEffectiveWeight(userId, i, masteryThreshold));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < valid.length; i++) {
    r -= weights[i];
    if (r <= 0) return valid[i];
  }
  return valid[valid.length - 1];
}

export function getDifficultyInfo(userId: string, item: DictationItem, masteryThreshold: number) {
  const stats = getItemStats(userId, item);
  const w = stats.memory_weight;
  if (stats.consecutive_correct >= masteryThreshold) return { label: '已掌握' };
  if (w <= 30) return { label: '熟悉' };
  if (w <= 120) return { label: '学习中' };
  if (stats.wrong_count === 0 && stats.consecutive_correct === 0) return { label: '初见' };
  return { label: '需强化' };
}
