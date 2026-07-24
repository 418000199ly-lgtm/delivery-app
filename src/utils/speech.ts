/**
 * Ultra-Robust Android WebView & Mobile Audio Engine for Driver App
 * 
 * Direct User Gesture Audio Unlock & Multi-Engine Chinese Speech Synthesis:
 * 1. Unlocks Web Audio Context & HTML5 Audio media channel on first user interaction
 * 2. Primary: Local Native SpeechSynthesis (Android WebView IPC delay fix + zh-CN voice routing)
 * 3. Secondary: Multi-provider Chinese TTS audio streaming with 'no-referrer' headers for Android WebViews
 * 4. Fallback: Web Audio Tri-tone Chime
 */

import { getBaseApiUrl } from '../lib/dbProxy';

// Silent 0.1s MP3 base64 to unlock Android native HTML5 Audio media channel
const SILENT_MP3 = 'data:audio/mp3;base64,SUQ3BAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABCAAdER0eHyAnLC8yNDc5Ozw/QEJERUZISkxNT1FSUlVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/4xAEOAAAAAAAAAAAAAABOT3RlAAAAAEFydGlzdAAAAGxpc3RlbAAnREVDUwAAAENyZWF0ZWQgd2l0aCBMQU1FIDMuMTAwAABMSU1FAAAAMy4xMDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//OEAAAAA3wAAAAAAAAAAA0AANAAA0AAB4AAAAAAAAA0AANAAAE//OEAAAAAAAAAAAAAAAANAAA0AANAAAeAAAAAAAAANAAA0AAA==';

let currentAudio: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;
let unlockedAudioElement: HTMLAudioElement | null = null;
let isUnlocked = false;

// Cached SpeechSynthesis voices for Android WebViews & iOS
let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshVoices(): SpeechSynthesisVoice[] {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        cachedVoices = v;
      }
    } catch (e) {}
  }
  return cachedVoices;
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
 * Directly unlocks Audio Context, HTML5 Audio channel, and SpeechSynthesis within user gesture.
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

    // 2. Unlock HTML5 Audio channel on Android WebView
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

    // 3. Unlock SpeechSynthesis safely without throwing
    if ('speechSynthesis' in window) {
      try {
        refreshVoices();
        window.speechSynthesis.resume();
        const dummyUtter = new SpeechSynthesisUtterance(' ');
        dummyUtter.lang = 'zh-CN';
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
  const events = ['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'];
  const handleUserGesture = () => {
    initAudioUnlock();
  };
  events.forEach(evt => window.addEventListener(evt, handleUserGesture, { passive: true }));
}

/**
 * Primary Local Native SpeechSynthesis (Android WebView & iOS Optimized)
 */
function speakWithLocalSynthesis(text: string, onEnd?: () => void, onErrorFallback?: () => void): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }

  try {
    const voices = refreshVoices();
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'zh-CN';
    utter.volume = 1.0;
    utter.rate = 1.0;
    utter.pitch = 1.0;

    if (voices && voices.length > 0) {
      // Filter out Google TTS voices when running in mainland China to avoid GFW connection timeouts
      const nonGoogleVoices = voices.filter(v => {
        const lang = (v.lang || '').toLowerCase();
        const name = (v.name || '').toLowerCase();
        const uri = (v.voiceURI || '').toLowerCase();
        return !name.includes('google') && !lang.includes('google') && !uri.includes('google');
      });

      const targetPool = nonGoogleVoices.length > 0 ? nonGoogleVoices : voices;

      // Domestic Chinese brand keywords (iFlytek, Huawei, Xiaomi, OPPO, Vivo, Honor, Samsung, etc.)
      const domesticBrandKeywords = [
        'iflytek', 'xfyun', '讯飞', 'xunfei', 'flytek',
        'huawei', 'hiai', 'celia', '小艺', '华为',
        'xiaomi', 'xiaoai', '小爱', 'miui', '小米',
        'oppo', 'vivo', 'heytap', 'breeno', '小布', 'coloros', 'funtouch',
        'honor', 'yoyo', '荣耀',
        'samsung', 'bixby', '三星',
        'baidu', 'sinovoice', 'sogou', '搜狗', 'xiaoxiao', 'yunyang', 'siri', 'tingting', 'meijia'
      ];

      // 1. Try to find a domestic brand specific Chinese voice
      let zhVoice = targetPool.find(v => {
        const lang = (v.lang || '').toLowerCase();
        const name = (v.name || '').toLowerCase();
        const isZh = lang.includes('zh') || lang.includes('cn') || lang.includes('cmn') || lang.includes('chi') || name.includes('chinese') || name.includes('中文');
        return isZh && domesticBrandKeywords.some(kw => name.includes(kw) || lang.includes(kw));
      });

      // 2. Fallback to any Chinese voice in the target pool
      if (!zhVoice) {
        zhVoice = targetPool.find(v => {
          const lang = (v.lang || '').toLowerCase();
          const name = (v.name || '').toLowerCase();
          return (
            lang.includes('zh') || 
            lang.includes('cn') || 
            lang.includes('cmn') || 
            lang.includes('chi') || 
            lang.includes('zho') || 
            name.includes('chinese') || 
            name.includes('中文') ||
            name.includes('mandarin')
          );
        });
      }

      if (zhVoice) {
        utter.voice = zhVoice;
        console.log('🎙️ [Speech Engine] Selected native voice:', zhVoice.name, '(', zhVoice.lang, ')');
      }
    }

    const activeSet = (window as any)._activeUtterances;
    if (activeSet) {
      activeSet.add(utter);
    }

    let hasEndedOrErrored = false;
    let keepAliveTimer: any = null;
    let fallbackTimeout: any = null;

    const cleanup = () => {
      if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
      }
      if (fallbackTimeout) {
        clearTimeout(fallbackTimeout);
        fallbackTimeout = null;
      }
      if (activeSet) {
        activeSet.delete(utter);
      }
    };

    utter.onstart = () => {
      console.log('⚡ [Speech Engine] Local SpeechSynthesis started playing on Android/iOS!');
      if (fallbackTimeout) {
        clearTimeout(fallbackTimeout);
        fallbackTimeout = null;
      }
      // Android keep-alive fix: call resume periodically so Android WebView doesn't pause TTS
      keepAliveTimer = setInterval(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.resume();
          } else {
            cleanup();
          }
        } else {
          cleanup();
        }
      }, 1200);
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

    // If local SpeechSynthesis on Android takes more than 1.8s to start, fallback to online stream
    fallbackTimeout = setTimeout(() => {
      if (!hasEndedOrErrored) {
        console.warn('⚠️ [Speech Engine] SpeechSynthesis start timeout on Android, falling back to audio stream...');
        hasEndedOrErrored = true;
        cleanup();
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
        if (onErrorFallback) onErrorFallback();
      }
    }, 1800);

    // 180ms delay allows Android native SpeechSynthesizer IPC service to process previous cancel()
    setTimeout(() => {
      try {
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utter);
      } catch (e) {
        if (!hasEndedOrErrored && onErrorFallback) {
          hasEndedOrErrored = true;
          cleanup();
          onErrorFallback();
        }
      }
    }, 180);

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

  // STEP 1: Attempt local native SpeechSynthesis FIRST (works on iOS & Android WebViews)
  const localInitiated = speakWithLocalSynthesis(text, onEnd, () => {
    console.warn('⚠️ [Speech Engine] Local synthesis error/unavailable, trying online TTS backup...');
    tryOnlineTTSProviders(text, onEnd);
  });

  if (localInitiated) {
    console.log('🎙️ [Speech Engine] Initiated local SpeechSynthesis utterance.');
    return;
  }

  // STEP 2: Fallback to online TTS providers
  console.warn('⚠️ [Speech Engine] Local SpeechSynthesis not supported, trying online TTS backup...');
  tryOnlineTTSProviders(text, onEnd);
}

