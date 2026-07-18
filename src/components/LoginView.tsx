import React, { useState, useEffect, useRef } from 'react';
import { getBaseApiUrl } from '../lib/dbProxy';
import { 
  Smartphone, 
  ShieldCheck, 
  Loader2, 
  KeyRound, 
  MessageSquare, 
  AlertCircle,
  HelpCircle,
  X
} from 'lucide-react';

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
  const [simulatedCode, setSimulatedCode] = useState('');
  const [loginMode, setLoginMode] = useState<'real' | 'sandbox'>('real');

  // Countdown timer handler for SMS backoff
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // Handle Send SMS Click via backend Express Proxy (Alibaba Cloud SMS / Sandbox fallback)
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

    try {
      const res = await fetch(`${getBaseApiUrl()}/api/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: phoneTrimmed }),
      });

      const data = await res.json();
      setIsSending(false);

      if (data.success) {
        setTimer(60);
        if (data.mode === 'simulated') {
          setSimulatedCode(data.code || '');
          setLoginMode('sandbox');
          setInfoMsg(`💡 成功通过测试沙盒通道：系统已为您离线生成验证码。点击下方一键填入直接登录！`);
        } else {
          setLoginMode('real');
          setInfoMsg('✓ 阿里云短信验证码已发送！请注意查收您手机接收到的 4 位数短信验证码。');
        }
      } else {
        setErrorMsg(`❌ 验证码获取失败: ${data.error || '服务器响应异常'}`);
      }
    } catch (err: any) {
      console.error('[Login] Send SMS failed:', err);
      setIsSending(false);
      setErrorMsg(`❌ 验证码发送失败: ${err.message || '网络连接超时，请检查服务'}`);
    }
  };

  // Handle Login Submit via backend Express Proxy (Alibaba Cloud SMS / Sandbox fallback)
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

    try {
      const res = await fetch(`${getBaseApiUrl()}/api/sms/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: phoneTrimmed, code: smsCode }),
      });

      const data = await res.json();
      setIsLoggingIn(false);

      if (data.success) {
        onLoginSuccess(phoneTrimmed);
      } else {
        const rawError = data.error || '验证码校验未通过';
        let displayError = rawError;
        if (rawError.includes('isv.ValidateFail') || rawError.includes('400') || rawError.includes('验证失败')) {
          displayError = '阿里云400验证失败，请正确填写验证码';
        }
        setErrorMsg(`❌ 登录失败: ${displayError}`);
      }
    } catch (err: any) {
      console.error('[Login] Verify SMS failed:', err);
      setIsLoggingIn(false);
      setErrorMsg(`❌ 校验登录失败: ${err.message || '网络连接超时'}`);
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
