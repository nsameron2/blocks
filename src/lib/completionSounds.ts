import completeBadSound from "../assets/sounds/complete-bad.mp3";
import completeGoodSound from "../assets/sounds/complete-good.mp3";
import completeNeutralSound from "../assets/sounds/complete-neutral.mp3";
import type { CompletionSound, CustomSound } from "./appState";
import type { CompletionTone } from "./types";

export const COMPLETION_SOUND_FILES: Record<CompletionTone, string> = {
  good: completeGoodSound,
  bad: completeBadSound,
  neutral: completeNeutralSound,
};

export function completionSoundSource(
  sound: CompletionSound,
  customSounds: CustomSound[],
) {
  if (isBuiltInCompletionSound(sound)) {
    return COMPLETION_SOUND_FILES[sound];
  }

  return customSounds.find((customSound) => customSound.id === sound)?.dataUrl ?? null;
}

function isBuiltInCompletionSound(sound: CompletionSound): sound is CompletionTone {
  return sound === "good" || sound === "bad" || sound === "neutral";
}
