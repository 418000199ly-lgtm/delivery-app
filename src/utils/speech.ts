/**
 * Ultra-Robust Android & iOS Domestic Chinese Speech Engine for Driver App
 * 
 * Specifically optimized for Mainland China Android phones (Huawei, iFlytek, Xiaomi, OPPO, Vivo, Honor, Samsung)
 * 1. Native SpeechSynthesis route with Android System TTS Engine binding (iFlytek / Huawei Speech Service)
 * 2. Multi-provider High-Availability Chinese TTS Audio Streams (Youdao, Baidu, Oick, App Server Proxy)
 * 3. NO chime/beep prompt fallbacks (strictly speech voice output as requested)
 */

import { getBaseApiUrl } from '../lib/dbProxy';

// Silent 0.1s MP3 base64 to unlock Android native HTML5 Audio media channel
const SILENT_MP3 = 'data:audio/mp3;base64,SUQ3BAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABCAAdER0eHyAnLC8yNDc5Ozw/QEJERUZISkxNT1FSUlVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/4xAEOAAAAAAAAAAAAAABOT3RlAAAAAEFydGlzdAAAAGxpc3RlbAAnREVDUwAAAENyZWF0ZWQgd2l0aCBMQU1FIDMuMTAwAABMSU1FAAAAMy4xMDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//OEAAAAA3wAAAAAAAAAAA0AANAAA0AAB4AAAAAAAAA0AANAAAE//OEAAAAAAAAAAAAAAAANAAA0AANAAAeAAAAAAAAANAAA0AAA==';

let currentAudio: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;
let unlockedAudioElement: HTMLAudioElement | null = null;
let isUnlocked = false;

// Cached SpeechSynthesis voices
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
 * Unlocks Audio Context, HTML5 Audio channel, and SpeechSynthesis within user gesture.
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

    // 2. HTML5 Audio Channel Unlock for Android WebViews
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

    // 3. SpeechSynthesis Engine Unlock
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
      } catch (e) {}
    }

    isUnlocked = true;
  } catch (e) {
    console.warn('[Speech Engine] Audio unlock attempt error:', e);
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
 * Primary Native SpeechSynthesis (Fully compatible with Huawei / iFlytek / Domestic Android TTS)
 */
function speakWithLocalSynthesis(text: string, onEnd?: () => void, onErrorFallback?: () => void): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }

  try {
    const voices = refreshVoices();
    window.speechSynthesis.resume();

    const utter = new SpeechSynthesisUtterance(text);
    // Explicitly set language for Android System TTS Engine (iFlytek / Huawei)
    utter.lang = 'zh-CN';
    utter.volume = 1.0;
    utter.rate = 1.0;
    utter.pitch = 1.0;

    if (voices && voices.length > 0) {
      // Filter out Google TTS voices to avoid GFW timeouts in mainland China
      const nonGoogleVoices = voices.filter(v => {
        const lang = (v.lang || '').toLowerCase();
        const name = (v.name || '').toLowerCase();
        const uri = (v.voiceURI || '').toLowerCase();
        return !name.includes('google') && !lang.includes('google') && !uri.includes('google');
      });

      const targetPool = nonGoogleVoices.length > 0 ? nonGoogleVoices : voices;

      const domesticBrandKeywords = [
        'iflytek', 'xfyun', '讯飞', 'xunfei', 'flytek',
        'huawei', 'hiai', 'celia', '小艺', '华为',
        'xiaomi', 'xiaoai', '小爱', 'miui', '小米',
        'oppo', 'vivo', 'heytap', 'breeno', '小布', 'coloros', 'funtouch',
        'honor', 'yoyo', '荣耀',
        'samsung', 'bixby', '三星',
        'baidu', 'sinovoice', 'sogou', '搜狗', 'xiaoxiao', 'yunyang', 'siri', 'tingting', 'meijia'
      ];

      let zhVoice = targetPool.find(v => {
        const lang = (v.lang || '').toLowerCase();
        const name = (v.name || '').toLowerCase();
        const isZh = lang.includes('zh') || lang.includes('cn') || lang.includes('cmn') || lang.includes('chi') || name.includes('chinese') || name.includes('中文');
        return isZh && domesticBrandKeywords.some(kw => name.includes(kw) || lang.includes(kw));
      });

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
      console.log('⚡ [Speech Engine] Native SpeechSynthesis started playing Chinese text successfully!');
      if (fallbackTimeout) {
        clearTimeout(fallbackTimeout);
        fallbackTimeout = null;
      }
      // Android keep-alive loop
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

    // If local SpeechSynthesis on Android takes more than 400ms to start, fallback to built-in audio stream immediately
    fallbackTimeout = setTimeout(() => {
      if (!hasEndedOrErrored) {
        console.warn('⚠️ [Speech Engine] SpeechSynthesis start timeout on Android (no native TTS response in 400ms), falling back to built-in Chinese audio stream...');
        hasEndedOrErrored = true;
        cleanup();
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
        if (onErrorFallback) onErrorFallback();
      }
    }, 400);

    // Trigger speech cleanly
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
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
      }, 50);
    } else {
      window.speechSynthesis.speak(utter);
    }

    return true;
  } catch (e) {
    console.warn('⚠️ [Speech Engine] Exception initiating local SpeechSynthesis:', e);
    return false;
  }
}

