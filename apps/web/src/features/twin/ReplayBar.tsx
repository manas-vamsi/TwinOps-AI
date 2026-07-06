"use client";

import { useEffect } from "react";
import { Pause, Play, X } from "lucide-react";
import { useState } from "react";
import { useTwinStore } from "@/stores/twinStore";

/** Playback controls shown while replaying an incident on the twin. */
export function ReplayBar() {
  const frames = useTwinStore((s) => s.replayFrames);
  const index = useTwinStore((s) => s.replayIndex);
  const setIndex = useTwinStore((s) => s.setReplayIndex);
  const stop = useTwinStore((s) => s.stopReplay);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!frames || !playing) return;
    const id = setInterval(() => {
      const s = useTwinStore.getState();
      if (!s.replayFrames) return;
      if (s.replayIndex >= s.replayFrames.length - 1) {
        setPlaying(false); // reached the end
      } else {
        s.setReplayIndex(s.replayIndex + 1);
      }
    }, 900);
    return () => clearInterval(id);
  }, [frames, playing]);

  if (!frames) return null;
  const atEnd = index >= frames.length - 1;

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-4 z-20 mx-auto flex w-[min(560px,90%)] items-center gap-3 rounded-xl border border-hairline bg-chrome/90 px-4 py-2.5 backdrop-blur">
      <button
        type="button"
        onClick={() => (atEnd ? (setIndex(0), setPlaying(true)) : setPlaying((p) => !p))}
        aria-label={playing ? "Pause" : "Play"}
        className="flex size-8 items-center justify-center rounded-lg bg-accent text-cream transition-colors hover:bg-accent-strong"
      >
        {playing && !atEnd ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>

      <span className="font-mono text-xs text-muted">
        {index + 1}/{frames.length}
      </span>

      <input
        type="range"
        min={0}
        max={frames.length - 1}
        value={index}
        onChange={(e) => {
          setPlaying(false);
          setIndex(Number(e.target.value));
        }}
        aria-label="Replay position"
        className="h-1 flex-1 accent-[var(--color-accent)]"
      />

      <span className="text-xs text-faint">Replay</span>

      <button
        type="button"
        onClick={stop}
        aria-label="Exit replay"
        className="flex size-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-raised hover:text-text"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
