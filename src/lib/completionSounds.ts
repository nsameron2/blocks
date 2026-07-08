import completeBadSound from "../assets/sounds/complete-bad.mp3";
import completeCompleteSound from "../assets/sounds/complete-complete.mp3";
import completeGoodSound from "../assets/sounds/complete-good.mp3";
import completeNeutralSound from "../assets/sounds/complete-neutral.mp3";
import {
  isBuiltInCompletionSound,
  type BuiltInCompletionSound,
  type CompletionSound,
  type CustomSound,
} from "./appState";

export const COMPLETION_SOUND_FILES: Record<BuiltInCompletionSound, string> = {
  good: completeGoodSound,
  bad: completeBadSound,
  neutral: completeNeutralSound,
  timer: completeCompleteSound,
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
