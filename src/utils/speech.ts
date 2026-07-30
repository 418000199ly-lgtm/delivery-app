/**
 * Bulletproof Chinese Voice & Audio Engine for Mobile Apps (Android APK, iOS & Web)
 * 
 * Key Features & Fixes for Android (Huawei EMUI / Xiaomi / Oppo / Vivo) & iOS:
 * 1. Native Capacitor TextToSpeech (@capacitor-community/text-to-speech) with 1800ms Promise.race timeout guard.
 * 2. WebView Native SpeechSynthesis Engine: Does NOT require getVoices() array to be pre-populated.
 *    Works directly with Android System Default Engine (e.g., iFlytek / 讯飞语音引擎 / Huawei TTS).
 * 3. Web Audio API (AudioContext) chime pre-signal + Hardware DAC unlock.
 * 4. Multi-Endpoint MP3 Stream Redundancy with pre-unlocked HTML5 Audio element.
 */

import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { getBaseApiUrl } from '../lib/dbProxy';

// Silent 0.1s MP3 base64 to unlock mobile device audio channels
const SILENT_MP3 = 'data:audio/mp3;base64,SUQ3BAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABCAAdER0eHyAnLC8yNDc5Ozw/QEJERUZISkxNT1FSUlVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/4xAEOAAAAAAAAAAAAAABOT3RlAAAAAEFydGlzdAAAAGxpc3RlbAAnREVDUwAAAENyZWF0ZWQgd2l0aCBMQU1FIDMuMTAwAABMSU1FAAAAMy4xMDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//OEAAAAA3wAAAAAAAAAAA0AANAAA0AAB4AAAAAAAAA0AANAAAE//OEAAAAAAAAAAAAAAAANAAA0AANAAAeAAAAAAAAANAAA0AAA==';

let audioContext: AudioContext | null = null;
let globalAudioElement: HTMLAudioElement | null = null;
let currentBufferSource: AudioBufferSourceNode | null = null;
let currentAudio: HTMLAudioElement | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];

// Deduplication guard variables
let lastSpokenText: string = '';
let lastSpokenTime: number = 0;

/**
 * Get or create the global unlocked Web Audio API Context
 */
export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioContext = new AudioCtx();
      }
    } catch (e) {
      console.warn('[AudioEngine] Could not create AudioContext:', e);
    }
  }
  return audioContext;
}

/**
 * Unlocks Web Audio Context, HTML5 Audio channel, and SpeechSynthesis on user gesture.
 */
export function initAudioUnlock() {
  if (typeof window === 'undefined') return;

  try {
    // 1. Unlock Web Audio API Context
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      // Play a 1-frame silent buffer to fully warm up hardware DAC on Android/iOS
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    }

    // 2. Pre-create and unlock HTML5 Audio element
    if (!globalAudioElement) {
      try {
        const a = new Audio(SILENT_MP3);
        a.volume = 0.01;
        const p = a.play();
        if (p !== undefined) {
          p.then(() => {
            globalAudioElement = a;
          }).catch(() => {});
        }
      } catch (e) {}
    }

    // 3. Resume native SpeechSynthesis & trigger voice loading
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.resume();
        if (cachedVoices.length === 0) {
          cachedVoices = window.speechSynthesis.getVoices() || [];
        }
      } catch (e) {}
    }
  } catch (e) {
    console.warn('[AudioEngine] Unlock exception:', e);
  }
}

// Attach global touch & click listeners so audio channel is ALWAYS unlocked on mobile devices
if (typeof window !== 'undefined') {
  const events = ['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'];
  const handleGesture = () => {
    initAudioUnlock();
  };
  events.forEach(evt => window.addEventListener(evt, handleGesture, { passive: true }));

  // Register voices changed listener
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.onvoiceschanged = () => {
        try {
          cachedVoices = window.speechSynthesis.getVoices() || [];
        } catch (e) {}
      };
    } catch (e) {}
  }
}

/**
 * Stop any active audio playback or speech immediately
 */
