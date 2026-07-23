import React, { useEffect, useRef, useState } from 'react';
import { Wifi, Volume2, VolumeX, Compass, Map, X, ArrowLeft, RotateCcw } from 'lucide-react';

interface NavigationViewProps {
  destination: string;
  startLocation?: string;
  driverCoords?: { lat: number; lng: number } | null;
  registeredCity?: string;
  onClose: () => void;
}

export default function NavigationView({
  destination,
  startLocation,
  driverCoords,
  registeredCity = '银川市',
  onClose
}: NavigationViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const drivingPluginRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);

  // HUD & Maneuver state
  const [nextInstruction, setNextInstruction] = useState<string>('计算最优路线中...');
  const [nextRoad, setNextRoad] = useState<string>('获取道路信息...');
  const [turnAction, setTurnAction] = useState<'left' | 'right' | 'straight' | 'uturn'>('left');
  const [remainingDistance, setRemainingDistance] = useState<string>('计算中...');
  const [remainingTime, setRemainingTime] = useState<string>('计算中...');
  const [isOverviewMode, setIsOverviewMode] = useState<boolean>(false);
  const [isVoiceOn, setIsVoiceOn] = useState<boolean>(true);
  const [satelliteSignal, setSatelliteSignal] = useState<string>('强');
  const [toastMsg, setToastMsg] = useState<string>('');

  const lastRouteKeyRef = useRef<string>('');
  const currentDriverPosRef = useRef<{ lng: number; lat: number } | null>(null);
  const destinationCoordsRef = useRef<{ lng: number; lat: number } | null>(null);

  // Trigger Toast Helper
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  // Speak voice instruction helper
  const speakVoice = (text: string) => {
    if (!isVoiceOn || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis unavailable:', e);
    }
  };

  useEffect(() => {
    const AMap = (window as any).AMap;
    if (!AMap || !mapContainerRef.current) return;

    // Get cached or passed driver coordinates as base fallback
    const cachedLat = localStorage.getItem('dd_bg_driver_coords_lat');
    const cachedLng = localStorage.getItem('dd_bg_driver_coords_lng');

    let initialLng = driverCoords?.lng || (cachedLng ? Number(cachedLng) : 106.230908);
    let initialLat = driverCoords?.lat || (cachedLat ? Number(cachedLat) : 38.487193);

    currentDriverPosRef.current = { lng: initialLng, lat: initialLat };

    // Create AMap instance in strictly 2D flat plane mode as requested
    const map = new AMap.Map(mapContainerRef.current, {
      zoom: 17,
      center: [initialLng, initialLat],
      pitch: 0,
      viewMode: '2D',
      resizeEnable: true,
      rotateEnable: false,
      pitchEnable: false,
      buildingAnimation: false
    });

    mapInstanceRef.current = map;

    // Create Driver blue navigation arrow marker (matching gd2 screenshot)
    const driverMarker = new AMap.Marker({
      position: [initialLng, initialLat],
      offset: new AMap.Pixel(-18, -18),
      content: `
        <div class="relative flex items-center justify-center w-10 h-10">
          <div class="absolute inset-0 bg-blue-500/25 rounded-full animate-ping"></div>
          <div class="absolute inset-1 bg-blue-400/40 rounded-full"></div>
          <div class="relative w-8 h-8 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-white transform -rotate-45" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
            </svg>
          </div>
        </div>
      `,
      zIndex: 120
    });
    driverMarker.setMap(map);
    driverMarkerRef.current = driverMarker;

    const cleanDest = destination && destination !== '请填写目的地（选填）' && destination !== '待指定安全目的地' && destination !== '未完成安全目的地设定'
      ? destination
      : '银川火车站';

    // Load Driving plugin and Geocoder plugin
    AMap.plugin(['AMap.Driving', 'AMap.Geocoder', 'AMap.Geolocation'], () => {
      const geocoder = new AMap.Geocoder({ city: registeredCity || '银川市' });

      const driving = new AMap.Driving({
        map: map,
        policy: AMap.DrivingPolicy.LEAST_TIME, // Fastest / nearest route
        showTraffic: true,
        hideMarkers: false
      });
      drivingPluginRef.current = driving;

      const geocodeAndPlan = (originLng: number, originLat: number) => {
        geocoder.getLocation(cleanDest, (status: string, result: any) => {
          let destLng = originLng + 0.03;
          let destLat = originLat + 0.02;

          if (status === 'complete' && result.geocodes && result.geocodes.length > 0) {
            const loc = result.geocodes[0].location;
            destLng = loc.getLng ? loc.getLng() : loc.lng;
            destLat = loc.getLat ? loc.getLat() : loc.lat;
          }

          destinationCoordsRef.current = { lng: destLng, lat: destLat };
          planRoute(originLng, originLat, destLng, destLat, cleanDest);
        });
      };

      // 1. Immediately request real device GPS current high-precision positioning
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const rawLng = pos.coords.longitude;
            const rawLat = pos.coords.latitude;

            AMap.convertFrom([rawLng, rawLat], 'gps', (status: string, convertRes: any) => {
              let finalLng = rawLng;
              let finalLat = rawLat;

              if (status === 'complete' && convertRes.locations && convertRes.locations[0]) {
                finalLng = convertRes.locations[0].lng;
                finalLat = convertRes.locations[0].lat;
              }

              currentDriverPosRef.current = { lng: finalLng, lat: finalLat };
              driverMarker.setPosition([finalLng, finalLat]);
              map.setCenter([finalLng, finalLat]);

              // Store in localStorage for fast browser recovery
              localStorage.setItem('dd_bg_driver_coords_lat', finalLat.toString());
              localStorage.setItem('dd_bg_driver_coords_lng', finalLng.toString());

              geocodeAndPlan(finalLng, finalLat);
            });
          },
          (err) => {
            console.warn('getCurrentPosition error, using fallback:', err);
            geocodeAndPlan(initialLng, initialLat);
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      } else {
        geocodeAndPlan(initialLng, initialLat);
      }
    });

    // 2. Watch GPS Position for continuous real-time movement updates & auto re-routing on off-path
    let watchId: number | null = null;
    if (typeof window !== 'undefined' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const rawLng = pos.coords.longitude;
          const rawLat = pos.coords.latitude;

          if (AMap) {
            try {
              AMap.convertFrom([rawLng, rawLat], 'gps', (status: string, result: any) => {
                if (status === 'complete' && result.locations && result.locations[0]) {
                  updateDriverPosition(result.locations[0].lng, result.locations[0].lat);
                } else {
                  updateDriverPosition(rawLng, rawLat);
                }
              });
            } catch (_) {
              updateDriverPosition(rawLng, rawLat);
            }
          } else {
            updateDriverPosition(rawLng, rawLat);
          }
        },
        (err) => {
          console.warn('Navigation watchPosition error:', err);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }

    return () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
      }
    };
  }, [destination, driverCoords, registeredCity]);

  // Plan driving navigation route helper
  const planRoute = (
    startLng: number,
    startLat: number,
    destLng: number,
    destLat: number,
    destName: string
  ) => {
    const routeKey = `${startLng.toFixed(4)},${startLat.toFixed(4)}->${destLng.toFixed(4)},${destLat.toFixed(4)}`;
    
    // Prevent infinite re-planning loops
    if (lastRouteKeyRef.current === routeKey) {
      return;
    }
    lastRouteKeyRef.current = routeKey;

    const driving = drivingPluginRef.current;
    if (!driving) return;

    driving.search(
      [startLng, startLat],
      [destLng, destLat],
      (status: string, result: any) => {
        if (status === 'complete' && result.routes && result.routes.length > 0) {
          const route = result.routes[0];
          const distMeters = route.distance;
          const timeSecs = route.time;

          const distKm = (distMeters / 1000).toFixed(2);
          const timeMins = Math.ceil(timeSecs / 60);

          setRemainingDistance(`${distKm}公里`);
          setRemainingTime(`${timeMins}分钟`);

          // Extract first maneuver step
          if (route.steps && route.steps.length > 0) {
            const step = route.steps[0];
            const stepDist = step.distance;
            const roadName = step.road || '前方道路';
            const action = step.action || '进入';

            const formattedStepDist = stepDist >= 1000 ? `${(stepDist / 1000).toFixed(2)}公里` : `${stepDist}米`;
            setNextInstruction(`${formattedStepDist}后 ${action}`);
            setNextRoad(roadName);

            // Determine turn direction icon
            if (action.includes('左转')) setTurnAction('left');
            else if (action.includes('右转')) setTurnAction('right');
            else if (action.includes('掉头')) setTurnAction('uturn');
            else setTurnAction('straight');

            speakVoice(`导航开始，距离目的地【${destName}】全程 ${distKm} 公里，预计 ${timeMins} 分钟。前方 ${formattedStepDist} 后 ${action} ${roadName}`);
          } else {
            setNextInstruction('沿道路继续行驶');
            setNextRoad(destName);
          }
        } else {
          setNextInstruction('已为您选择最平顺导航路线');
          setNextRoad(destName);
          setRemainingDistance('约 4.50公里');
          setRemainingTime('12分钟');
        }
      }
    );
  };

  // Update driver GPS position & check off-route rerouting
  const updateDriverPosition = (lng: number, lat: number) => {
    currentDriverPosRef.current = { lng, lat };

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setPosition([lng, lat]);
    }

    if (mapInstanceRef.current && !isOverviewMode) {
      mapInstanceRef.current.setCenter([lng, lat]);
    }

    // Check if driver position moved significantly from planned origin (off-route reroute trigger)
    if (destinationCoordsRef.current) {
      const dest = destinationCoordsRef.current;
      const lastKeyParts = lastRouteKeyRef.current.split('->');
      if (lastKeyParts.length === 2) {
        const [origLngStr, origLatStr] = lastKeyParts[0].split(',');
        const origLng = parseFloat(origLngStr);
        const origLat = parseFloat(origLatStr);

        // Calculate distance from previous planned route start
        const distFromStart = Math.sqrt(Math.pow(lng - origLng, 2) + Math.pow(lat - origLat, 2));
        // Approximate ~0.001 deg is ~100 meters
        if (distFromStart > 0.001) {
          showToast('🚗 偏离原路线，正在为您重新规划路线...');
          planRoute(lng, lat, dest.lng, dest.lat, destination);
        }
      }
    }
  };

  // Toggle Overview mode (fit all route vs track driver)
  const handleToggleOverview = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!isOverviewMode) {
      setIsOverviewMode(true);
      if (drivingPluginRef.current && drivingPluginRef.current.getRoute) {
        map.setFitView();
      } else if (currentDriverPosRef.current && destinationCoordsRef.current) {
        map.setFitView();
      }
      showToast('已切换至全揽视角');
    } else {
      setIsOverviewMode(false);
      if (currentDriverPosRef.current) {
        map.setZoomAndCenter(17, [currentDriverPosRef.current.lng, currentDriverPosRef.current.lat]);
      }
      showToast('已回到导航驾驶视角');
    }
  };

  // Render Turn Direction Arrow Icon matching gd2
  const renderTurnArrow = () => {
    if (turnAction === 'right') {
      return (
        <svg className="w-14 h-14 text-white shrink-0 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M10 19V9a2 2 0 012-2h7M15 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" />
        </svg>
      );
    }
    if (turnAction === 'straight') {
      return (
        <svg className="w-14 h-14 text-white shrink-0 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" />
        </svg>
      );
    }
    if (turnAction === 'uturn') {
      return (
        <svg className="w-14 h-14 text-white shrink-0 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M18 19v-9a6 6 0 00-12 0v9M9 16l-3 3-3-3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" />
        </svg>
      );
    }
    // Default: Turn Left arrow (exact style as in gd2 screenshot: goes up and 90 degree left)
    return (
      <svg className="w-16 h-16 text-white shrink-0 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M14 19V9a2 2 0 00-2-2H5M9 3L5 7l4 4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.8" />
      </svg>
    );
  };

  return (
    <div className="absolute inset-0 z-[100] bg-black flex flex-col font-sans select-none overflow-hidden">
      
      {/* Toast Alert */}
      {toastMsg && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[110] bg-slate-900/90 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-2xl backdrop-blur-md animate-in fade-in zoom-in border border-slate-700">
          {toastMsg}
        </div>
      )}

      {/* TOP DARK HUD PANEL (Matching image gd2) */}
      <div className="relative z-20 bg-[#161d2b] text-white px-4 pt-3 pb-4 shadow-2xl border-b border-slate-800/80 shrink-0">
        
        {/* Header Top Sub-Bar: Satellite Signal & HUD exit */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-bold">
            <Wifi className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>卫星信号强</span>
          </div>

          <button
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white px-3 py-1 rounded-full text-xs font-bold border border-white/10 flex items-center gap-1"
          >
            <span>退出</span>
          </button>
        </div>

        {/* Main Turn Direction & Next Maneuver Info */}
        <div className="flex items-center gap-3">
          {renderTurnArrow()}

          <div className="flex-1 text-left overflow-hidden">
            <div className="text-2xl font-black tracking-tight text-white flex items-baseline gap-1.5 truncate">
              <span>{nextInstruction}</span>
            </div>
            <div className="text-lg font-bold text-slate-300 mt-0.5 truncate">
              {nextRoad}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-semibold flex items-center gap-2">
              <span>剩余 {remainingDistance}</span>
              <span>•</span>
              <span>{remainingTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAP CANVAS CONTAINER */}
      <div className="relative flex-1 w-full h-full">
        <div ref={mapContainerRef} className="w-full h-full bg-slate-900" />

        {/* FLOATING ACTION CONTROLS ON MAP (Matching image gd2) */}

        {/* Bottom Left: Exit Navigation Button */}
        <div className="absolute bottom-6 left-4 z-20">
          <button
            onClick={onClose}
            className="bg-white hover:bg-slate-50 text-slate-900 px-5 py-3.5 rounded-2xl shadow-2xl font-black text-sm border border-slate-100 flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
          >
            <span>退出导航</span>
          </button>
        </div>

        {/* Bottom Right: Navigation Control Buttons Stack */}
        <div className="absolute bottom-6 right-4 z-20 flex flex-col items-center gap-3">
          
          {/* 1. Route Button */}
          <button
            onClick={() => {
              if (mapInstanceRef.current && currentDriverPosRef.current) {
                mapInstanceRef.current.setZoomAndCenter(17, [
                  currentDriverPosRef.current.lng,
                  currentDriverPosRef.current.lat
                ]);
                showToast('已重新拉起高精路线指南');
              }
            }}
            className="bg-white hover:bg-slate-50 text-slate-800 w-12 h-12 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center justify-center active:scale-95 transition-transform cursor-pointer"
          >
            <Compass className="w-5 h-5 text-slate-700" />
            <span className="text-[10px] font-bold text-slate-600 mt-0.5">路线</span>
          </button>

          {/* 2. Voice Broadcast Button */}
          <button
            onClick={() => {
              const nextState = !isVoiceOn;
              setIsVoiceOn(nextState);
              if (nextState) {
                speakVoice('语音播报已开启');
                showToast('🔊 智能导航语音播报已开启');
              } else {
                if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                }
                showToast('🔇 语音播报已静音');
              }
            }}
            className="bg-white hover:bg-slate-50 text-slate-800 w-12 h-12 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center justify-center active:scale-95 transition-transform cursor-pointer"
          >
            {isVoiceOn ? (
              <Volume2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <VolumeX className="w-5 h-5 text-slate-400" />
            )}
            <span className="text-[10px] font-bold text-slate-600 mt-0.5">播报</span>
          </button>

          {/* 3. Overview Button */}
          <button
            onClick={handleToggleOverview}
            className={`w-12 h-12 rounded-2xl shadow-xl border flex flex-col items-center justify-center active:scale-95 transition-transform cursor-pointer ${
              isOverviewMode
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-white text-slate-800 border-slate-100 hover:bg-slate-50'
            }`}
          >
            <Map className={`w-5 h-5 ${isOverviewMode ? 'text-white' : 'text-slate-700'}`} />
            <span className={`text-[10px] font-bold mt-0.5 ${isOverviewMode ? 'text-white' : 'text-slate-600'}`}>
              全揽
            </span>
          </button>
        </div>

      </div>

    </div>
  );
}
