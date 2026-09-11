import { useRef, useState } from 'react';

// 10초/30초 라운드별 진행 음원. 선택한 종목과 무관하게 항상 둘 다 노출됨
// -- 종목이랑 실제 트는 음원이 꼭 같은 길이일 필요는 없다는 요청에 따라 분리.
// LiveCountEntry(실시간 측정)와 AdminBatchEntry(기록 관리) 둘 다 이 훅을
// 써서 재생 로직이 두 곳에서 따로 갈라지지 않게 함.
export type AudioDuration = 10 | 30;
export const ROUND_AUDIO: Record<AudioDuration, Record<1 | 3 | 5, string>> = {
  10: { 1: '/audio/10s-round1.mp3', 3: '/audio/10s-round3.mp3', 5: '/audio/10s-round5.mp3' },
  30: { 1: '/audio/30s-round1.mp3', 3: '/audio/30s-round3.mp3', 5: '/audio/30s-round5.mp3' },
};

export function useRoundAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  // Tracks which url is currently loaded into audioRef so a repeat click on
  // the same round toggles play/pause instead of restarting from 0.
  const loadedAudioUrlRef = useRef<string | null>(null);
  const [activeTrack, setActiveTrack] = useState<{ duration: AudioDuration; round: 1 | 3 | 5 } | null>(
    null
  );

  const playRound = (duration: AudioDuration, round: 1 | 3 | 5) => {
    const url = ROUND_AUDIO[duration][round];
    const audio = audioRef.current;
    if (!audio) return;
    // Direct, synchronous play() call inside the click handler -- keeps the
    // call attributed to the user gesture so browsers don't block autoplay.
    if (loadedAudioUrlRef.current === url) {
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
      return;
    }
    audio.src = url;
    loadedAudioUrlRef.current = url;
    setActiveTrack({ duration, round });
    audio.play().catch(() => {});
  };

  return { audioRef, activeTrack, playRound };
}
