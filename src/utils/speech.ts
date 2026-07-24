/**
 * Ultra-Robust Chinese Voice & Audio Engine for Mobile Apps (Android & iOS)
 * 
 * 1. Dual-Engine Architecture: High-speed native SpeechSynthesis + High-Availability MP3 Audio Stream Player.
 * 2. 200ms `onstart` guard: Automatically detects silent/hung SpeechSynthesis on Android WebViews and instantly falls back to MP3 audio streams.
 * 3. Mobile Audio Channel Unlocker: Automatically un-mutes Web Audio Context & HTML5 Audio element on touch/click.
 */

import { getBaseApiUrl } from '../lib/dbProxy';

// Silent 0.1s MP3 base64 to unlock mobile device audio channels
const SILENT_MP3 = 'data:audio/mp3;base64,SUQ3BAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABCAAdER0eHyAnLC8yNDc5Ozw/QEJERUZISkxNT1FSUlVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/4xAEOAAAAAAAAAAAAAABOT3RlAAAAAEFydGlzdAAAAGxpc3RlbAAnREVDUwAAAENyZWF0ZWQgd2l0aCBMQU1FIDMuMTAwAABMSU1FAAAAMy4xMDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//OEAAAAA3wAAAAAAAAAAA0AANAAA0AAB4AAAAAAAAA0AANAAAE//OEAAAAAAAAAAAAAAAANAAA0AANAAAeAAAAAAAAANAAA0AAA==';

let currentAudio: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;
let unlockedAudioElement: HTMLAudioElement | null = null;
let isUnlocked = false;

/**
 * Unlocks Web Audio Context, HTML5 Audio channel, and SpeechSynthesis on user gesture.
 */
export function initAudioUnlock() {
  if (typeof window === 'undefined') return;

  try {
    // 1. Web Audio Context Unlock
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      if (!audioContext) {
        audioContext = new AudioCtx();
      }
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
    }

    // 2. HTML5 Audio Channel Unlock for iOS Safari & Android WebView
    if (!unlockedAudioElement) {
      try {
        const a = new Audio(SILENT_MP3);
        a.setAttribute('referrerpolicy', 'no-referrer');
        a.volume = 0.01;
        const p = a.play();
        if (p !== undefined) {
          p.then(() => {
            unlockedAudioElement = a;
          }).catch(() => {});
        }
      } catch (e) {}
    }

    // 3. Native SpeechSynthesis Pipeline Resume / Unlock
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.resume();
      } catch (e) {}
    }

    isUnlocked = true;
  } catch (e) {
    console.warn('[Audio Engine] Unlock notice:', e);
  }
}

// Global gesture listeners to ensure audio is always unlocked on mobile devices
if (typeof window !== 'undefined') {
  const events = ['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'];
  const handleGesture = () => {
    initAudioUnlock();
  };
  events.forEach(evt => window.addEventListener(evt, handleGesture, { passive: true }));
}

/**
 * Stop any active audio playback or speech immediately
 */
export function stopSpeaking() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    } catch (e) {}
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
}

/**
 * Plays an MP3 audio URL using HTML5 Audio + Web Audio API fallback.
 */
async function playSingleMp3(mp3Url: string, onEnd?: () => void, onError?: () => void) {
  // Method A: Try Web Audio API fetch and decode
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      if (!audioContext) {
        audioContext = new AudioCtx();
      }
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const res = await fetch(mp3Url, { mode: 'cors' });
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(buffer);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);

        let finished = false;
        source.onended = () => {
          if (finished) return;
          finished = true;
          console.log('🔊 [Voice Engine] MP3 audio played via Web Audio API');
          if (onEnd) onEnd();
        };

        source.start(0);
        return;
      }
    }
  } catch (err) {
    console.warn('⚠️ [Voice Engine] Web Audio API decode skipped/failed:', err);
  }

  // Method B: HTML5 Audio element fallback
  try {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.setAttribute('referrerpolicy', 'no-referrer');
    audio.src = mp3Url;
    audio.volume = 1.0;
    audio.muted = false;

    currentAudio = audio;

    let finished = false;
    const handleEnd = () => {
      if (finished) return;
      finished = true;
      if (currentAudio === audio) {
        currentAudio = null;
      }
      console.log('🔊 [Voice Engine] MP3 audio played via HTML5 Audio element');
      if (onEnd) onEnd();
    };

    audio.onended = handleEnd;
    audio.onerror = () => {
      if (currentAudio === audio) currentAudio = null;
      if (onError) onError();
    };

    const p = audio.play();
    if (p !== undefined) {
      p.then(() => {
        console.log('⚡ [Voice Engine] Playing MP3 audio stream...');
      }).catch((err) => {
        console.warn('⚠️ [Voice Engine] Audio play error:', err);
        if (currentAudio === audio) currentAudio = null;
        if (onError) onError();
      });
    }
  } catch (e) {
    if (onError) onError();
  }
}