/**
 * Online TTS Stream Fallback
 */
function tryOnlineTTSProviders(text: string, onEnd?: () => void) {
  const encodedText = encodeURIComponent(text);
  const baseUrl = getBaseApiUrl();

  const ttsProviders: string[] = [];

  // If baseUrl is a valid remote server (not localhost/file/empty)
  if (baseUrl && !baseUrl.includes('localhost') && !baseUrl.startsWith('file:') && !baseUrl.startsWith('capacitor:')) {
    ttsProviders.push(`${baseUrl}/api/tts?text=${encodedText}`);
  }

  // Direct Chinese TTS Audio Streams (with no-referrer header for Android WebView compatibility)
  ttsProviders.push(
    `https://dict.youdao.com/dictvoice?audio=${encodedText}&type=1`,
    `https://tts.baidu.com/text2audio?cuid=baike&lan=zh&ctp=1&padd=&spd=5&ptm=0&tex=${encodedText}`,
    `https://fanyi.baidu.com/gettts?lan=zh&text=${encodedText}&spd=5&source=web`,
    `https://api.oick.cn/txt/api.php?text=${encodedText}&speed=1`
  );

  let providerIndex = 0;

  const tryNext = () => {
    if (providerIndex < ttsProviders.length) {
      const url = ttsProviders[providerIndex];
      providerIndex++;
      playAudioStream(url, onEnd, () => {
        tryNext();
      });
    } else {
      console.warn('⚠️ [Speech Engine] All online TTS streams unreachable. Playing chime alert.');
      playChimeAlert(onEnd);
    }
  };

  tryNext();
}

/**
 * Plays an online audio stream URL with no-referrer header (critical for Android WebViews)
 */
function playAudioStream(url: string, onEnd?: () => void, onError?: () => void) {
  try {
    const audio = new Audio();
    // CRITICAL FOR ANDROID WEBVIEW: Set no-referrer so Youdao/Baidu CDN servers don't block file:// or capacitor:// requests
    audio.setAttribute('referrerpolicy', 'no-referrer');
    (audio as any).referrerPolicy = 'no-referrer';
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
      console.warn('[Speech Engine] Audio element load error for URL:', url, e);
      if (currentAudio === audio) {
        currentAudio = null;
      }
      if (onError) onError();
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log('⚡ [Speech Engine] Online Chinese TTS stream started playing successfully on Android!');
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



