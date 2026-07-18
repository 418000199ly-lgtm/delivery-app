import React, { useState, useEffect } from 'react';
import { db, doc, setDoc, getDoc, getBaseApiUrl } from '../lib/dbProxy';
import { QrCode, MapPin, Phone, CheckCircle, Navigation, ShieldCheck, Car, Headphones, Smartphone, BellRing, Check, ArrowLeft, Flag } from 'lucide-react';
import { checkVipActive } from '../types';

interface PassengerOrderViewProps {
  driverPhone: string;
  onClose?: () => void;
  onUnlockAdmin?: () => void;
}

export default function PassengerOrderView({ driverPhone, onClose, onUnlockAdmin }: PassengerOrderViewProps) {
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const hasDriverInUrl = urlParams ? (urlParams.has('driver') && !!urlParams.get('driver')) : false;

  const isDeveloperSimulator = !!onClose || (typeof window !== 'undefined' && (
    window.location.hostname.includes('localhost') || 
    window.location.hostname.includes('127.0.0.1') || 
    window.location.hostname.includes('webcontainer') || 
    window.location.hostname.includes('gitpod') || 
    window.location.hostname.includes('cloudshell') ||
    window.location.hostname.includes('c9users') ||
    window.location.hostname.includes('run.app') ||
    window.location.hostname.includes('aistudio.google')
  ));

  const [passengerPhone, setPassengerPhone] = useState('');
  const [startLocation, setStartLocation] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlStart = params.get('startLocation');
      if (urlStart) {
        return decodeURIComponent(urlStart).trim();
      }
    }
    return '万达广场写字楼A座';
  });
  const [destination, setDestination] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success'>('idle');
  
  // VIP validation states
  const [driverVipExpiry, setDriverVipExpiry] = useState<string | null>(null);
  const [isVipChecked, setIsVipChecked] = useState(false);

  // 3-second Welcome screen states
  const [showWelcome, setShowWelcome] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [welcomeStatus, setWelcomeStatus] = useState('正在开启订单...');
  const [customBrandName, setCustomBrandName] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlName = params.get('name');
      if (urlName) {
        const val = decodeURIComponent(urlName).trim();
        if (val !== '极速' && val !== '极速代驾' && val !== '') {
          return val;
        }
      }
    }
    return '小鸟代驾';
  });
  const [hasCustomNameSet, setHasCustomNameSet] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlName = params.get('name');
      if (urlName) {
        const val = decodeURIComponent(urlName).trim();
        if (val !== '极速' && val !== '极速代驾' && val !== 'XX代驾' && val !== '小鸟代驾' && val !== '') {
          return true;
        }
      }
    }
    return false;
  });

  const [driverCoords, setDriverCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [passengerCoords, setPassengerCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Retrieve real-time passenger coordinates upon component mount
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      try {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setPassengerCoords({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            });
          },
          (err) => {
            console.warn("Failed to retrieve passenger physical location coordinates:", err);
          }
        );
      } catch (geoErr) {
        console.warn("Synchronous geolocation error caught inside iframe sandbox:", geoErr);
      }
    }
  }, []);

  // Fetch driver custom name brand dynamically from Firestore and sync active driver's current startLocation
  useEffect(() => {
    const fetchDriverBrandingAndLocation = async () => {
      if (!driverPhone) {
        setIsVipChecked(true);
        return;
      }
      try {
        const userDocRef = doc(db, 'driver_users', driverPhone);
        const docSnap = await getDoc(userDocRef);
        if (docSnap && docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.vipExpiry) {
            setDriverVipExpiry(data.vipExpiry);
          } else {
            setDriverVipExpiry('');
          }
          if (data && data.customAppName) {
            const rawName = data.customAppName.trim();
            if (rawName && rawName !== '极速' && rawName !== '极速代驾' && rawName !== '') {
              setCustomBrandName(rawName);
              if (rawName !== 'XX代驾' && rawName !== '小鸟代驾') {
                setHasCustomNameSet(true);
              } else {
                setHasCustomNameSet(false);
              }
            } else {
              setCustomBrandName('小鸟代驾');
              setHasCustomNameSet(false);
            }
          }
          if (data && data.lat && data.lng) {
            setDriverCoords({ lat: data.lat, lng: data.lng });
          }
        } else {
          setDriverVipExpiry('');
        }

        // Fetch current active startLocation from general links collection
        const linkDocRef = doc(db, 'passenger_links', driverPhone);
        const linkSnap = await getDoc(linkDocRef);
        if (linkSnap && linkSnap.exists()) {
          const linkData = linkSnap.data();
          if (linkData && linkData.driverStartLocation) {
            setStartLocation(linkData.driverStartLocation.trim());
          }
        }
      } catch (err) {
        console.error('Failed to fetch driver brand and location settings under passenger page:', err);
        setDriverVipExpiry('');
      } finally {
        setIsVipChecked(true);
      }
    };
    fetchDriverBrandingAndLocation();
  }, [driverPhone]);

  // Handle countdown loop
  useEffect(() => {
    if (!showWelcome) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setWelcomeStatus('订单正在开启，请确认您的出发信息...');
          setTimeout(() => {
            setShowWelcome(false);
          }, 800);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showWelcome]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passengerPhone) {
      alert('✍️ 提示：请输入您的手机号码以便开单后与司机联系！');
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(passengerPhone.replace(/[-\s]/g, ''))) {
      alert('✍️ 提示：请核对并输入11位有效手机号码！');
      return;
    }

    setSubmitting(true);
    
    if (!driverPhone) {
      alert('⚠️ 无法获取当前司机的手机号码，请重新扫描二维码！');
      setSubmitting(false);
      return;
    }

    // Determine final passenger latitude and longitude (starting point coords)
    let pLat = passengerCoords?.lat || null;
    let pLng = passengerCoords?.lng || null;

    if (!pLat && driverCoords) {
      // Simulate real-life situation by offsetting slightly from driver coordinates
      const offsetLat = 0.0012 + Math.random() * 0.0016;
      const offsetLng = 0.0012 + Math.random() * 0.0016;
      pLat = driverCoords.lat + (Math.random() > 0.5 ? offsetLat : -offsetLat);
      pLng = driverCoords.lng + (Math.random() > 0.5 ? offsetLng : -offsetLng);
    }

    if (!pLat) {
      pLat = 38.487193;
      pLng = 106.230912;
    }

    const dbWritePromise = setDoc(doc(db, 'passenger_links', driverPhone), {
      passengerPhone: passengerPhone.trim(),
      startLocation: startLocation.trim(),
      destination: destination.trim(),
      status: 'submitted',
      timestamp: Date.now(),
      passengerLat: pLat,
      passengerLng: pLng
    });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('timeout')), 3000)
    );

    try {
      // Race standard Firebase client-side SDK write with a 3.0-second timeout.
      // If it times out or fails (as usually happens within China mainland), fall back immediately to the Cloudflare Worker server proxy.
      await Promise.race([dbWritePromise, timeoutPromise]);
      setStatus('success');
    } catch (err: any) {
      console.warn('Firebase client SDK failed or timed out. Falling back to Cloudflare Workers server route...', err);
      try {
        const response = await fetch(`${getBaseApiUrl()}/api/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            driverPhone,
            passengerPhone: passengerPhone.trim(),
            startLocation: startLocation.trim(),
            destination: destination.trim()
          })
        });
        const resData = await response.json();
        if (resData.success) {
          setStatus('success');
        } else {
          throw new Error(resData.error || 'Cloudflare mid-tier failed');
        }
      } catch (fallbackErr: any) {
        alert('⚠️ 连线提交失败: ' + fallbackErr.message + '\n\n提示: 请确保您的 Cloudflare Worker 已成功部署！');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isVipActive = checkVipActive(driverVipExpiry || undefined);
  const isDriverIdentified = hasDriverInUrl || !!onClose;
  const isAbnormal = (!isDriverIdentified || (isVipChecked && !isVipActive)) && !isDeveloperSimulator;

  const isBlocked = false;

  if (showWelcome) {
    const currentDisplayBrand = isAbnormal ? '小鸟代驾' : customBrandName;
    return (
      <div className="relative w-full h-full min-h-full flex flex-col items-center py-16 px-5 overflow-hidden justify-center bg-[#f9f9f9] text-[#1a1c1c] font-sans select-none z-[10000]">
        {/* Background Illustration Decoration */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
          <img 
            className="w-full h-full object-cover grayscale blur-xs" 
            src="https://lh3.googleusercontent.com/aida/AP1WRLtTuYfFFEytKKZpCMIKx5d793N3I-YkAt0RaL4tG65400MEwqxanM7ul6Y1w7lOLl0VUDB7h7QuRc_HkluOjkWV2pwHCQgCHjIWwYg5HxN_f1siUjpWM-3l9T8t47Djd_T0_qVuS9zNb14OL4fbKT9WOv7HgcystD5ikT_mbhJfVTkFf5_BDKLVD0bLlMvWFrA8uk0qjqvDWrOSJN4JmW09VM05DNbR-Pt6t3pp-bSzYKm5cbHZtczl7PI"
            alt="Decoration Background"
          />
        </div>

        {/* Central Countdown Circle */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* SVG Progress Ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle className="text-[#eeeeee]" cx="50" cy="50" fill="transparent" r="45" stroke="currentColor" strokeWidth="4"></circle>
              <circle 
                className="drop-shadow-xs transition-all duration-1000" 
                cx="50" 
                cy="50" 
                fill="transparent" 
                r="45" 
                stroke="#FF7D00" 
                strokeWidth="6"
                strokeDasharray={282.74}
                strokeDashoffset={282.74 - (countdown / 3) * 282.74}
              ></circle>
            </svg>
            {/* Number Display */}
            <div className="text-[64px] font-black text-[#ff7d00] animate-pulse">
              {countdown}
            </div>
          </div>
          {/* Status Text */}
          <div className="mt-8 flex flex-col items-center gap-2 h-16">
            <span className="text-[#1a1c1c] font-bold text-base text-center transition-all duration-300">
              {welcomeStatus}
            </span>
            {countdown > 0 && (
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-[#ff7d00] rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-1.5 h-1.5 bg-[#ff7d00] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1.5 h-1.5 bg-[#ff7d00] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            )}
          </div>
        </div>

        {/* Footer / Action Area */}
        <div className="relative z-10 text-center mb-8 mt-16">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-[#ff7d00] to-[#ffdbc8] rounded-xl flex items-center justify-center shadow-lg">
              <Car className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#1a1c1c]">
              欢迎使用<span className="text-[#ff7d00] px-1 font-extrabold">{currentDisplayBrand}</span>
            </h1>
          </div>
          <p className="text-[#5f5e5e] text-sm">在乎你的车，更在乎你的人</p>
        </div>

        <div className="relative z-10 w-full text-center">
          <div className="px-4 py-2 bg-white/50 backdrop-blur-md rounded-2xl border border-[#dfc0af] inline-block mx-auto">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="text-[#ff7d00] w-5 h-5" />
              <span className="text-[#584235] text-xs font-semibold">
                欢迎使用自助开单，您的行程已安全加密
              </span>
            </div>
          </div>
        </div>

        {/* Background Atmospheric Effect */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[400px] h-[400px] bg-[#ff7d00]/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-[#ff7d00]/10 rounded-full blur-[80px] pointer-events-none"></div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="absolute inset-0 bg-[#f9f9f9] text-[#1a1c1c] font-sans overflow-hidden select-none z-[20000] flex flex-col justify-between">
        <main className="w-full max-w-md mx-auto bg-[#f9f9f9] flex-1 relative flex flex-col justify-start">
          {/* Hero Section */}
          <section className="relative h-64 w-full overflow-hidden">
            <img 
              src="https://lh3.googleusercontent.com/aida/AP1WRLtTuYfFFEytKKZpCMIKx5d793N3I-YkAt0RaL4tG65400MEwqxanM7ul6Y1w7lOLl0VUDB7h7QuRc_HkluOjkWV2pwHCQgCHjIWwYg5HxN_f1siUjpWM-3l9T8t47Djd_T0_qVuS9zNb14OL4fbKT9WOv7HgcystD5ikT_mbhJfVTkFf5_BDKLVD0bLlMvWFrA8uk0qjqvDWrOSJN4JmW09VM05DNbR-Pt6t3pp-bSzYKm5cbHZtczl7PI" 
              className="w-full h-full object-cover"
              alt="VIP Premium Driver Banner"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#f9f9f9] via-transparent to-transparent"></div>
          </section>

          {/* Title Section */}
          <section className="px-5 -mt-8 relative z-10">
            <div className="bg-white p-6 rounded-xl border border-[#dfc0af] shadow-sm">
              <h2 className="text-xl font-bold text-[#1a1c1c] mb-2">
                &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; 开通尊享会员
                <div className="mt-1">&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; 享受更多权益</div>
              </h2>
              <p className="text-[#584235] text-sm font-medium">
                &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; 请使用正规渠道开通会员
              </p>
            </div>
          </section>
        </main>
        <footer style={{ textAlign: 'center', padding: '20px 0', fontSize: '12px', color: '#666' }} className="w-full z-20 shrink-0">
          © 2026 All Rights Reserved
          <br />
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" style={{ color: '#666', textDecoration: 'none' }}>
            宁ICP备2026002469号-1
          </a>
        </footer>
      </div>
    );
  }

  if (status === 'success') {
    const currentDisplayBrand = isAbnormal ? '小鸟代驾' : customBrandName;
    return (
      <div className="w-full h-full min-h-full flex flex-col bg-[#f9f9f9] text-[#1a1c1c] font-sans overflow-y-auto select-none relative z-[10000] items-center">
        {/* TopAppBar Shell */}
        <header className="w-full top-0 sticky bg-[#f9f9f9] border-b border-[#dfc0af] flex items-center justify-between px-5 h-14 z-50 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                if (onClose) {
                  onClose();
                } else {
                  setStatus('idle');
                }
              }}
              className="active:scale-95 duration-100 p-1 rounded-full hover:bg-[#e8e8e8] transition-colors"
            >
              <ArrowLeft className="text-[#984800] w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-[#1a1c1c]">提交成功</h1>
          </div>
          <div className="w-10"></div> {/* Spacer for balance */}
        </header>

        <main className="flex-1 w-full max-w-md px-5 py-8 flex flex-col items-center justify-center text-center">
          {/* Success Hero Section */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-[#ff7d00]/10 rounded-full animate-ping scale-150"></div>
            <div className="w-24 h-24 bg-[#ff7d00] rounded-full flex items-center justify-center shadow-md relative z-10">
              <Check className="text-white w-14 h-14 stroke-[3]" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-[#1a1c1c] mb-1">授权下单成功</h2>
          <p className="text-lg text-[#584235] mb-8">{currentDisplayBrand} · 极速响应</p>

          {/* Dynamic Order Card (Bento Style Card) */}
          <div className="w-full bg-white border border-[#dfc0af] rounded-xl p-6 text-left shadow-sm mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="bg-[#ff7d00]/10 text-[#ff7d00] px-3 py-1 rounded-full font-semibold text-xs">
                司机师傅开单成功
              </span>
              <span className="font-semibold text-xs text-[#5f5e5e]">计费服务已开始</span>
            </div>

            <div className="flex items-center gap-4 p-4 bg-[#f3f3f3] rounded-lg mb-4">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-[#dfc0af] flex-shrink-0">
                <img 
                  className="w-full h-full object-cover" 
                  alt="Professional driver portrait" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0xN2tfIY1cQjxnbB8XiorOXJ75YSmjRPQTL2I7Ku-46ZEvHPZF9sdLx58pAPAq2NujfCo4EuYWkwWsIhPRiq3rfQsci3sI31jH0NsiDFFmLxfSLhZGXzrW_KwoTzWthXWc15veKvKyL9fA3InOUxUXNIlYvSLCAtYH6brvGIhWllHRcAHqoZ7DX8K47JtatpLGiq8ucjCUNx66G8m1d5nFpo8RFk8ajk5aGD81CJ3WqLA39Sq1D8Rgg"
                />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-[#1a1c1c]">
                  &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;五星司机&nbsp; &nbsp; &nbsp; &nbsp; &nbsp;(5.0<span style={{ color: 'rgb(255, 215, 0)' }}>★★★★★</span>)
                </h3>
                <p className="font-semibold text-xs text-[#584235]">
                  乘客手机：{passengerPhone ? passengerPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '187****9593'}
                </p>
              </div>
              <div 
                className="w-10 h-10 rounded-full bg-[#ff7d00] text-white flex items-center justify-center cursor-default"
              >
                <Phone className="w-5 h-5 fill-current" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="text-[#ff7d00] w-5 h-5 mt-1 shrink-0 animate-bounce" />
                <div>
                  <p className="font-semibold text-xs text-[#584235]">上车地点：</p>
                  <p className="text-sm text-[#1a1c1c] font-medium">{startLocation || '万达广场写字楼A座'}</p>
                </div>
              </div>
              <div className="h-4 border-l border-dashed border-[#8b7263] ml-[9px]"></div>
              <div className="flex items-start gap-2">
                <Flag className="text-[#5f5e5e] w-5 h-5 mt-1 shrink-0" />
                <div>
                  <p className="font-semibold text-xs text-[#584235]">终点</p>
                  <p className="text-sm text-[#1a1c1c] font-medium">{destination || '未知'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action Buttons */}
          <div className="w-full space-y-4">
            <button 
              onClick={() => {
                if (onClose) {
                  onClose();
                } else {
                  setStatus('idle');
                }
              }}
              className="w-full bg-[#ff7d00] text-white h-14 rounded-xl font-semibold text-base shadow-sm hover:brightness-105 active:scale-[0.98] transition-all"
            >
              下单成功，请关闭本页面
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-full flex flex-col bg-[#f9f9f9] text-[#1a1c1c] font-sans overflow-hidden select-none relative z-[10000]">
      {/* TopAppBar */}
      <header className="w-full bg-[#f9f9f9] border-b border-[#dfc0af] flex items-center justify-between px-5 h-16 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-black tracking-tight text-[#984800] select-none">
            专享自助开单系统
          </h1>
        </div>
        <div className="text-[10px] text-[#ff7d00] font-bold font-mono bg-[#ffdbc8] px-2.5 py-1 rounded-full select-none">
          安全校验通过 ⚡
        </div>
      </header>

      {/* Scrollable Main area */}
      <main className="pb-24 px-5 flex-1 overflow-y-auto max-w-md mx-auto w-full">
        {/* Animated Background Element */}
        <div className="relative h-40 mt-4 rounded-2xl overflow-hidden mb-6 bg-gradient-to-br from-[#984800] to-[#ff7d00]">
          {/* Subtle vehicle outline or road texture overlay */}
          <div className="absolute inset-0 opacity-15 mix-blend-overlay">
            <img 
              className="w-full h-full object-cover" 
              src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=800" 
              alt="City driving background"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex flex-col justify-end p-5">
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              欢迎使用 {customBrandName} 自助下单
            </h2>
            <p className="text-xs text-[#ffdbc8] mt-1">在乎你的车，更在乎你的人</p>
          </div>
        </div>

        {/* Driver Status Card */}
        <div className="bg-white border border-[#dfc0af] p-4 rounded-xl shadow-xs mb-6 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#ff7d00]"></div>
          <div className="w-12 h-12 rounded-full bg-[#ffdbc8] flex items-center justify-center shrink-0">
            <Headphones className="text-[#311300] w-6 h-6" />
          </div>
          <div className="flex-grow text-left">
            <p className="text-[10px] font-bold text-[#5f5e5e] uppercase tracking-wider mb-0.5">司机 service 通道</p>
            <p className="text-sm font-semibold text-[#1a1c1c] leading-tight">
              正在链接至司机 <span className="text-[#ff7d00] font-bold font-mono">{driverPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</span>
            </p>
            <div className="flex items-center mt-1 text-[#984800] gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff7d00] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff7d00]"></span>
              </span>
              <span className="text-[10px] font-bold text-[#984800]">开单信息为您实时加密</span>
            </div>
          </div>
          <div className="bg-[#e2dfde] p-3 rounded-xl flex items-center justify-center shrink-0 select-none">
            <QrCode className="text-[#984800] w-5 h-5" />
          </div>
        </div>

        {status === 'idle' ? (
          <>
            {/* Instruction Section */}
            <div className="mb-6 space-y-1">
              <p className="text-sm text-[#5f5e5e] leading-relaxed px-1 text-left">
                请输入您呼叫代叫司机的手机号码。输入完成后立即通知司机，并一键开启本次代驾服务。
              </p>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-5 text-left">
              {/* Phone Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#5f5e5e] flex items-center gap-1">
                  您的手机号码 <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Smartphone className="text-[#5f5e5e] w-5 h-5" />
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="请输入您的手机号"
                    value={passengerPhone}
                    onChange={(e) => setPassengerPhone(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-[#dfc0af] rounded-xl focus:ring-2 focus:ring-[#ff7d00] focus:border-[#ff7d00] outline-none text-base transition-all font-semibold"
                  />
                </div>
              </div>

              {/* Origin Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#5f5e5e] flex items-center gap-1">
                  您的出发地 <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <MapPin className="text-[#ff7d00] w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="填写当前上车位置"
                    value={startLocation}
                    onChange={(e) => setStartLocation(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border border-[#dfc0af] rounded-xl focus:ring-2 focus:ring-[#ff7d00] focus:border-[#ff7d00] outline-none text-base transition-all font-semibold"
                  />
                </div>
              </div>

              {/* Authorization Checkbox */}
              <label className="flex items-start gap-3 py-2 cursor-pointer group select-none">
                <div className="relative flex items-center mt-0.5">
                  <input
                    type="checkbox"
                    required
                    defaultChecked
                    className="peer h-6 w-6 border-2 border-[#8b7263] rounded-lg checked:bg-[#ff7d00] checked:border-[#ff7d00] transition-all appearance-none cursor-pointer focus:outline-none"
                  />
                  <Check className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none left-1 top-1 w-4 h-4 stroke-[3]" />
                </div>
                <span className="text-xs text-[#5f5e5e] group-active:text-[#1a1c1c] transition-colors leading-snug">
                  我授权自动上传位置信息并同意接受司机代驾服务
                </span>
              </label>

              {/* Main CTA */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#ff7d00] hover:bg-[#ff8f20] text-white font-bold py-5 rounded-xl active:scale-95 duration-150 transition-all flex items-center justify-center gap-2 mt-6 shadow-md shadow-[#ff7d00]/15"
              >
                {submitting ? (
                  <>
                    <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    <span>正在发送通知...</span>
                  </>
                ) : (
                  <>
                    <BellRing className="w-5 h-5" />
                    <span>确认授权司机并通知司机开单</span>
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="space-y-5 py-2 text-center animate-in fade-in duration-300">
            <div className="bg-white p-6 rounded-2xl border border-[#dfc0af] text-center space-y-3 shadow-xs">
              <div className="mx-auto w-14 h-14 rounded-full bg-[#ffdbc8] border border-[#ff7d00] flex items-center justify-center shadow-md animate-bounce">
                <CheckCircle className="w-8 h-8 text-[#984800]" />
              </div>

              <div className="space-y-1">
                <h2 className="text-lg font-bold text-[#1a1c1c] tracking-wide">🎉 授权成功！系统已播报开单</h2>
                <p className="text-xs text-[#5f5e5e] leading-relaxed px-1">
                  您的填单已送达！司机开单器调度台端已<b>同步拉取数据并开始计费服务</b>。
                </p>
              </div>
            </div>

            {/* Receipt ticket style card */}
            <div className="bg-white p-5 rounded-2xl border border-[#dfc0af] shadow-xs space-y-3 text-left relative overflow-hidden">
              <div className="absolute -left-2 top-9 w-3.5 h-3.5 bg-[#f9f9f9] rounded-full border-r border-[#dfc0af]"></div>
              <div className="absolute -right-2 top-9 w-3.5 h-3.5 bg-[#f9f9f9] rounded-full border-l border-[#dfc0af]"></div>

              <div className="flex items-center justify-between pb-3 border-b border-dashed border-[#dfc0af]">
                <span className="text-xs text-[#984800] font-bold tracking-wider">📋 尊享行程同步票据</span>
                <span className="text-[10px] bg-[#ffdbc8] text-[#733500] px-2 py-0.5 rounded-full font-bold">已触达</span>
              </div>
              <div className="space-y-2.5 pt-1 text-xs text-[#5f5e5e]">
                <div className="flex justify-between items-center">
                  <span className="text-[#584235] font-medium">上车地点：</span>
                  <div className="bg-[#f3f3f3] px-3 py-1 rounded-lg border border-[#dfc0af] flex items-center gap-1.5 text-xs font-bold text-[#1a1c1c]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff7d00]"></span>
                    <span className="truncate max-w-[180px]">{startLocation}</span>
                  </div>
                </div>
                {destination && (
                  <div className="flex justify-between items-center">
                    <span className="text-[#584235] font-medium">下车目的地：</span>
                    <div className="bg-[#f3f3f3] px-3 py-1 rounded-lg border border-[#dfc0af] flex items-center gap-1.5 text-xs font-bold text-[#1a1c1c]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a]"></span>
                      <span className="truncate max-w-[180px]">{destination}</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#584235] font-medium">乘客手机：</span>
                  <span className="text-[#984800] font-bold font-mono">{passengerPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#584235] font-medium">司机手机：</span>
                  <span className="text-[#1a1c1c] font-bold font-mono">{driverPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center pb-8">
          <p className="text-xs font-bold text-[#5f5e5e]/60">{customBrandName} · 极速响应</p>
        </div>
      </main>
    </div>
  );
}
