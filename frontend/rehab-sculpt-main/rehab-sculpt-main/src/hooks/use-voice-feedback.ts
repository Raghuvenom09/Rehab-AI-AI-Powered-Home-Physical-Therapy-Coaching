import { useState, useRef, useCallback } from "react";

export function useVoiceFeedback(cooldownMs: number = 5000) {
  const [enabled, setEnabled] = useState(true);
  const lastSpoke = useRef(0);
  const lastText = useRef("");

  const speak = useCallback(
    (text: string) => {
      if (!enabled) return;
      if (!text || text === lastText.current) return;

      const now = Date.now();
      if (now - lastSpoke.current < cooldownMs) return;

      if (!("speechSynthesis" in window)) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;

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

  const speakNow = useCallback(
    (text: string) => {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;

      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.lang.startsWith("en") && v.name.includes("Google")
      );
      if (preferred) utterance.voice = preferred;

      window.speechSynthesis.speak(utterance);
      lastSpoke.current = Date.now();
      lastText.current = text;
    },
    []
  );

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      if (prev) window.speechSynthesis?.cancel();
      return !prev;
    });
  }, []);

  return { speak, speakNow, enabled, toggle };
}