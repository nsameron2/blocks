import completeBadSound from "../assets/sounds/complete-bad.mp3";
import completeGoodSound from "../assets/sounds/complete-good.mp3";
import completeNeutralSound from "../assets/sounds/complete-neutral.mp3";
import type { CompletionTone } from "./types";

export const COMPLETION_SOUND_FILES: Record<CompletionTone, string> = {
  good: completeGoodSound,
  bad: completeBadSound,
  neutral: completeNeutralSound,
};
