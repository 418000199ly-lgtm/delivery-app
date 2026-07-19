/**
 * Highly Robust Voice Broadcast System for Mobile and WebView environments.
 * Uses a dual-engine architecture:
 * 1. Primary: High-fidelity online audio TTS streaming (Baidu TTS) which is 100% reliable 
 *    on all Android WebViews and devices without pre-installed local TTS packages.
 * 2. Fallback: Standard browser SpeechSynthesis, which runs locally.
 */

let currentAudio: HTMLAudioElement | null = null;

export function speakText(text: string, onEnd?: () => void) {
  console.log('🗣️ [Speech Engine] Speaking text:', text);

  // 1. Terminate any currently playing audio stream
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio = null;
    } catch (e) {
      console.error('[Speech Engine] Error stopping previous audio:', e);
    }
  }

  // 2. Clear any pending local browser SpeechSynthesis queues
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }

  // 3. Play via Baidu TTS Stream (Primary engine)
  try {
    const encodedText = encodeURIComponent(text);
    // Baidu TTS parameters: lan=zh (Chinese), ie=UTF-8, spd=5 (standard speed), text=content
    const ttsUrl = `https://tts.baidu.com/text2audio?lan=zh&ie=UTF-8&spd=5&text=${encodedText}`;
    
    const audio = new Audio(ttsUrl);
    currentAudio = audio;

    audio.onended = () => {
      if (currentAudio === audio) {
        currentAudio = null;
      }
      if (onEnd) onEnd();
    };

    audio.onerror = (err) => {
      console.warn('⚠️ [Speech Engine] Online TTS playback error, falling back to local SpeechSynthesis:', err);
      fallbackToLocalSpeechSynthesis(text, onEnd);
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log('⚡ [Speech Engine] Online TTS stream started successfully');
      }).catch((playError) => {
        console.warn('⚠️ [Speech Engine] Autoplay blocked or online TTS failed, trying SpeechSynthesis fallback:', playError);
        fallbackToLocalSpeechSynthesis(text, onEnd);
      });
    }
  } catch (err) {
    console.warn('⚠️ [Speech Engine] Exception while initializing online TTS, fallback to SpeechSynthesis:', err);
    fallbackToLocalSpeechSynthesis(text, onEnd);
  }
}

/**
 * Fallback local engine using browser's speechSynthesis API
 */
function fallbackToLocalSpeechSynthesis(text: string, onEnd?: () => void) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'zh-CN';
      utter.onend = () => {
        if (onEnd) onEnd();
      };
      utter.onerror = (e) => {
        console.error('❌ [Speech Engine] Local SpeechSynthesis failed:', e);
        if (onEnd) onEnd();
      };
      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.error('❌ [Speech Engine] Local SpeechSynthesis exception:', e);
      if (onEnd) onEnd();
    }
  } else {
    console.warn('❌ [Speech Engine] SpeechSynthesis not supported in this environment');
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
      currentAudio = null;
    } catch (e) {}
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
}
