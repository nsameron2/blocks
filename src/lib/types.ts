export type CompletionTone = "good" | "bad" | "neutral";

export const BLOCK_COLOR_VALUES = [
  "bg-gray-500",
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
] as const;

export type BlockColor = (typeof BLOCK_COLOR_VALUES)[number];

export interface Block {
  id: number;
  name: string;
  color: string;
  percent: number;
  emoji: string;
  good: boolean | null;
}
