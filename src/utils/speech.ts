/**
 * Ultra-Robust Android WebView & Mobile Audio Engine for Driver App
 * 
 * Direct User Gesture Audio Unlock & Volume Syncing:
 * 1. Synchronously unlocks Web Audio Context & SpeechSynthesis directly in click handlers (e.g. 'Test Voice' button)
 * 2. Multi-provider online TTS stream (Youdao / Baidu) with local SpeechSynthesis fallback
 * 3. 100% Volume gain mapping to Android System Media Volume (adjustable via phone side buttons)
 */

let currentAudio: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;
let isUnlocked = false;

if (typeof window !== 'undefined') {
  (window as any)._activeUtterances = (window as any)._activeUtterances || new Set();
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

    // 2. Unlock SpeechSynthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.resume();
      const dummyUtter = new SpeechSynthesisUtterance('');
      dummyUtter.volume = 0;
      window.speechSynthesis.speak(dummyUtter);
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

  // Multi-provider TTS stream URL candidates
  const ttsProviders = [
    `https://dict.youdao.com/dictvoice?audio=${encodedText}&type=1`,
    `https://tts.baidu.com/text2audio?cuid=baike&lan=zh&ctp=1&padd=&spd=5&ptm=0&tex=${encodedText}`,
    `https://fanyi.baidu.com/gettts?lan=zh&text=${encodedText}&spd=5&source=web`
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
    audio.crossOrigin = 'anonymous';
    audio.src = url;
    audio.volume = 1.0; // 100% volume -> mapped directly to Android media volume
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
    console.error('[Speech Engine] Exception in playAudioStream:', err);
    if (onError) onError();
  }
}

/**
 * Fallback to browser's SpeechSynthesis API
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
        console.error('❌ [Speech Engine] Local SpeechSynthesis failed:', e);
        cleanup();
        playChimeAlert(onEnd);
      };

      window.speechSynthesis.speak(utter);
      console.log('🎙️ [Speech Engine] Speaking via local SpeechSynthesis engine');
    } catch (e) {
      console.error('❌ [Speech Engine] Local SpeechSynthesis exception:', e);
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
