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
  Settings,
  Globe,
  Wifi,
  WifiOff,
  CheckCircle,
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

  // --- API / Worker Settings State ---
  const [showApiModal, setShowApiModal] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Countdown timer handler for SMS backoff
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // Read initial custom API / Worker URL on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cloudflare_worker_api_url') || '';
      setCustomApiUrl(saved);
    } catch (_) {}
  }, []);

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('正在测试连接...');
    
    let targetUrl = customApiUrl.trim();
    if (!targetUrl) {
      targetUrl = 'https://www.lyheiwandaijiamax.com';
    } else {
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }
    }
    // Remove trailing slash
    targetUrl = targetUrl.replace(/\/$/, '');

    try {
      const res = await fetch(`${targetUrl}/api/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setTestStatus('success');
        setTestMessage('连接成功！服务器状态正常 ✓');
      } else {
        setTestStatus('error');
        setTestMessage(`连接失败: HTTP ${res.status}`);
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(`无法连接到该端点: ${err.message || '网络不通，或服务器未启动'}`);
    }
  };

  const handleSaveApiUrl = () => {
    try {
      localStorage.setItem('cloudflare_worker_api_url', customApiUrl.trim());
      setInfoMsg(`✓ 服务器配置已更新！当前API端点：${customApiUrl.trim() || '默认生产域名'}`);
      setShowApiModal(false);
    } catch (err) {
      setErrorMsg('保存配置失败，请检查浏览器/设备存储限制');
    }
  };

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

      {/* API Connection Settings Modal Overlay */}
      {showApiModal && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col justify-end animate-in fade-in slide-in-from-bottom-10 duration-300">
          <div className="bg-[#0e111a] border-t border-slate-900 rounded-t-3xl p-6 space-y-4 max-h-[85%] overflow-y-auto flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-[#189F95]" />
                <h3 className="text-sm font-black text-slate-100">API 服务器连接配置</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowApiModal(false)}
                className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Explanatory text */}
            <div className="text-[10.5px] text-slate-400 leading-relaxed space-y-1.5 bg-slate-950/60 p-3 rounded-2xl border border-slate-900">
              <p>
                ⚠️ <strong>为什么提示 "Failed to fetch"？</strong><br />
                打包的手机 APK 默认会通过 API 服务器获取验证码、同步计费。如果您的默认域名 <code className="text-teal-400">www.lyheiwandaijiamax.com</code> 尚未配置或绑定对应的 Cloudflare Worker 后台服务，点击发送短信时，手机本地会因域名解析失败或无法连接而报错。
              </p>
              <p>
                💡 <strong>如何进行测试与配置？</strong><br />
                您可以在下方将服务器端点替换为<strong>您当前 AI Studio 预览端的真实地址</strong>进行即时联调测试，或填入您已部署的 Cloudflare Worker 网址。
              </p>
            </div>

            {/* Input field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black tracking-wider text-slate-500 uppercase block">
                API 服务器端点 URL
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customApiUrl}
                  onChange={(e) => {
                    setCustomApiUrl(e.target.value);
                    setTestStatus('idle');
                    setTestMessage('');
                  }}
                  placeholder="例如: https://ais-pre-nstmvaox4sb7kditx7suvv-11329907111.asia-east1.run.app"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-900 rounded-2xl text-xs font-semibold focus:outline-hidden focus:border-[#189F95] text-slate-200 placeholder:text-slate-700 font-mono tracking-wide"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block">
                常用服务器地址预设
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCustomApiUrl('https://www.lyheiwandaijiamax.com');
                    setTestStatus('idle');
                    setTestMessage('');
                  }}
                  className="py-2.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 rounded-xl text-[10px] text-slate-300 font-semibold transition-all cursor-pointer text-center"
                >
                  🌐 默认生产域名
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      setCustomApiUrl(window.location.origin);
                    }
                    setTestStatus('idle');
                    setTestMessage('');
                  }}
                  className="py-2.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 rounded-xl text-[10px] text-teal-400 font-semibold transition-all cursor-pointer text-center"
                >
                  🚀 使用当前预览端点
                </button>
              </div>
            </div>

            {/* Test connection output */}
            {testStatus !== 'idle' && (
              <div className={`p-3 rounded-xl border text-[10.5px] text-left leading-relaxed ${
                testStatus === 'testing' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                testStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                <div className="flex items-center space-x-1.5 font-bold mb-1">
                  {testStatus === 'testing' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {testStatus === 'success' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                  {testStatus === 'error' && <WifiOff className="w-3.5 h-3.5 text-rose-400" />}
                  <span>{testStatus === 'testing' ? '正在测试...' : testStatus === 'success' ? '测试通过' : '测试失败'}</span>
                </div>
                <p className="font-mono text-[9.5px] break-all">{testMessage}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-slate-900">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testStatus === 'testing'}
                className="flex-1 py-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-2xl transition-colors cursor-pointer text-center"
              >
                测试连接
              </button>
              <button
                type="button"
                onClick={handleSaveApiUrl}
                className="flex-1 py-3 bg-[#189F95] hover:bg-[#20b3a8] text-slate-950 font-black text-xs rounded-2xl transition-colors cursor-pointer text-center"
              >
                保存并生效
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
