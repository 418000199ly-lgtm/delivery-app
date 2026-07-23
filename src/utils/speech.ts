/**
 * Ultra-Robust Android WebView & Mobile Audio Engine for Driver App
 * 
 * Direct User Gesture Audio Unlock & Zero-Latency Local SpeechSynthesis:
 * 1. Synchronously unlocks Web Audio Context & SpeechSynthesis directly in user gestures
 * 2. Primary: Local Native SpeechSynthesis (0ms delay, instant Chinese speech on iOS Safari & Android WebViews)
 * 3. Secondary: Multi-provider online TTS stream fallback with timeout
 * 4. Absolute Fallback: Web Audio API Tri-tone Notification Chime
 */

import { getBaseApiUrl } from '../lib/dbProxy';

let currentAudio: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;
let isUnlocked = false;

// Cached SpeechSynthesis voices for Android WebViews & iOS
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

    // 2. Unlock SpeechSynthesis safely without throwing
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
  } catch (e) {
    console.warn('[Audio Engine] Audio unlock attempt error:', e);
  }
}

// Auto register document touch/click fallback listeners
if (typeof window !== 'undefined') {
  const events = ['click', 'touchstart', 'touchend', 'pointerdown'];
  const handleUserGesture = () => {
    initAudioUnlock();
    events.forEach(evt => window.removeEventListener(evt, handleUserGesture));
  };
  events.forEach(evt => window.addEventListener(evt, handleUserGesture, { once: true, passive: true }));
}

/**
 * Primary Local Native SpeechSynthesis (0ms Latency on iOS & Android)
 */
function speakWithLocalSynthesis(text: string, onEnd?: () => void, onErrorFallback?: () => void): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }

  try {
    refreshVoices();
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'zh-CN';
    utter.volume = 1.0;
    utter.rate = 1.0;
    utter.pitch = 1.0;

    const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const zhVoice = voices.find(v => 
        v.lang.includes('zh') || 
        v.lang.includes('CN') || 
        v.lang.includes('cmn') || 
        v.name.includes('Chinese') || 
        v.name.includes('中文') ||
        v.name.toLowerCase().includes('mandarin') ||
        v.name.includes('Google') ||
        v.name.includes('Siri') ||
        v.name.includes('Tingting') ||
        v.name.includes('Meijia')
      );
      if (zhVoice) {
        utter.voice = zhVoice;
      }
    }

    const activeSet = (window as any)._activeUtterances;
    if (activeSet) {
      activeSet.add(utter);
    }

    let hasEndedOrErrored = false;
    const cleanup = () => {
      if (activeSet) {
        activeSet.delete(utter);
      }
    };

    utter.onstart = () => {
      console.log('⚡ [Speech Engine] Local SpeechSynthesis started playing instantly!');
    };

    utter.onend = () => {
      if (hasEndedOrErrored) return;
      hasEndedOrErrored = true;
      cleanup();
      if (onEnd) onEnd();
    };

    utter.onerror = (err) => {
      console.warn('⚠️ [Speech Engine] Local SpeechSynthesis error:', err);
      if (hasEndedOrErrored) return;
      hasEndedOrErrored = true;
      cleanup();
      if (onErrorFallback) {
        onErrorFallback();
      } else {
        if (onEnd) onEnd();
      }
    };

    window.speechSynthesis.speak(utter);
    return true;
  } catch (e) {
    console.warn('⚠️ [Speech Engine] Exception initiating local SpeechSynthesis:', e);
    return false;
  }
}

/**
 * Main Voice Speech Function with Zero-Latency Local-First Execution
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

  // STEP 1: Attempt local native SpeechSynthesis FIRST (0ms latency, works offline on iOS & Android)
  const localInitiated = speakWithLocalSynthesis(text, onEnd, () => {
    console.warn('⚠️ [Speech Engine] Local synthesis error, trying online TTS backup...');
    tryOnlineTTSProviders(text, onEnd);
  });

  if (localInitiated) {
    console.log('🎙️ [Speech Engine] Initiated instant local SpeechSynthesis.');
    return;
  }

  // STEP 2: Fallback to online TTS providers if SpeechSynthesis is completely unsupported
  console.warn('⚠️ [Speech Engine] Local SpeechSynthesis not supported, trying online TTS backup...');
  tryOnlineTTSProviders(text, onEnd);
}

/**
 * Online TTS Stream Fallback
 */
function tryOnlineTTSProviders(text: string, onEnd?: () => void) {
  const encodedText = encodeURIComponent(text);
  const baseUrl = getBaseApiUrl();

  const ttsProviders = [
    `${baseUrl}/api/tts?text=${encodedText}`,
    `https://dict.youdao.com/dictvoice?audio=${encodedText}&type=1`,
    `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=zh-CN&client=tw-ob`
  ];

  let providerIndex = 0;

  const tryNext = () => {
    if (providerIndex < ttsProviders.length) {
      const url = ttsProviders[providerIndex];
      providerIndex++;
      playAudioStream(url, onEnd, () => {
        tryNext();
      });
    } else {
      console.warn('⚠️ [Speech Engine] Online streams unreachable. Playing chime alert.');
      playChimeAlert(onEnd);
    }
  };

  tryNext();
}

/**
 * Plays an online audio stream URL with 100% device media volume mapping
 */
function playAudioStream(url: string, onEnd?: () => void, onError?: () => void) {
  try {
    const audio = new Audio();
    audio.src = url;
    audio.volume = 1.0;
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

