/**
 * Ultra-Robust Android WebView & Mobile Audio Engine for Driver App
 * 
 * Direct User Gesture Audio Unlock & Volume Syncing:
 * 1. Synchronously unlocks Web Audio Context & SpeechSynthesis directly in click handlers (e.g. 'Test Voice' button)
 * 2. Multi-provider online TTS stream (Google Translate TTS / Youdao / Baidu) with local SpeechSynthesis fallback
 * 3. 100% Volume gain mapping to Android & iOS System Media Volume (adjustable via phone side buttons)
 */

import { getBaseApiUrl } from '../lib/dbProxy';

let currentAudio: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;
let isUnlocked = false;

// Cached SpeechSynthesis voices for Android WebViews
let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshVoices() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      cachedVoices = window.speechSynthesis.getVoices();
    } catch (e) {}
  }
}

if (typeof window !== 'undefined') {
  (window as any)._activeUtterances = (window as any)._activeUtterances || new Set();
  
  if ('speechSynthesis' in window) {
    refreshVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = refreshVoices;
    }
  }
}

/**
 * Directly unlocks Audio Context and SpeechSynthesis within the user gesture execution context.
 * Calling this directly in onClick (such as clicking "Test Voice") activates audio immediately.
 */
export function initAudioUnlock() {
  if (typeof window === 'undefined') return;

  try {
    // 1. Unlock Web Audio Context
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      if (!audioContext) {
        audioContext = new AudioCtx();
      }
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      // Play instant silent buffer to establish user media gesture permission
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
    }

    // 2. Unlock SpeechSynthesis safely without throwing on empty string
    if ('speechSynthesis' in window) {
      try {
        refreshVoices();
        window.speechSynthesis.resume();
        const dummyUtter = new SpeechSynthesisUtterance(' ');
        dummyUtter.volume = 0.001;
        dummyUtter.onerror = () => {};
        dummyUtter.onend = () => {};
        window.speechSynthesis.speak(dummyUtter);
      } catch (e) {
        // Ignore dummy unlock error
      }
    }

    isUnlocked = true;
    console.log('🔊 [Audio Engine] Audio Context directly unlocked via user action!');
  } catch (e) {
    console.warn('[Audio Engine] Audio unlock attempt error:', e);
  }
}

// Auto register document click fallback listeners
if (typeof window !== 'undefined') {
  const events = ['click', 'touchstart', 'touchend', 'pointerdown'];
  const handleUserGesture = () => {
    initAudioUnlock();
    events.forEach(evt => window.removeEventListener(evt, handleUserGesture));
  };
  events.forEach(evt => window.addEventListener(evt, handleUserGesture, { once: true, passive: true }));
}

/**
 * Main Voice Speech Function with Multi-Stream Failover & Volume Normalization
 * 
 * @param text The Chinese text to speak
 * @param onEnd Callback function when speech finishes
 */
export function speakText(text: string, onEnd?: () => void) {
  if (!text || typeof window === 'undefined') {
    if (onEnd) onEnd();
    return;
  }

  console.log('🗣️ [Speech Engine] Speech requested:', text);

  // Synchronously activate audio engine in current tick
  initAudioUnlock();

  // Stop previous speech/audio
  stopSpeaking();

  const encodedText = encodeURIComponent(text);
  const baseUrl = getBaseApiUrl();

  // Multi-provider TTS stream URL candidates (including high-availability Google Translate Mandarin Chinese TTS)
  const ttsProviders = [
    `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=zh-CN&client=tw-ob`,
    `https://dict.youdao.com/dictvoice?audio=${encodedText}&type=1`,
    `https://tts.baidu.com/text2audio?cuid=baike&lan=zh&ctp=1&padd=&spd=5&ptm=0&tex=${encodedText}`,
    `${baseUrl}/api/tts?text=${encodedText}`
  ];

  let providerIndex = 0;

  const tryNextTTSProvider = () => {
    if (providerIndex < ttsProviders.length) {
      const url = ttsProviders[providerIndex];
      providerIndex++;
      playAudioStream(url, onEnd, () => {
        console.warn(`⚠️ [Speech Engine] Stream provider ${providerIndex} failed, trying fallback...`);
        tryNextTTSProvider();
      });
    } else {
      console.warn('⚠️ [Speech Engine] Online streams unreachable. Falling back to local SpeechSynthesis...');
      fallbackToLocalSpeechSynthesis(text, onEnd);
    }
  };

  tryNextTTSProvider();
}