/**
 * Main Voice Speech Function
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

  // Activate audio engine in current tick
  initAudioUnlock();

  // Stop previous speech/audio
  stopSpeaking();

  // STEP 1: Attempt local native SpeechSynthesis FIRST
  const localInitiated = speakWithLocalSynthesis(text, onEnd, () => {
    console.warn('⚠️ [Speech Engine] Local synthesis unavailable, trying online Chinese TTS stream...');
    tryOnlineTTSProviders(text, onEnd);
  });

  if (localInitiated) {
    return;
  }

  // STEP 2: Fallback to online Chinese TTS providers
  console.warn('⚠️ [Speech Engine] Local SpeechSynthesis not supported, trying online Chinese TTS stream...');
  tryOnlineTTSProviders(text, onEnd);
}

/**
 * Online Chinese TTS Stream Fallback (Multi-Provider)
 */
function tryOnlineTTSProviders(text: string, onEnd?: () => void) {
  const encodedText = encodeURIComponent(text);
  const baseUrl = getBaseApiUrl();

  const ttsProviders: string[] = [];

  // 1. App Server Proxy endpoint
  if (baseUrl && !baseUrl.includes('localhost') && !baseUrl.startsWith('file:') && !baseUrl.startsWith('capacitor:')) {
    ttsProviders.push(`${baseUrl}/api/tts?text=${encodedText}`);
  }

  // 2. High-Availability Chinese TTS Audio Streams
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
      console.warn('⚠️ [Speech Engine] All online Chinese TTS streams exhausted.');
      if (onEnd) onEnd();
    }
  };

  tryNext();
}

/**
 * Plays an online Chinese TTS audio stream URL with Web Audio API decoding + HTML5 Audio fallback
 */
async function playAudioStream(url: string, onEnd?: () => void, onError?: () => void) {
  // Method 1: Web Audio API fetch + decodeAudioData
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      if (!audioContext) {
        audioContext = new AudioCtx();
      }
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const res = await fetch(url, { mode: 'cors' });
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(buffer);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        
        let hasTriggeredEnd = false;
        source.onended = () => {
          if (hasTriggeredEnd) return;
          hasTriggeredEnd = true;
          console.log('⚡ [Speech Engine] Played Chinese TTS stream via Web Audio API decode!');
          if (onEnd) onEnd();
        };

        source.start(0);
        return;
      }
    }
  } catch (err) {
    console.warn('⚠️ [Speech Engine] Web Audio API fetch/decode failed, trying HTML5 Audio element:', err);
  }

  // Method 2: HTML5 Audio element fallback with no-referrer
  try {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
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
 * Stop any active speech broadcasts instantly
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
