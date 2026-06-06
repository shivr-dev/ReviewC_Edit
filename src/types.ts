export type DictationItem = {
  id?: string;
  user_id?: string;
  group_name?: string;
  cat?: string;
  q: string;
  a: string;
};

export type MemoryStats = {
  wrong_count: number;
  consecutive_correct: number;
  memory_weight: number;
  last_seen: number | null;
};

export type ResourceShare = {
  id: string;
  title: string;
  description: string;
  cover_url: string;
  json_data: DictationItem[];
  uploader_id: string;
  uploader_email: string;
  created_at?: string;
};

export type SessionResult = {
  date: string;
  correct: number;
  wrong: number;
};