/**
 * Try online/proxy MP3 Audio Stream Sources sequentially
 */
function playMp3AudioStreams(text: string, onEnd?: () => void) {
  const encodedText = encodeURIComponent(text);
  const baseUrl = getBaseApiUrl();

  const mp3Urls: string[] = [];

  // Primary: Server TTS Endpoint
  if (baseUrl && !baseUrl.includes('localhost') && !baseUrl.startsWith('file:') && !baseUrl.startsWith('capacitor:')) {
    mp3Urls.push(`${baseUrl}/api/tts?text=${encodedText}`);
  } else {
    mp3Urls.push(`/api/tts?text=${encodedText}`);
  }

  // Backup High-Availability MP3 Speech Engines
  mp3Urls.push(
    `https://dict.youdao.com/dictvoice?audio=${encodedText}&type=1`,
    `https://tts.baidu.com/text2audio?cuid=baike&lan=zh&ctp=1&padd=&spd=5&ptm=0&tex=${encodedText}`,
    `https://fanyi.baidu.com/gettts?lan=zh&text=${encodedText}&spd=5&source=web`
  );

  let attemptIndex = 0;

  const tryNext = () => {
    if (attemptIndex < mp3Urls.length) {
      const url = mp3Urls[attemptIndex];
      attemptIndex++;
      playSingleMp3(url, onEnd, () => {
        tryNext();
      });
    } else {
      console.warn('⚠️ [Voice Engine] All voice MP3 sources exhausted');
      if (onEnd) onEnd();
    }
  };

  tryNext();
}

/**
 * Main Chinese Voice Broadcast Entry
 * 
 * Safe execution pipeline:
 * 1. Checks native SpeechSynthesis with a strict 200ms `onstart` guard.
 * 2. If Android WebView is silent or fails to start speaking within 200ms, seamlessly switches to MP3 audio stream.
 */
export function speakText(text: string, onEnd?: () => void) {
  if (!text || typeof window === 'undefined') {
    if (onEnd) onEnd();
    return;
  }

  console.log('📢 [Voice Engine] Requesting Voice Broadcast:', text);

  initAudioUnlock();
  stopSpeaking();

  let hasResponded = false;
  let startTimeout: any = null;

  const triggerFallbackMp3 = () => {
    if (hasResponded) return;
    hasResponded = true;
    if (startTimeout) {
      clearTimeout(startTimeout);
      startTimeout = null;
    }
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {}
    console.log('🔄 [Voice Engine] Native TTS silent/timeout (Android WebView guard triggered), switching to MP3 audio stream...');
    playMp3AudioStreams(text, onEnd);
  };

  // Attempt Native SpeechSynthesis with guard
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'zh-CN';
      utter.volume = 1.0;
      utter.rate = 1.0;
      utter.pitch = 1.0;

      // Select Chinese voice if available
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const zhVoice = voices.find(v => {
          const lang = (v.lang || '').toLowerCase();
          const name = (v.name || '').toLowerCase();
          return (
            lang.includes('zh') || 
            lang.includes('cn') || 
            lang.includes('cmn') || 
            name.includes('chinese') || 
            name.includes('中文')
          );
        });
        if (zhVoice) {
          utter.voice = zhVoice;
        }
      }

      utter.onstart = () => {
        if (hasResponded) return;
        console.log('⚡ [Voice Engine] Native SpeechSynthesis started playing Chinese text successfully!');
        if (startTimeout) {
          clearTimeout(startTimeout);
          startTimeout = null;
        }
      };

      utter.onend = () => {
        if (hasResponded) return;
        hasResponded = true;
        if (startTimeout) {
          clearTimeout(startTimeout);
          startTimeout = null;
        }
        if (onEnd) onEnd();
      };

      utter.onerror = () => {
        triggerFallbackMp3();
      };

      // Set 200ms start guard: If native TTS hasn't started speaking in 200ms (standard Android WebView silence bug), fallback to MP3 audio stream
      startTimeout = setTimeout(() => {
        if (!hasResponded) {
          triggerFallbackMp3();
        }
      }, 200);

      window.speechSynthesis.speak(utter);
      return;
    } catch (e) {
      triggerFallbackMp3();
      return;
    }
  }

  // If speechSynthesis is not in window, go straight to MP3 audio
  triggerFallbackMp3();
}


