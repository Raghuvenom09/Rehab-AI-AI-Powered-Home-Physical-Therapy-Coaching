import { useState, useRef, useCallback } from "react";

/**
 * Voice feedback hook using Web Speech API.
 * Throttled to speak at most once every `cooldownMs` milliseconds.
 */
export function useVoiceFeedback(cooldownMs: number = 5000) {
  const [enabled, setEnabled] = useState(false);
  const lastSpoke = useRef(0);
  const lastText = useRef("");

  const speak = useCallback(
    (text: string) => {
      if (!enabled) return;
      if (!text || text === lastText.current) return;

      const now = Date.now();
      if (now - lastSpoke.current < cooldownMs) return;

      // Check browser support
      if (!("speechSynthesis" in window)) return;

      // Cancel any in-progress speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;

      // Try to use a natural-sounding voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.lang.startsWith("en") && v.name.includes("Google")
      );
      if (preferred) utterance.voice = preferred;

      window.speechSynthesis.speak(utterance);
      lastSpoke.current = now;
      lastText.current = text;
    },
    [enabled, cooldownMs]
  );

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      if (prev) {
        // Turning off — cancel any in-progress speech
        window.speechSynthesis?.cancel();
      }
      return !prev;
    });
  }, []);

  return { speak, enabled, toggle };
}
