export type MoodType = 'great' | 'good' | 'neutral' | 'bad' | 'terrible';

export interface JournalEntry {
  id: number;
  entry_date: string;
  started_at: string;
  ended_at: string | null;
  mood: MoodType | null;
  content: string;
  is_locked: boolean;
  pin_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface MoodOption {
  value: MoodType;
  emoji: string;
  label: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
  { value: 'great', emoji: '😄', label: 'Great' },
  { value: 'good', emoji: '🙂', label: 'Good' },
  { value: 'neutral', emoji: '😐', label: 'Neutral' },
  { value: 'bad', emoji: '😕', label: 'Bad' },
  { value: 'terrible', emoji: '😞', label: 'Terrible' },
];
