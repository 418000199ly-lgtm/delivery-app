/**
 * Ultra-Robust Direct MP3 Audio Player & Chinese Voice Engine for Driver App
 * 
 * 1. Plays real MP3 audio streams/files directly via HTML5 Audio / Web Audio API
 * 2. Pre-warms and unlocks mobile audio channel on user touch/click
 * 3. Bypasses Android OS vendor TTS engines (iFlytek, Huawei, Xiaomi) for 100% reliable Chinese MP3 playback
 */

import { getBaseApiUrl } from '../lib/dbProxy';

// Silent 0.1s MP3 base64 to unlock mobile device media channels
const SILENT_MP3 = 'data:audio/mp3;base64,SUQ3BAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABCAAdER0eHyAnLC8yNDc5Ozw/QEJERUZISkxNT1FSUlVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/4xAEOAAAAAAAAAAAAAABOT3RlAAAAAEFydGlzdAAAAGxpc3RlbAAnREVDUwAAAENyZWF0ZWQgd2l0aCBMQU1FIDMuMTAwAABMSU1FAAAAMy4xMDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//OEAAAAA3wAAAAAAAAAAA0AANAAA0AAB4AAAAAAAAA0AANAAAE//OEAAAAAAAAAAAAAAAANAAA0AANAAAeAAAAAAAAANAAA0AAA==';

let currentAudio: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;
let unlockedAudioElement: HTMLAudioElement | null = null;
let isUnlocked = false;

/**
 * Unlocks Web Audio Context and HTML5 Audio channel immediately on user touch/click.
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

    // 2. HTML5 Audio Channel Unlock for Mobile WebViews & iOS Safari / Android WebView
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

    isUnlocked = true;
  } catch (e) {
    console.warn('[Audio Engine] Unlock attempt notice:', e);
  }
}

// Register global user gesture listeners to guarantee unlock
if (typeof window !== 'undefined') {
  const events = ['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'];
  const handleGesture = () => {
    initAudioUnlock();
  };
  events.forEach(evt => window.addEventListener(evt, handleGesture, { passive: true }));
}

/**
 * Stop any active audio playback immediately
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
async function playMp3Audio(mp3Url: string, onEnd?: () => void, onError?: () => void) {
  stopSpeaking();

  // Method A: Try Web Audio API fetch & buffer decode (best for iOS/Android WebView without user gesture lock)
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
          console.log('🔊 [MP3 Voice Engine] MP3 audio played via Web Audio API successfully!');
          if (onEnd) onEnd();
        };

        source.start(0);
        return;
      }
    }
  } catch (err) {
    console.warn('⚠️ [MP3 Voice Engine] Web Audio API decode failed, switching to HTML5 Audio element:', err);
  }

  // Method B: Standard HTML5 Audio element
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
      console.log('🔊 [MP3 Voice Engine] MP3 audio played via HTML5 Audio element successfully!');
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
        console.warn('⚠️ [MP3 Voice Engine] Audio play error:', err);
        if (currentAudio === audio) currentAudio = null;
        if (onError) onError();
      });
    }
  } catch (e) {
    if (onError) onError();
  }
}

/**
 * Secondary Fallback: Native SpeechSynthesis (if MP3 audio stream is network unreachable)
 */
function playFallbackSpeechSynthesis(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'zh-CN';
    utter.volume = 1.0;
    utter.rate = 1.0;

    utter.onend = () => { if (onEnd) onEnd(); };
    utter.onerror = () => { if (onEnd) onEnd(); };

    window.speechSynthesis.speak(utter);
  } catch (e) {
    if (onEnd) onEnd();
  }
}

/**
 * Main App Chinese Voice Broadcast Function
 * 
 * Directly plays MP3 audio files for all app voice prompts:
 * - 上线听单: "您已上线！"
 * - 下线停止听单: "您已下线！"
 * - 扫码授权/完成开单: "乘客已扫码授权，开单成功！"
 * - 收款完成: "收款成功。本次收款金额：{金额}元。"
 * - 系统通知: "您有新的消息，注意查收！"
 * - 新订单派单: "您有新的代驾订单，请及时处理！"
 * - 高德地图导航指引: "导航开始..." 等
 *
 * @param text The Chinese broadcast text
 * @param onEnd Callback after voice broadcast ends
 */
export function speakText(text: string, onEnd?: () => void) {
  if (!text || typeof window === 'undefined') {
    if (onEnd) onEnd();
    return;
  }

  console.log('📢 [MP3 Voice Engine] Requesting MP3 Voice Broadcast:', text);

  // Activate audio engine lock on mobile devices
  initAudioUnlock();

  const encodedText = encodeURIComponent(text);
  const baseUrl = getBaseApiUrl();

  // Primary URL: App Server MP3 Proxy Endpoint
  const mp3Urls: string[] = [];

  if (baseUrl && !baseUrl.includes('localhost') && !baseUrl.startsWith('file:') && !baseUrl.startsWith('capacitor:')) {
    mp3Urls.push(`${baseUrl}/api/tts?text=${encodedText}`);
  } else {
    mp3Urls.push(`/api/tts?text=${encodedText}`);
  }

  // Backup High-Availability MP3 Streams
  mp3Urls.push(
    `https://dict.youdao.com/dictvoice?audio=${encodedText}&type=1`,
    `https://tts.baidu.com/text2audio?cuid=baike&lan=zh&ctp=1&padd=&spd=5&ptm=0&tex=${encodedText}`,
    `https://fanyi.baidu.com/gettts?lan=zh&text=${encodedText}&spd=5&source=web`,
    `https://api.oick.cn/txt/api.php?text=${encodedText}&speed=1`
  );

  let attemptIndex = 0;

  const tryPlayNextMp3 = () => {
    if (attemptIndex < mp3Urls.length) {
      const url = mp3Urls[attemptIndex];
      attemptIndex++;
      playMp3Audio(url, onEnd, () => {
        tryPlayNextMp3();
      });
    } else {
      console.warn('⚠️ [MP3 Voice Engine] MP3 streams unreachable, falling back to local speech synthesis');
      playFallbackSpeechSynthesis(text, onEnd);
    }
  };

  tryPlayNextMp3();
}