export function stopSpeaking() {
  // 1. Stop Native Capacitor TextToSpeech
  if (Capacitor.isNativePlatform()) {
    try {
      TextToSpeech.stop().catch(() => {});
    } catch (e) {}
  }

  // 2. Stop Web Audio Buffer
  if (currentBufferSource) {
    try {
      currentBufferSource.stop();
      currentBufferSource.disconnect();
      currentBufferSource = null;
    } catch (e) {}
  }

  // 3. Stop HTML5 Audio
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    } catch (e) {}
  }

  // 4. Stop Web SpeechSynthesis
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
}

/**
 * Synthesize pleasant Web Audio chime tone for instant audio feedback
 */
export function playWebAudioChime(isHigh: boolean = true) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isHigh ? 587.33 : 440, now);
    osc.frequency.exponentialRampToValueAtTime(isHigh ? 880 : 329.63, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  } catch (e) {}
}

/**
 * Play audio buffer via Web Audio API
 */
async function playAudioBuffer(arrayBuffer: ArrayBuffer, onEnd?: () => void): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    stopSpeaking();

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    currentBufferSource = source;

    return new Promise((resolve) => {
      let ended = false;
      const finish = (success: boolean) => {
        if (ended) return;
        ended = true;
        if (currentBufferSource === source) currentBufferSource = null;
        if (onEnd) onEnd();
        resolve(success);
      };

      source.onended = () => finish(true);
      source.start(0);
    });
  } catch (e) {
    console.warn('[AudioEngine] Web Audio decode/play failed:', e);
    return false;
  }
}

/**
 * Fallback: Play single MP3 via HTML5 Audio element
 */
function playSingleMp3Element(mp3Url: string, onEnd?: () => void, onError?: () => void) {
  try {
    stopSpeaking();

    const audio = globalAudioElement || new Audio();
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

    audio.onerror = () => {
      cleanup();
      if (onError) onError();
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        // Playing successfully
      }).catch(() => {
        cleanup();
        if (onError) onError();
      });
    }
  } catch (e) {
    if (onError) onError();
  }
}

/**
 * Fetch and play MP3 audio streams sequentially using Web Audio API (Primary) and Audio Element (Fallback)
 */
async function playMp3AudioStreams(text: string, onEnd?: () => void) {
  const cleanText = String(text).trim();
  const encodedText = encodeURIComponent(cleanText);
  const baseUrl = getBaseApiUrl();

  const mp3Urls: string[] = [];

  // Priority 1: Direct production Baota server TTS API endpoints
  if (baseUrl && !baseUrl.includes('localhost') && !baseUrl.startsWith('file:') && !baseUrl.startsWith('capacitor:')) {
    mp3Urls.push(`${baseUrl}/api/tts?text=${encodedText}`);
  }
  
  // Production server domain endpoints for Android / iOS standalone APK shells
  mp3Urls.push(
    `https://admin.lyheiwandaijiamax.com/api/tts?text=${encodedText}`,
    `https://api.lyheiwandaijiamax.com/api/tts?text=${encodedText}`,
    `https://lyheiwandaijiamax.com/api/tts?text=${encodedText}`
  );

  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    mp3Urls.push(`/api/tts?text=${encodedText}`);
  }

  // Priority 2: Public Chinese TTS APIs
  mp3Urls.push(
    `https://dict.youdao.com/dictvoice?audio=${encodedText}&le=zh`,
    `https://tts.baidu.com/text2audio?cuid=baike&lan=ZH&ctp=1&paddmd=3&spd=5&tex=${encodedText}`
  );

  // Attempt Web Audio API fetch + buffer decode playback first
  for (const url of mp3Urls) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer && arrayBuffer.byteLength > 500) {
          const success = await playAudioBuffer(arrayBuffer, onEnd);
          if (success) {
            return;
          }
        }
      }
    } catch (err) {
      // Try next URL
    }
  }

  // Fall back to HTML5 Audio element streaming
  let attemptIndex = 0;
  const tryNextElement = () => {
    if (attemptIndex < mp3Urls.length) {
      const url = mp3Urls[attemptIndex];
      attemptIndex++;
      playSingleMp3Element(url, onEnd, () => {
        tryNextElement();
      });
    } else {
      if (onEnd) onEnd();
    }
  };

  tryNextElement();
}

/**
 * Try Browser/WebView Native SpeechSynthesis (Works on Android WebViews including Huawei EMUI 10 with iFlytek engine)
 */
