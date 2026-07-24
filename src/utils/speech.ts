/**
 * Ultra-Robust Chinese Voice & Audio Engine for Mobile App (iOS & Android)
 * 
 * 1. Synchronous Native SpeechSynthesis (iOS Siri / Android System TTS) for 100% offline, zero-delay Chinese voice output in packaged APK/IPA apps.
 * 2. Automatic AudioContext & HTML5 Audio unlock on touch/gesture.
 * 3. High-availability online/proxy MP3 audio stream fallback.
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
 * Native OS Speech Synthesis (Works 100% offline on iOS Siri and Android System TTS)
 */
function speakWithNativeTTS(text: string, onEnd?: () => void, onError?: () => void): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }

  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'zh-CN';
    utter.volume = 1.0;
    utter.rate = 1.0;
    utter.pitch = 1.0;

    // Voice selection for Chinese
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
          name.includes('中文') ||
          name.includes('tingting') ||
          name.includes('sin-ji')
        );
      });
      if (zhVoice) {
        utter.voice = zhVoice;
      }
    }

    let handled = false;
    utter.onend = () => {
      if (handled) return;
      handled = true;
      console.log('🔊 [Speech Engine] Played natively via OS Speech Synthesis');
      if (onEnd) onEnd();
    };

    utter.onerror = (e) => {
      console.warn('⚠️ [Speech Engine] OS Speech Synthesis error:', e);
      if (handled) return;
      handled = true;
      if (onError) onError();
    };

    window.speechSynthesis.speak(utter);
    return true;
  } catch (e) {
    console.warn('⚠️ [Speech Engine] Exception in native TTS:', e);
    return false;
  }
}

/**
 * Plays an MP3 audio URL using Web Audio API or HTML5 Audio
 */
async function playMp3Audio(mp3Url: string, onEnd?: () => void, onError?: () => void) {
  // Method A: Try Web Audio API
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
          console.log('🔊 [Speech Engine] MP3 audio played via Web Audio API');
          if (onEnd) onEnd();
        };

        source.start(0);
        return;
      }
    }
  } catch (err) {
    console.warn('⚠️ [Speech Engine] Web Audio API decode failed:', err);
  }

  // Method B: HTML5 Audio element
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
      console.log('🔊 [Speech Engine] MP3 audio played via HTML5 Audio');
      if (onEnd) onEnd();
    };

    audio.onended = handleEnd;
    audio.onerror = () => {
      if (currentAudio === audio) currentAudio = null;
      if (onError) onError();
    };

    const p = audio.play();
    if (p !== undefined) {
      p.then(() => {}).catch((err) => {
        console.warn('⚠️ [Speech Engine] Audio play error:', err);
        if (currentAudio === audio) currentAudio = null;
        if (onError) onError();
      });
    }
  } catch (e) {
    if (onError) onError();
  }
}

/**
 * Main App Chinese Voice Broadcast Function
 * 
 * Supports both Native SpeechSynthesis (for offline GitHub/Capacitor/Cordova iOS & Android apps)
 * and MP3 Audio Streams.
 *
 * @param text The Chinese broadcast text
 * @param onEnd Callback after voice broadcast ends
 */
export function speakText(text: string, onEnd?: () => void) {
  if (!text || typeof window === 'undefined') {
    if (onEnd) onEnd();
    return;
  }

  console.log('📢 [Voice Engine] Requesting Voice Broadcast:', text);

  // Activate audio engine lock on mobile devices
  initAudioUnlock();
  stopSpeaking();

  // STEP 1: Attempt Native SpeechSynthesis FIRST (Works 100% offline on iOS & Android Apps)
  const nativeStarted = speakWithNativeTTS(text, onEnd, () => {
    // If native TTS triggers an error, fallback to MP3 stream
    tryOnlineMp3Fallback(text, onEnd);
  });

  if (!nativeStarted) {
    // STEP 2: Fallback to MP3 audio streams
    tryOnlineMp3Fallback(text, onEnd);
  }
}

/**
 * Online MP3 Stream Fallback
 */
function tryOnlineMp3Fallback(text: string, onEnd?: () => void) {
  const encodedText = encodeURIComponent(text);
  const baseUrl = getBaseApiUrl();

  const mp3Urls: string[] = [];

  if (baseUrl && !baseUrl.includes('localhost') && !baseUrl.startsWith('file:') && !baseUrl.startsWith('capacitor:')) {
    mp3Urls.push(`${baseUrl}/api/tts?text=${encodedText}`);
  }

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
      playMp3Audio(url, onEnd, () => {
        tryNext();
      });
    } else {
      console.warn('⚠️ [Voice Engine] All voice sources exhausted');
      if (onEnd) onEnd();
    }
  };

  tryNext();
}

