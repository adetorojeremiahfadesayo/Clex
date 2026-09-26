"use client";

import { useEffect, useRef, useState } from "react";

interface Recognition {
  lang: string; interimResults: boolean; continuous: boolean;
  start(): void; stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
type RecognitionCtor = new () => Recognition;

/** Browser speech input and read-aloud via the Web Speech API, when the browser supports it. */
export function useVoice(onText: (text: string) => void) {
  const [canListen, setCanListen] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const cb = useRef(onText);
  useEffect(() => { cb.current = onText; }, [onText]);
  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    // Feature detection has to run after hydration.
    /* eslint-disable react-hooks/set-state-in-effect */
    setCanListen(!!Ctor);
    setCanSpeak("speechSynthesis" in window);
    /* eslint-enable react-hooks/set-state-in-effect */
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = navigator.language || "en-GB";
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e) => { const t = Array.from(e.results).map((x) => x[0]?.transcript ?? "").join(" ").trim(); if (t) cb.current(t); };
    r.onend = () => setListening(false);
    r.onerror = (e) => { setListening(false); setError(e.error === "not-allowed" ? "Microphone access was blocked." : "Didn't catch that. Try again."); };
    rec.current = r;
    return () => r.stop();
  }, []);
  return {
    canListen, canSpeak, listening, error,
    listen() { setError(null); if (!rec.current) return; if (listening) { rec.current.stop(); return; } setListening(true); rec.current.start(); },
    speak(text: string) { if (!canSpeak) return; speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(text)); },
    stopSpeaking() { if (canSpeak) speechSynthesis.cancel(); },
  };
}