function tryWebSpeechSynthesis(text: string, onEnd?: () => void): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve(false);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const voices = cachedVoices.length > 0 ? cachedVoices : (window.speechSynthesis.getVoices() || []);
      const zhVoice = voices.find(v => {
        const lang = (v.lang || '').toLowerCase();
        const name = (v.name || '').toLowerCase();
        return lang.includes('zh') || lang.includes('cn') || lang.includes('cmn') || name.includes('chinese') || name.includes('中文');
      });

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'zh-CN';
      utter.volume = 1.0;
      utter.rate = 1.0;
      utter.pitch = 1.0;

      if (zhVoice) {
        utter.voice = zhVoice;
      }

      let hasFinished = false;

      // Keep-alive ticker for Android WebViews (prevents EMUI from freezing SpeechSynthesis)
      const keepAliveTimer = setInterval(() => {
        try {
          if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        } catch (e) {}
      }, 150);

      const cleanup = () => {
        clearInterval(keepAliveTimer);
      };

      utter.onstart = () => {
        // Speech successfully started in Android WebView / Browser!
      };

      utter.onend = () => {
        if (hasFinished) return;
        hasFinished = true;
        cleanup();
        if (onEnd) onEnd();
        resolve(true);
      };

      utter.onerror = (err) => {
        if (hasFinished) return;
        hasFinished = true;
        cleanup();
        console.warn('[AudioEngine] SpeechSynthesis utterance error:', err);
        resolve(false);
      };

      // Safety fallback timer: if SpeechSynthesis fails to finish or start within estimated duration
      const maxDuration = Math.max(2500, text.length * 350);
      setTimeout(() => {
        if (!hasFinished) {
          hasFinished = true;
          cleanup();
          try { window.speechSynthesis.cancel(); } catch (e) {}
          resolve(false);
        }
      }, maxDuration);

      window.speechSynthesis.speak(utter);

      // Force resume immediately after speak call
      setTimeout(() => {
        try { window.speechSynthesis.resume(); } catch (e) {}
      }, 50);

    } catch (e) {
      console.warn('[AudioEngine] tryWebSpeechSynthesis exception:', e);
      resolve(false);
    }
  });
}

/**
 * Main Chinese Voice Broadcast Entry for Mobile Apps (Android APK, iOS, Web)
 */
export async function speakText(text: string, onEnd?: () => void) {
  if (!text || typeof window === 'undefined') {
    if (onEnd) onEnd();
    return;
  }

  const cleanText = String(text).trim();
  const now = Date.now();

  // Deduplication Guard: Ignore identical speech requests within 1000ms
  if (cleanText === lastSpokenText && (now - lastSpokenTime) < 1000) {
    if (onEnd) onEnd();
    return;
  }
  lastSpokenText = cleanText;
  lastSpokenTime = now;

  // 1. Play immediate audio chime & trigger tactile vibration feedback on Android / iOS
  playWebAudioChime(true);
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate([100, 50, 100]); } catch (e) {}
  }

  initAudioUnlock();
  stopSpeaking();

  // LEVEL 1: Capacitor Native Android / iOS System TTS Engine with 1800ms Timeout Guard
  if (Capacitor.isNativePlatform()) {
    try {
      await TextToSpeech.stop().catch(() => {});
      
      const nativeSuccess = await Promise.race([
        TextToSpeech.speak({
          text: cleanText,
          lang: 'zh-CN',
          rate: 1.0,
          pitch: 1.0,
          volume: 1.0,
        }).then(() => true).catch(() => false),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1800))
      ]);

      if (nativeSuccess) {
        if (onEnd) onEnd();
        return;
      }
      console.warn('[AudioEngine] Capacitor native TTS speak timed out or failed, falling back to Web SpeechSynthesis / MP3');
    } catch (nativeErr) {
      console.warn('[AudioEngine] Capacitor native TTS exception:', nativeErr);
    }
  }

  // LEVEL 2: Browser / WebView Native SpeechSynthesis Engine
  // (Works directly on Android 10 / Huawei EMUI with iFlytek / 讯飞语音引擎)
  const speechSuccess = await tryWebSpeechSynthesis(cleanText, onEnd);
  if (speechSuccess) {
    return;
  }

  // LEVEL 3: Web Audio API PCM Decode + Baota / Youdao / Baidu High Quality MP3 Streams
  playMp3AudioStreams(cleanText, onEnd);
}
