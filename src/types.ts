export type CompletionTone = "good" | "bad" | "neutral";

export interface Block {
  id: number;
  name: string;
  color: string;
  percent: number;
  emoji: string;
  good: boolean | null;
}
