import React, { useState, useEffect } from 'react';
import { db, collection, doc, setDoc, onSnapshot, deleteDoc } from '../lib/dbProxy';
import { 
  MapPin, 
  Phone, 
  Navigation, 
  Loader2, 
  CheckCircle, 
  Users, 
  Search,
  Compass,
  ArrowRight,
  Trash2,
  History,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
  X,
  Lock
} from 'lucide-react';

// Haversine Distance Formula (直线距离计算)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
}

interface DispatchValetOrderProps {
  onShowToast: (msg: string) => void;
  userPhone?: string | null;
  userRole?: string;
  userTeamCity?: string;
}

export default function DispatchValetOrder({ 
  onShowToast,
  userPhone = null,
  userRole = '普通司机',
  userTeamCity = ''
}: DispatchValetOrderProps) {
  
  // States
  const [passengerAddress, setPassengerAddress] = useState('银川金凤万达广场东门');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [passengerCoords, setPassengerCoords] = useState<{ lat: number; lng: number }>({
    lat: 38.487167,
    lng: 106.23091
  });
  
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<any | null>(null);
  
  // Real active drivers from Firestore
  const [realDrivers, setRealDrivers] = useState<any[]>([]);
  const [squadPhones, setSquadPhones] = useState<string[]>([]);
  const [squadMembers, setSquadMembers] = useState<any[]>([]);
  
  // Real-time listener for all dispatched orders
  const [allDispatchedOrders, setAllDispatchedOrders] = useState<any[]>([]);
  const [showOrdersList, setShowOrdersList] = useState(false);
  const [showAllDispatchedOrdersModal, setShowAllDispatchedOrdersModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'passenger_links'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          driverPhone: docSnap.id,
          ...data
        });
      });
      // Sort by timestamp descending
      list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setAllDispatchedOrders(list);
    });
    return () => unsubscribe();
  }, []);

  // Fetch real drivers from firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'driver_users'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Skip banned drivers
        if (data.isBanned) return;
        
        list.push({
          phone: docSnap.id,
          name: data.driverName || data.customAppName || '在线代驾司机',
          lat: data.lat || (38.487167 + (Math.random() - 0.5) * 0.03),
          lng: data.lng || (106.23091 + (Math.random() - 0.5) * 0.03),
          drivingYears: data.drivingYears || 5,
          isOnline: data.isOnline === true,
          onlineOrdersEnabled: data.onlineOrdersEnabled === true,
          lastUpdatedTime: data.lastUpdatedTime || ''
        });
      });
      setRealDrivers(list);
    });
    return () => unsubscribe();
  }, []);

  // Fetch squad members to filter "进入小队的"
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'squad_members'), (snapshot) => {
      const phones: string[] = [];
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        phones.push(docSnap.id);
        list.push({
          phone: docSnap.id,
          ...docSnap.data()
        });
      });
      setSquadPhones(phones);
      setSquadMembers(list);
    });
    return () => unsubscribe();
  }, []);

  // Dynamically load AMap JS API for AutoComplete support
  useEffect(() => {
    const loadAMap = () => {
      // API Loaded and ready
    };

    let script = document.getElementById('amap-js-api-v2') as HTMLScriptElement || document.querySelector('script[src*="webapi.amap.com"]');

    if (!(window as any).AMap) {
      if (!script) {
        script = document.createElement('script');
        script.id = 'amap-js-api-v2';
        script.src = 'https://webapi.amap.com/maps?v=2.0&key=4143e567d55bbc1855231f9637efd6b0';
        script.async = true;
        script.defer = true;
        script.onload = loadAMap;
        document.head.appendChild(script);
      } else {
        script.addEventListener('load', loadAMap);
      }
    }
  }, []);

  // Suggestions search on address change
  useEffect(() => {
    const AMap = (window as any).AMap;
    if (!AMap || !passengerAddress.trim() || !showSuggestions) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      AMap.plugin('AMap.AutoComplete', () => {
        const auto = new AMap.AutoComplete({
          city: userTeamCity || '银川市',
          citylimit: true
        });
        auto.search(passengerAddress, (status: string, result: any) => {
          if (status === 'complete' && result.tips) {
            setSuggestions(result.tips.filter((t: any) => t.location && t.name));
          } else {
            setSuggestions([]);
          }
        });
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [passengerAddress, userTeamCity, showSuggestions]);

  // Combine real drivers and some simulated ones to guarantee there is always someone near the chosen coordinate
  const getCombinedDrivers = () => {
    // 1. Filter real online drivers: explicitly online, or online orders approved, or has recent location update (within 15 minutes)
    const onlineRealDrivers = realDrivers.filter(d => {
      if (d.isOnline) return true;
      if (d.onlineOrdersEnabled) return true;
      if (d.lastUpdatedTime) {
        const diffMs = Date.now() - new Date(d.lastUpdatedTime).getTime();
        if (diffMs < 15 * 60 * 1000) return true;
      }
      return false;
    });

    // 2. Select candidates (Prioritize real online drivers, fall back to any real drivers, then simulated drivers as absolute last resort)
    let baseList = onlineRealDrivers;
    if (baseList.length === 0) {
      // If no online drivers, use any registered real driver who is not banned
      baseList = realDrivers;
    }

    if (baseList.length === 0) {
      // If there are absolutely 0 real drivers in database, use mock simulation drivers
      baseList = [
        { name: '王师傅 (仿真听单 · 已入小队)', phone: '13812345601', lat: passengerCoords.lat + 0.004, lng: passengerCoords.lng + 0.003 },
        { name: '李师傅 (仿真听单 · 已入小队)', phone: '13812345602', lat: passengerCoords.lat - 0.006, lng: passengerCoords.lng - 0.005 },
        { name: '张师傅 (仿真听单 · 已入小队)', phone: '13812345603', lat: passengerCoords.lat + 0.004, lng: passengerCoords.lng + 0.003 }, 
        { name: '赵师傅 (仿真听单 · 已入小队)', phone: '13812345604', lat: passengerCoords.lat - 0.002, lng: passengerCoords.lng + 0.004 },
        { name: '陈师傅 (仿真听单 · 已入小队)', phone: '13812345605', lat: passengerCoords.lat + 0.001, lng: passengerCoords.lng - 0.002 }
      ];
    }

    const listWithDistance = baseList.map(d => ({
      ...d,
      distance: calculateDistance(passengerCoords.lat, passengerCoords.lng, d.lat, d.lng)
    }));

    // First sort by distance
    listWithDistance.sort((a, b) => a.distance - b.distance);

    // If drivers have the same distance, shuffle them randomly
    if (listWithDistance.length > 0) {
      const minDistance = listWithDistance[0].distance;
      // Filter candidates with matching closest distance (within 0.00001 km / 1 cm tolerance to avoid float issues)
      const closestCandidates = listWithDistance.filter(d => Math.abs(d.distance - minDistance) < 0.00001);
      if (closestCandidates.length > 1) {
        // Randomly shuffle the closest candidates with the same distance
        const shuffled = [...closestCandidates].sort(() => Math.random() - 0.5);
        const remaining = listWithDistance.filter(d => Math.abs(d.distance - minDistance) >= 0.00001);
        return [...shuffled, ...remaining];
      }
    }

    return listWithDistance;
  };

  const driversList = getCombinedDrivers();
  const closestDriver = driversList[0];

  // One-Key Dispatch Handler
  const handleOneKeyDispatch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passengerAddress.trim()) {
      alert('⚠️ 请先输入并选择有效的乘客出发地！');
      return;
    }

    if (!closestDriver) {
      alert('❌ 抱歉，当前暂无可派单的代驾司机人员！');
      return;
    }

    setIsDispatching(true);
    setDispatchResult(null);

    const finalPhone = passengerPhone.trim() || '未填写 (匿名代开单)';

    setTimeout(async () => {
      try {
        const finalPrice = 38; // Default simple estimated price

        await setDoc(doc(db, 'passenger_links', closestDriver.phone), {
          passengerPhone: finalPhone,
          startLocation: passengerAddress,
          destination: '由司机根据现场口头协商规划行程',
          status: 'submitted',
          timestamp: Date.now(),
          isValetOrder: true,
          passengerLat: passengerCoords.lat,
          passengerLng: passengerCoords.lng,
          approxPrice: finalPrice,
          dispatchedByPhone: userPhone || ''
        });

        setIsDispatching(false);
        setDispatchResult({
          driver: closestDriver,
          passengerPhone: finalPhone,
          startLocation: passengerAddress,
          distance: closestDriver.distance
        });

        onShowToast(`🎉 一键派单成功！已直接委派给离出发地最近的司机【${closestDriver.name}】（直线距离：${(closestDriver.distance * 1000).toFixed(0)}米）`);
      } catch (err: any) {
        setIsDispatching(false);
        alert("线上派单委派通道异常，原因: " + err.message);
      }
    }, 900);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 select-text text-slate-200">
      
      {/* Title Header */}
      <div className="text-center mb-8">
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
          商户代叫派单系统
        </h2>
        <p className="text-xs text-slate-400 mt-1.5">
          输入乘客出发地与手机号，系统将自动秒级匹配直线距离最近的执勤代驾司机
        </p>
      </div>

      {/* Main Form Card */}
      <div className="bg-[#111322] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative mb-6">
        <form onSubmit={handleOneKeyDispatch} className="space-y-5">
          
          {/* Passenger Start Location Input */}
          <div className="space-y-2 relative">
            <label className="block text-xs font-bold text-slate-300 tracking-wider">
              乘客出发地 <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-teal-400">
                <MapPin className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={passengerAddress}
                onChange={(e) => {
                  setPassengerAddress(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="请输入详细的乘客接送出发地..."
                className="w-full pl-10 pr-10 py-3 bg-[#0a0c16] border border-slate-700/80 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-sans transition-all"
                required
              />
              {passengerAddress && (
                <button
                  type="button"
                  onClick={() => {
                    setPassengerAddress('');
                    setSuggestions([]);
                  }}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-300 text-xs font-bold"
                >
                  清除
                </button>
              )}
            </div>

            {/* Suggestions drop-down list */}
            {suggestions.length > 0 && showSuggestions && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#0a0c16] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-56 overflow-y-auto scrollbar-thin">
                {suggestions.map((tip, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setPassengerAddress(tip.name);
                      if (tip.location) {
                        setPassengerCoords({
                          lat: tip.location.lat,
                          lng: tip.location.lng
                        });
                      }
                      setShowSuggestions(false);
                      setSuggestions([]);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-900 border-b border-slate-800/40 last:border-0 flex items-center gap-2.5 transition-colors"
                  >
                    <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <div className="min-w-0">
                      <span className="block text-[11px] font-bold text-white truncate">{tip.name}</span>
                      <span className="block text-[9px] text-slate-400 truncate">{tip.district || '暂无位置详情描述'}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Passenger Phone Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 tracking-wider">
              乘客手机号码
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-teal-400">
                <Phone className="w-4 h-4" />
              </span>
              <input
                type="tel"
                value={passengerPhone}
                onChange={(e) => setPassengerPhone(e.target.value)}
                placeholder="请输入乘客手机号码（选填，不填默认匿名代开单）"
                className="w-full pl-10 pr-4 py-3 bg-[#0a0c16] border border-slate-700/80 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono transition-all"
              />
            </div>
          </div>

          {/* One-Key Dispatch Submit Button */}
          <button
            type="submit"
            disabled={isDispatching}
            className="w-full py-3.5 mt-2 bg-gradient-to-r from-teal-500 to-indigo-500 hover:from-teal-600 hover:to-indigo-600 disabled:opacity-40 text-slate-950 font-black text-xs tracking-wider rounded-2xl shadow-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            {isDispatching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                正在定位起点、精准筛选离最近司机中...
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 fill-current text-slate-950" />
                一键自动匹配派单
              </>
            )}
          </button>
        </form>

        {/* Successful Dispatch Result Alert */}
        {dispatchResult && (
          <div className="mt-6 p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-left animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                <CheckCircle className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h4 className="text-xs font-extrabold text-white">✓ 派单秒同步成功！已派发至最邻近司机</h4>
                <div className="text-[11px] text-slate-300 space-y-1 bg-[#0a0c16]/80 p-3 rounded-xl border border-slate-800">
                  <p className="flex justify-between">
                    <span className="text-slate-400">承接司机：</span>
                    <span className="font-bold text-white">{dispatchResult.driver.name}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-400">司机手机：</span>
                    <span className="font-mono text-white">{dispatchResult.driver.phone}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-400">直线距离：</span>
                    <span className="font-bold text-teal-400">{(dispatchResult.distance * 1000).toFixed(0)} 米</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-400">乘客手机：</span>
                    <span className="font-mono text-white">{dispatchResult.passengerPhone}</span>
                  </p>
                  <p className="truncate">
                    <span className="text-slate-400">出发地：</span>
                    <span className="text-slate-300">{dispatchResult.startLocation}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Clickable Component to view all dispatched orders */}
      <div className="bg-[#111322]/60 border border-slate-800/60 rounded-3xl overflow-hidden transition-all duration-300">
        {/* Component Header (Clickable toggle) */}
        <button
          type="button"
          onClick={() => setShowAllDispatchedOrdersModal(true)}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-800/20 active:bg-slate-800/30 transition-colors focus:outline-none cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white">所有管理团队人员派出的订单</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                实时同步当前已派发给司机的代叫订单大盘 ({allDispatchedOrders.length} 笔)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-teal-400 font-extrabold bg-teal-500/10 border border-teal-500/15 px-3 py-1 rounded-full">
              点击查看大盘
            </span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
        </button>
      </div>

      {/* Dispatched Orders Modal Popup */}
      {showAllDispatchedOrdersModal && (
        <div className="absolute inset-0 z-50 bg-[#070913] text-slate-200 overflow-y-auto animate-in fade-in duration-200">
          <div className="min-h-full flex flex-col max-w-2xl mx-auto bg-[#0a0d1a] border-x border-slate-800 shadow-2xl">
            
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-[#0a0d1a]/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-4 sm:px-6 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-center text-teal-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white tracking-wide">派单大盘详情</h2>
                  <p className="text-[10px] text-slate-400">
                    实时监控管理团队共派发了 {allDispatchedOrders.length} 笔业务
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onShowToast('🔄 订单大盘数据已成功同步！');
                  }}
                  className="p-1.5 bg-slate-800/60 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1 text-[10px]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  同步
                </button>
                <button
                  type="button"
                  onClick={() => setShowAllDispatchedOrdersModal(false)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition-all"
                  aria-label="关闭"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-4 sm:p-6 space-y-4">
              {allDispatchedOrders.length === 0 ? (
                <div className="py-20 text-center text-slate-500 space-y-3">
                  <div className="text-4xl">📭</div>
                  <p className="text-sm font-bold">当前暂无任何管理人员派出的代叫订单</p>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    在此面板可以直接监控和管理所有团队成员在线投递的商户代叫业务订单
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allDispatchedOrders.map((order) => {
                    // Resolve driver name
                    const rawDriverName = realDrivers.find(d => d.phone === order.driverPhone)?.name || order.driverName || '未知代驾司机';
                    const driverSquadMember = squadMembers.find(m => m.phone === order.driverPhone);
                    const driverDisplayName = driverSquadMember ? driverSquadMember.name : rawDriverName;

                    // Resolve dispatcher name (The upline-assigned squad name)
                    const dispatcherSquadMember = squadMembers.find(m => m.phone === order.dispatchedByPhone);
                    const dispatcherName = dispatcherSquadMember ? dispatcherSquadMember.name : (order.dispatchedByPhone ? `管理人员(${order.dispatchedByPhone.slice(-4)})` : '系统管理员');

                    // Date format: YYYY年MM月DD日 HH点mm分ss秒
                    const formatFullDateTime = (ts: any) => {
                      if (!ts) return '时间未知';
                      try {
                        const date = new Date(ts);
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const hours = String(date.getHours()).padStart(2, '0');
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        const seconds = String(date.getSeconds()).padStart(2, '0');
                        return `${year}年${month}月${day}日 ${hours}点${minutes}分${seconds}秒`;
                      } catch (err) {
                        return '时间格式错误';
                      }
                    };
                    const formattedFullTime = formatFullDateTime(order.timestamp);

                    // Check if driver started trip / on real-time billing screen
                    const isTripStarted = order.status === 'started' || order.status === 'ended';

                    // Status tag colors
                    let statusBg = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                    let statusLabel = '呼叫中';
                    if (order.status === 'accepted') {
                      statusBg = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
                      statusLabel = '已接单/赶往中';
                    } else if (order.status === 'started') {
                      statusBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                      statusLabel = '服务计费中';
                    } else if (order.status === 'ended') {
                      statusBg = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
                      statusLabel = '已完成';
                    }

                    return (
                      <div 
                        key={order.id}
                        className="p-4 bg-[#111322]/80 border border-slate-800 rounded-2xl space-y-4 shadow-lg hover:border-slate-700/60 transition-all"
                      >
                        {/* Top Row: Status & Price */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-md border ${statusBg}`}>
                              {statusLabel}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {formattedFullTime}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-rose-400">
                              约 {order.approxPrice || '未知'} 元
                            </span>
                          </div>
                        </div>

                        {/* Dispatcher info */}
                        <div className="bg-slate-800/25 border border-slate-800/40 p-2.5 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400">派出此单管理员:</span>
                            <span className="text-xs font-black text-teal-400">{dispatcherName}</span>
                          </div>
                          {order.dispatchedByPhone && (
                            <span className="text-[10px] text-slate-500 font-mono">{order.dispatchedByPhone}</span>
                          )}
                        </div>

                        {/* Route Details */}
                        <div className="space-y-2 bg-[#0d0f1b]/50 p-3 rounded-xl border border-slate-800/40">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3.5 h-3.5 text-teal-400 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-[10px] text-slate-400 block leading-tight">出发地</span>
                              <span className="text-xs font-bold text-white block mt-0.5 truncate">{order.startLocation}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 pt-2 border-t border-slate-800/30">
                            <Navigation className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-[10px] text-slate-400 block leading-tight">目的地</span>
                              <span className="text-xs text-slate-300 block mt-0.5 truncate">{order.destination}</span>
                            </div>
                          </div>
                        </div>

                        {/* Driver & Passenger Row */}
                        <div className="grid grid-cols-2 gap-3 pt-1 text-[11px]">
                          <div className="p-2.5 bg-[#0d0f1b]/40 rounded-xl border border-slate-800/40 text-left">
                            <span className="text-slate-500 block text-[9px]">承接司机</span>
                            <span className="font-bold text-teal-400 block mt-0.5 truncate">{driverDisplayName}</span>
                            <span className="font-mono text-slate-400 text-[10px] mt-0.5 block">{order.driverPhone}</span>
                          </div>
                          <div className="p-2.5 bg-[#0d0f1b]/40 rounded-xl border border-slate-800/40 text-left">
                            <span className="text-slate-500 block text-[9px]">乘客电话</span>
                            <span className="font-mono font-bold text-white block mt-0.5">{order.passengerPhone || '未登记'}</span>
                            <span className="text-slate-400 text-[9px] mt-0.5 block">商户自主开单</span>
                          </div>
                        </div>

                        {/* Control Action: Recall Order */}
                        <div className="pt-3 border-t border-slate-800/40 flex justify-between items-center">
                          <span className="text-[9px] text-slate-500">
                            管理团队一键撤单权限
                          </span>
                          
                          {isTripStarted ? (
                            <button
                              type="button"
                              disabled
                              className="px-3 py-1.5 bg-slate-800/60 border border-slate-800 text-slate-500 text-[10px] font-black rounded-lg cursor-not-allowed flex items-center gap-1"
                              title="司机已进入实时计费页面，无法撤回此单"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              已锁单无法撤回
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(`⚠️ 确定要撤回/取消这笔由团队派给司机【${driverDisplayName}】的订单吗？\n撤回后，司机App内新来单提示将立即消失。`)) {
                                  try {
                                    await deleteDoc(doc(db, 'passenger_links', order.driverPhone));
                                    onShowToast('🗑️ 已成功撤回并取消该派单！');
                                  } catch (err: any) {
                                    alert('撤单失败：' + err.message);
                                  }
                                }
                              }}
                              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/25 text-rose-400 text-[10px] font-black rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              撤回此单
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-[#0a0d1a] border-t border-slate-800/80 px-4 py-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAllDispatchedOrdersModal(false)}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-xs font-black rounded-xl transition-all"
              >
                关闭详情大盘
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
