/**
 * Ultra-Robust Chinese Voice & Audio Engine for Mobile Apps (Android & iOS)
 * 
 * 1. Native Android & iOS SpeechSynthesis Engine with fallback timeout guard
 * 2. Unblocked CORS-free HTML5 Audio Streaming for Baidu/Youdao/Server TTS MP3s
 * 3. Deduplication guard preventing duplicate voice overlays or repeated chime tones
 */

import { getBaseApiUrl } from '../lib/dbProxy';

// Silent 0.1s MP3 base64 to unlock mobile device audio channels
const SILENT_MP3 = 'data:audio/mp3;base64,SUQ3BAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABCAAdER0eHyAnLC8yNDc5Ozw/QEJERUZISkxNT1FSUlVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/4xAEOAAAAAAAAAAAAAABOT3RlAAAAAEFydGlzdAAAAGxpc3RlbAAnREVDUwAAAENyZWF0ZWQgd2l0aCBMQU1FIDMuMTAwAABMSU1FAAAAMy4xMDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//OEAAAAA3wAAAAAAAAAAA0AANAAA0AAB4AAAAAAAAA0AANAAAE//OEAAAAAAAAAAAAAAAANAAA0AANAAAeAAAAAAAAANAAA0AAA==';

let currentAudio: HTMLAudioElement | null = null;
let currentBufferSource: AudioBufferSourceNode | null = null;
let audioContext: AudioContext | null = null;
let unlockedAudioElement: HTMLAudioElement | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];

// Deduplication guard variables
let lastSpokenText: string = '';
let lastSpokenTime: number = 0;

// Initialize voices listener for WebViews
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    cachedVoices = window.speechSynthesis.getVoices() || [];
    window.speechSynthesis.onvoiceschanged = () => {
      try {
        cachedVoices = window.speechSynthesis.getVoices() || [];
      } catch (e) {}
    };
  } catch (e) {}
}

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
  if (currentBufferSource) {
    try {
      currentBufferSource.stop();
      currentBufferSource.disconnect();
      currentBufferSource = null;
    } catch (e) {}
  }

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
 * Web Audio synthesized pleasant chime tone
 */
export function playWebAudioChime(isHigh: boolean = true) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    if (!audioContext) audioContext = new AudioCtx();
    if (audioContext.state === 'suspended') audioContext.resume();

    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isHigh ? 587.33 : 440, now);
    osc.frequency.exponentialRampToValueAtTime(isHigh ? 880 : 329.63, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  } catch (e) {}
}

/**
 * Plays an MP3 audio URL using HTML5 Audio element without CORS restrictions
 */
function playSingleMp3(mp3Url: string, onEnd?: () => void, onError?: () => void) {
  try {
    // Note: Do NOT set audio.crossOrigin = 'anonymous'!
    // Unset crossOrigin allows HTML5 Audio to stream cross-origin MP3s directly on Android/iOS WebViews without CORS 403 blocks!
    const audio = unlockedAudioElement || new Audio();
    audio.src = mp3Url;
    audio.volume = 1.0;
    audio.muted = false;

    currentAudio = audio;

    let finished = false;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      if (currentAudio === audio) currentAudio = null;
    };

    audio.onended = () => {
      cleanup();
      if (onEnd) onEnd();
    };

    audio.onerror = (e) => {
      cleanup();
      if (onError) onError();
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        // Audio started playing successfully
      }).catch((err) => {
        cleanup();
        if (onError) onError();
      });
    }
  } catch (e) {
    if (onError) onError();
  }
}

/**
 * Try online Chinese TTS Audio Streams from Baota / Server proxy sequentially
 */
function playMp3AudioStreams(text: string, onEnd?: () => void) {
  const encodedText = encodeURIComponent(text);
  const baseUrl = getBaseApiUrl();

  const mp3Urls: string[] = [];

  // Priority 1: Direct production Baota server TTS API endpoints
  if (baseUrl && !baseUrl.includes('localhost') && !baseUrl.startsWith('file:') && !baseUrl.startsWith('capacitor:')) {
    mp3Urls.push(`${baseUrl}/api/tts?text=${encodedText}`);
  }
  
  // Add production domain endpoints for Android / iOS APK standalone shells
  mp3Urls.push(
    `https://admin.lyheiwandaijiamax.com/api/tts?text=${encodedText}`,
    `https://api.lyheiwandaijiamax.com/api/tts?text=${encodedText}`,
    `https://lyheiwandaijiamax.com/api/tts?text=${encodedText}`
  );

  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    mp3Urls.push(`/api/tts?text=${encodedText}`);
  }

  // Priority 2: Direct public speech endpoints as fallback
  mp3Urls.push(
    `https://dict.youdao.com/dictvoice?audio=${encodedText}&le=zh`,
    `https://tts.baidu.com/text2audio?cuid=baike&lan=ZH&ctp=1&paddmd=3&spd=5&tex=${encodedText}`
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
      // Stream failed on all endpoints - do NOT play chime automatically!
      if (onEnd) onEnd();
    }
  };

  tryNext();
}

/**
 * Main Chinese Voice Broadcast Entry for Mobile Apps (Android / iOS / Web)
 */
export function speakText(text: string, onEnd?: () => void) {
  if (!text || typeof window === 'undefined') {
    if (onEnd) onEnd();
    return;
  }

  const cleanText = String(text).trim();
  const now = Date.now();

  // Deduplication Guard: Ignore identical speech requests within 1500ms to prevent duplicate voice overlays
  if (cleanText === lastSpokenText && (now - lastSpokenTime) < 1500) {
    if (onEnd) onEnd();
    return;
  }
  lastSpokenText = cleanText;
  lastSpokenTime = now;

  initAudioUnlock();
  stopSpeaking();

  let hasResponded = false;
  let startTimeout: any = null;

  const triggerFallback = () => {
    if (hasResponded) return;
    hasResponded = true;
    if (startTimeout) {
      clearTimeout(startTimeout);
      startTimeout = null;
    }
    playMp3AudioStreams(cleanText, onEnd);
  };

  // Primary pipeline: Native SpeechSynthesis (Android & iOS)
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const utter = new SpeechSynthesisUtterance(cleanText);
      utter.lang = 'zh-CN';
      utter.volume = 1.0;
      utter.rate = 1.0;
      utter.pitch = 1.0;

      const voices = cachedVoices.length > 0 ? cachedVoices : (window.speechSynthesis.getVoices() || []);
      if (voices && voices.length > 0) {
        const zhVoice = voices.find(v => {
          const lang = (v.lang || '').toLowerCase();
          const name = (v.name || '').toLowerCase();
          return lang.includes('zh') || lang.includes('cn') || lang.includes('cmn') || name.includes('chinese') || name.includes('中文');
        });
        if (zhVoice) {
          utter.voice = zhVoice;
        }
      }

      utter.onstart = () => {
        if (hasResponded) return;
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

      utter.onerror = (e) => {
        triggerFallback();
      };

      // Set 800ms guard for Android WebView native TTS startup before switching to Baota server /api/tts
      startTimeout = setTimeout(() => {
        if (!hasResponded && !window.speechSynthesis.speaking) {
          triggerFallback();
        }
      }, 800);

      window.speechSynthesis.speak(utter);

      // On Android Chromium WebView, speech synthesis sometimes stays paused
      setTimeout(() => {
        try {
          if ('speechSynthesis' in window && window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        } catch (e) {}
      }, 100);

      return;
    } catch (e) {
      triggerFallback();
      return;
    }
  }

  triggerFallback();
}

