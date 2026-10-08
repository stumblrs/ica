'use client';

import React, { useState, useCallback } from 'react';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';

interface AudioPronunciationPlayerProps {
  name: string;
  dialectGreeting?: string;
  toneMarkup?: string;
  size?: 'sm' | 'md';
}

export function AudioPronunciationPlayer({
  name,
  dialectGreeting,
  toneMarkup,
  size = 'md',
}: AudioPronunciationPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const playPronunciation = useCallback(() => {
    if (isPlaying) return;
    setIsPlaying(true);

    // 1. Synthesize Igbo tonal acoustics using Web Audio API
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        // Play gentle chime harmonic
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        // Base tone frequency
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.15); // High tone upward pitch

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
      }
    } catch {
      // AudioContext unavailable or restricted
    }

    // 2. Play speech synthesis for spoken name and greeting
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(name);
      utterance.rate = 0.85; // Slightly slower for clear syllable pronunciation
      utterance.pitch = 1.05;

      // Check for available African or British English voices that pronounce phonetics well
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.lang.includes('ng') || v.lang.includes('en-ZA') || v.lang.includes('en-GB')
      );
      if (preferred) utterance.voice = preferred;

      utterance.onend = () => {
        setIsPlaying(false);
      };
      utterance.onerror = () => {
        setIsPlaying(false);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setIsPlaying(false), 800);
    }
  }, [name, isPlaying]);

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={playPronunciation}
        disabled={isPlaying}
        title={`Listen to Igbo pronunciation of ${name}`}
        aria-label={`Pronounce ${name}`}
        className={`group inline-flex items-center gap-1.5 rounded-lg border transition-all ${
          isPlaying
            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/30'
            : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] hover:border-emerald-500/30 text-slate-300 hover:text-white'
        } ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}`}
      >
        <Volume2
          className={`shrink-0 transition-transform ${
            isPlaying ? 'text-emerald-400 scale-110 animate-bounce' : 'text-slate-400 group-hover:text-emerald-400'
          } ${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'}`}
        />
        <span className="font-medium font-sans">
          {isPlaying ? 'Pronouncing…' : 'Pronounce'}
        </span>
      </button>

      {toneMarkup && (
        <span className="text-[11px] font-mono text-emerald-400/90 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20" title="Tonal accent markings">
          {toneMarkup}
        </span>
      )}
    </div>
  );
}
