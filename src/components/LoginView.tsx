import React, { useState, useEffect, useRef } from 'react';
import { 
  Smartphone, 
  ShieldCheck, 
  Loader2, 
  KeyRound, 
  MessageSquare, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { auth } from '../lib/firebase';

interface LoginViewProps {
  onLoginSuccess: (phoneNumber: string) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  // --- SMS Login State ---
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [timer, setTimer] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [showConfigGuide, setShowConfigGuide] = useState(false);
  const [simulatedCode, setSimulatedCode] = useState('');
  const [pastedConfig, setPastedConfig] = useState('');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [billingErrorDetected, setBillingErrorDetected] = useState(false);
  const [domainErrorDetected, setDomainErrorDetected] = useState(false);
  const [copiedText, setCopiedText] = useState('');
  const [loginMode, setLoginMode] = useState<'real' | 'sandbox'>('real');

  // Dynamically resolve active project ID from local storage custom config or active firebase loader, falling back to 'my-taxi-app-b76f0'
  const currentProjId = activeProjectId || auth.app.options.projectId || 'my-taxi-app-b76f0';

  // Load active custom project name if any
  useEffect(() => {
    try {
      const saved = localStorage.getItem('CUSTOM_FIREBASE_CONFIG');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.projectId) {
          setActiveProjectId(parsed.projectId);
        }
      }
    } catch (e) {}
  }, []);

  const handleSaveConfig = () => {
    if (!pastedConfig.trim()) {
      setErrorMsg('请输入您从 Firebase 控制台复制的配置内容');
      return;
    }

    try {
      const cleanInput = pastedConfig.trim();
      
      // 1. Try parsing directly as JSON
      let configObj: any = null;
      try {
        configObj = JSON.parse(cleanInput);
      } catch (e) {}

      // 2. If JSON parsing failed, use regex extractor
      if (!configObj || !configObj.apiKey) {
        const apiKeyMatch = cleanInput.match(/apiKey:\s*["'`]([^"'`]+)["'`]/) || cleanInput.match(/"apiKey":\s*["'`]([^"'`]+)["'`]/);
        const authDomainMatch = cleanInput.match(/authDomain:\s*["'`]([^"'`]+)["'`]/) || cleanInput.match(/"authDomain":\s*["'`]([^"'`]+)["'`]/);
        const projectIdMatch = cleanInput.match(/projectId:\s*["'`]([^"'`]+)["'`]/) || cleanInput.match(/"projectId":\s*["'`]([^"'`]+)["'`]/);
        const storageBucketMatch = cleanInput.match(/storageBucket:\s*["'`]([^"'`]+)["'`]/) || cleanInput.match(/"storageBucket":\s*["'`]([^"'`]+)["'`]/);
        const messagingSenderIdMatch = cleanInput.match(/messagingSenderId:\s*["'`]([^"'`]+)["'`]/) || cleanInput.match(/"messagingSenderId":\s*["'`]([^"'`]+)["'`]/);
        const appIdMatch = cleanInput.match(/appId:\s*["'`]([^"'`]+)["'`]/) || cleanInput.match(/"appId":\s*["'`]([^"'`]+)["'`]/);

        configObj = {
          apiKey: apiKeyMatch ? apiKeyMatch[1] : '',
          authDomain: authDomainMatch ? authDomainMatch[1] : '',
          projectId: projectIdMatch ? projectIdMatch[1] : '',
          storageBucket: storageBucketMatch ? storageBucketMatch[1] : '',
          messagingSenderId: messagingSenderIdMatch ? messagingSenderIdMatch[1] : '',
          appId: appIdMatch ? appIdMatch[1] : ''
        };
      }

      if (!configObj.apiKey || !configObj.projectId) {
        setErrorMsg('❌ 无法解析配置，请确保复制了完整的 firebaseConfig 或者是正确的 JSON 格式（必须包含 apiKey 与 projectId）');
        return;
      }

      localStorage.setItem('CUSTOM_FIREBASE_CONFIG', JSON.stringify(configObj));
      setInfoMsg('✓ 恭喜！自定义 Firebase 配置保存成功。页面即将自动刷新应用新配置... 🚀');
      setErrorMsg('');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setErrorMsg('❌ 解析出错: ' + (err.message || '格式不正确'));
    }
  };

  const handleResetConfig = () => {
    localStorage.removeItem('CUSTOM_FIREBASE_CONFIG');
    setInfoMsg('✓ 已清除自定义配置，正在恢复至默认沙盒项目... 🚀');
    setErrorMsg('');
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Countdown timer handler for SMS backoff
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // Clean up reCAPTCHA verifier on unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {
          console.error('[Login] Error clearing recaptcha:', e);
        }
      }
    };
  }, []);

  // Handle Send SMS Click via Firebase Client SDK or Sandbox Simulator
  const handleGetSMSCode = async () => {
    const phoneTrimmed = phone.trim();
    if (!phoneTrimmed) {
      setErrorMsg('请输入您的手机号码');
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phoneTrimmed)) {
      setErrorMsg('请输入正确的11位中国大陆手机号');
      return;
    }

    setErrorMsg('');
    setInfoMsg('');
    setSimulatedCode('');
    setIsSending(true);

    if (loginMode === 'sandbox') {
      // Direct offline simulated code generation - no Firebase API call
      setTimeout(() => {
        const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
        setSimulatedCode(generatedCode);
        setConfirmationResult(null);
        setTimer(60);
        setIsSending(false);
        setInfoMsg('💡 成功切换至【免签安全沙盒测试通道】：手机测试验证码已在下方生成，点击即可一键填入直接登录！');
      }, 600);
      return;
    }

    // Real Mode - Strictly send real SMS via Firebase
    try {
      // 1. Prepend China country code +86 for E.164 formatting
      const formattedPhone = `+86${phoneTrimmed}`;

      // 2. Initialize RecaptchaVerifier dynamically with DOM cleanup to prevent duplicate rendering errors
      try {
        if (recaptchaVerifierRef.current) {
          recaptchaVerifierRef.current.clear();
          recaptchaVerifierRef.current = null;
        }
      } catch (e) {
        console.warn('[Login] Clear Recaptcha failed:', e);
      }

      // Recreate the DOM container inside the wrapper to force a fresh reCAPTCHA widget registration
      const wrapper = document.getElementById('recaptcha-wrapper');
      if (wrapper) {
        wrapper.innerHTML = '<div id="recaptcha-container" class="g-recaptcha mt-2"></div>';
      }

      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('[Login] reCAPTCHA verified');
        },
        'expired-callback': () => {
          console.warn('[Login] reCAPTCHA expired, resetting');
          setErrorMsg('人机验证已过期，请重新获取验证码');
        }
      });

      // 3. Request SMS OTP via Firebase Web SDK
      console.log('[Login] Attempting Firebase Phone Auth for:', formattedPhone);
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifierRef.current);
      
      setConfirmationResult(confirmation);
      setTimer(60);
      setIsSending(false);
      setInfoMsg('✓ 验证码短信已通过 Firebase 发送！请注意查收手机接收到的 6 位数短信验证码。');
    } catch (err: any) {
      console.warn('[Login] Firebase Send SMS failed:', err);
      setIsSending(false);
      
      // Clear reCAPTCHA on failure to allow re-render
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
          recaptchaVerifierRef.current = null;
        } catch (e) {}
      }

      const errStr = (err.code || err.message || '').toLowerCase();
      
      if (errStr.includes('billing-not-enabled') || errStr.includes('billing_not_enabled')) {
        setBillingErrorDetected(true);
        setErrorMsg(`❌ 真实短信通道初始化失败 (auth/billing-not-enabled)。检测到您的 Firebase 项目尚未成功激活或生效谷歌云账单。请参考下方「账单激活指南」快速绑定。`);
      } else if (errStr.includes('captcha-check-failed') || errStr.includes('hostname') || errStr.includes('domain')) {
        setDomainErrorDetected(true);
        setErrorMsg(`❌ 真实短信通道初始化失败 (auth/captcha-check-failed)。您的项目 ${currentProjId} 尚未授权当前域名。请参考下方「网域域名授权指南」进行授权。`);
      } else if (err.code === 'auth/operation-not-allowed') {
        setErrorMsg(`❌ 您的 Firebase 项目尚未启用“电话号码”登录提供商。请在下方指南中参考说明直达控制台开启开关。`);
        setShowConfigGuide(true);
      } else if (err.code === 'auth/too-many-requests') {
        setErrorMsg(`⚠️ 真实短信发送失败 (auth/too-many-requests)。Firebase 每天对单个手机号/IP 设有严格的安全防刷短信额度限制（此为谷歌官方服务器底层限制，无法在网页代码中取消或修改）。

💡 【无限制测试绝招】：进入您的 Firebase 控制台 ➔ Authentication ➔ Sign-in method ➔ 电话 (Phone) ➔ 点击展开 ➔ 在最下方「用于测试的电话号码」里添加您的手机号，设置一个您喜欢的 6 位数验证码（例如 123456）。这样不仅 100% 免除一切配额限制，更完全免费、秒速登录，极其方便！`);
      } else {
        setErrorMsg(`❌ 真实短信发送失败: ${err.message || '网络连接超时，请重试'}`);
      }
    }
  };

  // Handle Login Submit via Firebase Code Verification / Sandbox Simulator
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const phoneTrimmed = phone.trim();
    if (!phoneTrimmed || !/^1[3-9]\d{9}$/.test(phoneTrimmed)) {
      setErrorMsg('请输入正确的手机号码');
      return;
    }

    if (!smsCode) {
      setErrorMsg('请输入验证码');
      return;
    }

    setIsLoggingIn(true);

    // If we are in sandbox mode
    if (loginMode === 'sandbox') {
      const targetCode = simulatedCode || '123456';
      if (smsCode === targetCode || smsCode === '123456') {
        setTimeout(() => {
          console.log('[Login] Sandbox simulation auth sign-in success!');
          setIsLoggingIn(false);
          onLoginSuccess(phoneTrimmed);
        }, 800);
      } else {
        setIsLoggingIn(false);
        setErrorMsg('❌ 验证码错误，沙盒模拟正确验证码为: ' + targetCode);
      }
      return;
    }

    // Real Mode - Strictly verify using Firebase Web SDK
    if (!confirmationResult) {
      setErrorMsg('请先点击获取并输入真实的短信验证码');
      setIsLoggingIn(false);
      return;
    }

    try {
      console.log('[Login] Verifying Firebase confirmation code...');
      const result = await confirmationResult.confirm(smsCode);
      const user = result.user;
      
      console.log('[Login] Firebase phone auth verification success!', user.phoneNumber);
      setIsLoggingIn(false);
      onLoginSuccess(phoneTrimmed);
    } catch (err: any) {
      console.error('[Login] Firebase verification error:', err);
      setIsLoggingIn(false);
      
      if (err.code === 'auth/invalid-verification-code') {
        setErrorMsg('❌ 验证码不正确。请确保您填入了真实短信中的 6 位数字；如果您在 Firebase 控制台添加了「测试手机号」，请输入您预设 of 自定义测试验证码（如 123456）；或者您可直接切换至上方「沙盒免签测试」页签，免验证码一键快速登录。');
      } else if (err.code === 'auth/code-expired') {
        setErrorMsg('❌ 验证码已过期，请重新获取验证码。');
      } else {
        setErrorMsg(`❌ 验证失败: ${err.message || '请核对您的验证码并重试'}`);
      }
    }
  };

  return (
    <div className="w-full h-full bg-[#0a0b10] flex flex-col relative select-text overflow-hidden" id="login-module">
      
      {/* Mock Phone System Bar Spacer */}
      <div className="h-6 bg-black shrink-0"></div>

      {/* Brand Header */}
      <div className="px-6 pt-6 shrink-0 text-center">
        <h1 className="text-xl font-black text-slate-100 tracking-tight">黑湾代驾计费MAX</h1>
      </div>

      {/* Main Container Scrollbox */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col justify-between">
        
        <div className="flex-1 flex flex-col justify-between py-2 animate-in fade-in duration-300">
          
          {/* Brand Area */}
          <div className="space-y-1.5 text-center mt-2 shrink-0">
            <h2 className="text-base font-black text-slate-100 tracking-tight">手机验证码安全登录</h2>
            <p className="text-[10.5px] text-slate-400 max-w-[260px] mx-auto leading-relaxed">
              输入11位中国大陆手机号码并获取验证码以进行安全验证登录。
            </p>
          </div>

          {/* Mode Switcher Tab */}
          <div className="mt-4 p-1 bg-[#0e1017] border border-slate-900 rounded-2xl flex gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setLoginMode('real');
                setErrorMsg('');
                setInfoMsg('');
                setSimulatedCode('');
              }}
              className={`flex-1 py-2.5 text-center rounded-xl text-xs font-black transition-all cursor-pointer ${
                loginMode === 'real'
                  ? 'bg-gradient-to-r from-teal-500/15 to-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              🔥 真实短信通道
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode('sandbox');
                setErrorMsg('');
                setInfoMsg('');
                setSimulatedCode('');
              }}
              className={`flex-1 py-2.5 text-center rounded-xl text-xs font-black transition-all cursor-pointer ${
                loginMode === 'sandbox'
                  ? 'bg-sky-500/10 border border-sky-500/20 text-sky-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              🛡️ 沙盒免签测试
            </button>
          </div>

          {/* Input fields form */}
          <form onSubmit={handleLoginSubmit} className="my-4 space-y-4 flex-1 flex flex-col justify-center">
            <div className="space-y-3.5">
              
              {/* Phone Number Field */}
              <div className="space-y-1.5 text-left">
                <label className="text-[9.5px] font-black tracking-wider text-slate-500 uppercase">
                  手机号码
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center space-x-1 border-r border-slate-800 pr-2">
                    <span className="text-[11px] font-black text-[#189F95]">+86</span>
                  </div>
                  <input
                    type="tel"
                    id="driver-auth-phone-field"
                    maxLength={11}
                    value={phone}
                    onChange={(e) => {
                      const cleanVal = e.target.value.replace(/\D/g, '');
                      setPhone(cleanVal);
                      setErrorMsg('');
                      setInfoMsg('');
                    }}
                    placeholder="请输入您的11位手机号码"
                    className="w-full pl-[56px] pr-4 py-3 bg-[#0e1017] border border-slate-900 rounded-2xl text-xs font-black focus:outline-hidden focus:border-[#189F95] text-slate-200 placeholder:text-slate-600 font-mono tracking-wider"
                  />
                </div>
              </div>

              {/* Verification Code Field */}
              <div className="space-y-1.5 text-left">
                <label className="text-[9.5px] font-black tracking-wider text-slate-500 uppercase">
                  短信验证码
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <input
                      type="text"
                      id="driver-sms-code-input"
                      maxLength={6}
                      value={smsCode}
                      onChange={(e) => {
                        setSmsCode(e.target.value.trim());
                        setErrorMsg('');
                        setInfoMsg('');
                      }}
                      placeholder="请输入验证码"
                      className="w-full pl-10 pr-4 py-3 bg-[#0e1017] border border-slate-900 rounded-2xl text-xs font-black focus:outline-hidden focus:border-[#189F95] text-slate-200 placeholder:text-slate-600 font-mono tracking-widest text-center"
                    />
                  </div>
                  
                  {/* Send button with countdown */}
                  <button
                    type="button"
                    id="sms-sender-trigger-btn"
                    onClick={handleGetSMSCode}
                    disabled={timer > 0 || isSending}
                    className="px-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-[#189F95] hover:text-[#22bcae] rounded-2xl text-xs font-black transition-colors min-w-[96px] shrink-0 border border-slate-800 flex items-center justify-center cursor-pointer"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#189F95]" />
                    ) : timer > 0 ? (
                      `${timer}s`
                    ) : (
                      '获取验证码'
                    )}
                  </button>
                </div>
              </div>

            </div>

            {/* Simulated sandbox code helper */}
            {loginMode === 'sandbox' && simulatedCode && (
              <div 
                onClick={() => setSmsCode(simulatedCode)}
                className="p-2.5 bg-sky-500/10 border border-sky-500/20 hover:border-sky-500/40 rounded-xl text-left cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="text-[10px] text-sky-400 font-semibold">
                  💡 沙盒验证码已生成！点击自动填入：
                </div>
                <div className="font-mono text-xs text-white font-black bg-sky-950 px-2 py-0.5 rounded border border-sky-500/30">
                  {simulatedCode}
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-left text-[10px] text-rose-400 font-medium leading-relaxed">
                {errorMsg}
              </div>
            )}

            {/* Info Message */}
            {infoMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-left text-[10px] text-emerald-400 font-medium leading-relaxed">
                {infoMsg}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 bg-[#189F95] hover:bg-[#20b3a8] disabled:opacity-50 active:scale-[0.98] text-slate-950 font-black text-xs rounded-2xl shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer mt-2 text-center"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>正在验证并登录中...</span>
                </>
              ) : (
                <>
                  <span>立即安全登录进入系统 ➔</span>
                </>
              )}
            </button>

            {/* reCAPTCHA Hidden target container required by Firebase Phone Auth */}
            <div id="recaptcha-wrapper" className="hidden">
              <div id="recaptcha-container"></div>
            </div>

          </form>

        </div>

        {/* Footer info tip */}
        <div className="shrink-0 flex items-center justify-center gap-1 text-[9px] text-slate-500 pt-3 border-t border-slate-950">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>黑湾代驾计费MAX为您服务</span>
        </div>

      </div>

    </div>
  );
}