/**
 * Plays an online audio stream URL with 100% device media volume mapping
 */
function playAudioStream(url: string, onEnd?: () => void, onError?: () => void) {
  try {
    const audio = new Audio();
    // Note: DO NOT set audio.crossOrigin = 'anonymous' as it triggers CORS preflight errors in Android WebView on remote audio media streams
    audio.src = url;
    audio.volume = 1.0; // 100% volume -> mapped directly to Android/iOS media volume
    audio.muted = false;

    currentAudio = audio;

    let hasHandledEnd = false;
    const handleEnd = () => {
      if (hasHandledEnd) return;
      hasHandledEnd = true;
      if (currentAudio === audio) {
        currentAudio = null;
      }
      if (onEnd) onEnd();
    };

    audio.onended = handleEnd;

    audio.onerror = (e) => {
      console.warn('[Speech Engine] Audio element load error:', e);
      if (currentAudio === audio) {
        currentAudio = null;
      }
      if (onError) onError();
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log('⚡ [Speech Engine] Audio stream started successfully!');
      }).catch((err) => {
        console.warn('⚠️ [Speech Engine] Audio play promise rejected:', err);
        if (currentAudio === audio) {
          currentAudio = null;
        }
        if (onError) onError();
      });
    }
  } catch (err) {
    console.warn('[Speech Engine] Exception in playAudioStream:', err);
    if (onError) onError();
  }
}

/**
 * Fallback to browser's SpeechSynthesis API with explicit Chinese Voice Selection for Android WebViews
 */
function fallbackToLocalSpeechSynthesis(text: string, onEnd?: () => void) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'zh-CN';
      utter.volume = 1.0;
      utter.rate = 1.0;
      utter.pitch = 1.0;

      // Android WebView Fix: Explicitly select a Chinese voice if available
      refreshVoices();
      const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const zhVoice = voices.find(v => 
          v.lang.includes('zh') || 
          v.lang.includes('CN') || 
          v.lang.includes('cmn') || 
          v.name.includes('Chinese') || 
          v.name.includes('中文') ||
          v.name.toLowerCase().includes('mandarin')
        );
        if (zhVoice) {
          utter.voice = zhVoice;
        }
      }

      const activeSet = (window as any)._activeUtterances;
      if (activeSet) {
        activeSet.add(utter);
      }

      const cleanup = () => {
        if (activeSet) {
          activeSet.delete(utter);
        }
      };

      utter.onend = () => {
        cleanup();
        if (onEnd) onEnd();
      };

      utter.onerror = (e) => {
        console.warn('⚠️ [Speech Engine] Local SpeechSynthesis unavailable or cancelled:', e?.error || e);
        cleanup();
        playChimeAlert(onEnd);
      };

      window.speechSynthesis.speak(utter);
      console.log('🎙️ [Speech Engine] Speaking via local SpeechSynthesis engine');
    } catch (e) {
      console.warn('⚠️ [Speech Engine] Local SpeechSynthesis exception:', e);
      playChimeAlert(onEnd);
    }
  } else {
    playChimeAlert(onEnd);
  }
}

/**
 * Absolute Fallback: Web Audio API Tri-tone Notification Chime
 */
export function playChimeAlert(onEnd?: () => void) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) {
      if (onEnd) onEnd();
      return;
    }

    if (!audioContext) {
      audioContext = new AudioCtx();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const now = audioContext.currentTime;
    const frequencies = [783.99, 987.77, 1046.50];

    frequencies.forEach((freq, idx) => {
      if (!audioContext) return;
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.8, now + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.25);

      osc.connect(gain);
      gain.connect(audioContext.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.3);
    });

    setTimeout(() => {
      if (onEnd) onEnd();
    }, 600);
  } catch (e) {
    console.warn('[Speech Engine] Chime sound alert error:', e);
    if (onEnd) onEnd();
  }
}

/**
 * Stop any active broadcasts instantly
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
      if ((window as any)._activeUtterances) {
        (window as any)._activeUtterances.clear();
      }
    } catch (e) {}
  }
}
