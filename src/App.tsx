/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import PhoneFrame from './components/PhoneFrame';
import HomeView from './components/HomeView';
import SettingsView, { regenerateQRCode } from './components/SettingsView';
import MileageModeView from './components/MileageModeView';
import ActiveTripView from './components/ActiveTripView';
import TripCostView from './components/TripCostView';
import PaymentQRView from './components/PaymentQRView';
import CreateOrderView from './components/CreateOrderView';
import PassengerOrderView from './components/PassengerOrderView';
import WeChatAuthMobile from './components/WeChatAuthMobile';
import WeChatMiniSimulator from './components/WeChatMiniSimulator';

import { 
  ChauffeurSettings, 
  BillingRules, 
  TripState, 
  DriverStats,
  DEFAULT_BILLING_RULES,
  DEFAULT_SETTINGS,
  checkVipActive
} from './types';
import { Sparkles, CheckCircle, Database, Smartphone, Users, ShieldAlert, FileCode } from 'lucide-react';
import AdminPanel from './components/AdminPanel';
import LoginView from './components/LoginView';
import { db, doc, onSnapshot, setDoc, deleteDoc, collection } from './lib/dbProxy';
import { IncomingOrderOverlay } from './components/IncomingOrderOverlay';

const getCityCenterCoords = (cityName: string): { lat: number; lng: number } => {
  const norm = (cityName || '').trim();
  const mapper: { [key: string]: { lat: number; lng: number } } = {
    '银川': { lat: 38.487193, lng: 106.230912 },
    '银川市': { lat: 38.487193, lng: 106.230912 },
    '北京': { lat: 39.9042, lng: 116.4074 },
    '北京市': { lat: 39.9042, lng: 116.4074 },
    '上海': { lat: 31.2304, lng: 121.4737 },
    '上海市': { lat: 31.2304, lng: 121.4737 },
    '广州': { lat: 23.1291, lng: 113.2644 },
    '广州市': { lat: 23.1291, lng: 113.2644 },
    '深圳': { lat: 22.5431, lng: 114.0579 },
    '深圳市': { lat: 22.5431, lng: 114.0579 },
    '成都': { lat: 30.5728, lng: 104.0668 },
    '成都市': { lat: 30.5728, lng: 104.0668 },
    '杭州': { lat: 30.2741, lng: 120.1551 },
    '杭州市': { lat: 30.2741, lng: 120.1551 },
    '重庆': { lat: 29.5630, lng: 106.5516 },
    '重庆市': { lat: 29.5630, lng: 106.5516 },
    '长沙': { lat: 28.1963, lng: 112.9821 },
    '长沙市': { lat: 28.1963, lng: 112.9821 },
    '武汉': { lat: 30.5928, lng: 114.3055 },
    '武汉市': { lat: 30.5928, lng: 114.3055 },
    '西安': { lat: 34.3416, lng: 108.9402 },
    '西安市': { lat: 34.3416, lng: 108.9402 },
    '南京': { lat: 32.0603, lng: 118.7969 },
    '南京市': { lat: 32.0603, lng: 118.7969 },
    '天津': { lat: 39.1256, lng: 117.1902 },
    '天津市': { lat: 39.1256, lng: 117.1902 },
    '郑州': { lat: 34.7579, lng: 113.6654 },
    '郑州市': { lat: 34.7579, lng: 113.6654 },
    '济南': { lat: 36.6512, lng: 117.1201 },
    '济南市': { lat: 36.6512, lng: 117.1201 },
    '青岛': { lat: 36.0671, lng: 120.3826 },
    '青岛市': { lat: 36.0671, lng: 120.3826 },
    '苏州': { lat: 31.2990, lng: 120.6186 },
    '苏州市': { lat: 31.2990, lng: 120.6186 },
    '宁波': { lat: 29.8683, lng: 121.5440 },
    '宁波市': { lat: 29.8683, lng: 121.5440 },
    '沈阳': { lat: 41.8057, lng: 123.4315 },
    '沈阳市': { lat: 41.8057, lng: 123.4315 },
    '哈尔滨': { lat: 45.8038, lng: 126.5350 },
    '哈尔滨市': { lat: 45.8038, lng: 126.5350 },
    '石家庄': { lat: 38.0423, lng: 114.5149 },
    '石家庄市': { lat: 38.0423, lng: 114.5149 },
    '太原': { lat: 37.8706, lng: 112.5489 },
    '太原市': { lat: 37.8706, lng: 112.5489 },
    '呼和浩特': { lat: 40.8174, lng: 111.6708 },
    '呼和浩特市': { lat: 40.8174, lng: 111.6708 },
    '乌鲁木齐': { lat: 43.8256, lng: 87.6168 },
    '乌鲁木齐市': { lat: 43.8256, lng: 87.6168 },
    '昆明': { lat: 25.0421, lng: 102.7122 },
    '昆明市': { lat: 25.0421, lng: 102.7122 },
    '贵阳': { lat: 26.5982, lng: 106.7112 },
    '贵阳市': { lat: 26.5982, lng: 106.7112 },
    '福州': { lat: 26.0745, lng: 119.3062 },
    '福州市': { lat: 26.0745, lng: 119.3062 },
    '厦门': { lat: 24.4798, lng: 118.0894 },
    '厦门市': { lat: 24.4798, lng: 118.0894 },
    '南昌': { lat: 28.6820, lng: 115.8579 },
    '南昌市': { lat: 28.6820, lng: 115.8579 },
    '合肥': { lat: 31.8608, lng: 117.2722 },
    '合肥市': { lat: 31.8608, lng: 117.2722 }
  };

  for (const key of Object.keys(mapper)) {
    if (norm.includes(key) || key.includes(norm)) {
      return mapper[key];
    }
  }

  return { lat: 38.487193, lng: 106.230912 };
};

const getPoiLngLat = (poi: any) => {
  if (!poi || !poi.location) return null;
  const loc = poi.location;
  if (typeof loc.getLng === 'function' && typeof loc.getLat === 'function') {
    return { lng: loc.getLng(), lat: loc.getLat() };
  }
  if (typeof loc.lng === 'number' && typeof loc.lat === 'number') {
    return { lng: loc.lng, lat: loc.lat };
  }
  if (typeof loc.lng === 'function' && typeof loc.lat === 'function') {
    return { lng: loc.lng(), lat: loc.lat() };
  }
  if (typeof loc === 'string') {
    const parts = loc.split(',');
    if (parts.length === 2) {
      return { lng: parseFloat(parts[0]), lat: parseFloat(parts[1]) };
    }
  }
  return null;
};

const getDistance = (lng1: number, lat1: number, lng2: number, lat2: number): number => {
  const radLat1 = lat1 * Math.PI / 180.0;
  const radLat2 = lat2 * Math.PI / 180.0;
  const a = radLat1 - radLat2;
  const b = lng1 * Math.PI / 180.0 - lng2 * Math.PI / 180.0;
  const s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a/2), 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b/2), 2)));
  return s * 6378137; // Earth radius in meters
};

const getPoiDistance = (poi: any, centerLng?: number, centerLat?: number): number => {
  if (poi.distance !== undefined && poi.distance !== null && poi.distance !== '') {
    const dist = Number(poi.distance);
    if (!isNaN(dist)) return dist;
  }
  if (centerLng !== undefined && centerLat !== undefined) {
    const loc = getPoiLngLat(poi);
    if (loc) {
      return getDistance(centerLng, centerLat, loc.lng, loc.lat);
    }
  }
  return 999999;
};

const getHighPrecisionLocationName = (
  regeocode: any, 
  fallbackAddress: string, 
  centerLng?: number, 
  centerLat?: number
): string => {
  if (!regeocode) return fallbackAddress;

  const addressComp = regeocode.addressComponent || {};
  const unacceptableKeywords = ['公厕', '公共厕所', '垃圾站', '垃圾转运', '配电房', '变电站', '充电站', '高压线', '环卫'];

  // Identify the closest road name
  let roadName = '';
  if (regeocode.roads && regeocode.roads.length > 0) {
    if (regeocode.roads[0] && regeocode.roads[0].name) {
      roadName = regeocode.roads[0].name;
    }
  }

  if (!roadName && addressComp.street && typeof addressComp.street === 'string' && addressComp.street.trim()) {
    roadName = addressComp.street.trim();
  }
  if (!roadName && addressComp.streetNumber && addressComp.streetNumber.street && typeof addressComp.streetNumber.street === 'string') {
    roadName = addressComp.streetNumber.street.trim();
  }

  let poiName = '';
  // Sort POIs strictly by physical distance to prioritize the closest specific store/building
  if (regeocode.pois && regeocode.pois.length > 0) {
    const validPois = regeocode.pois.filter((poi: any) => {
      const name = poi.name || '';
      return !unacceptableKeywords.some(kw => name.includes(kw));
    });
    if (validPois.length > 0) {
      const sortedPois = [...validPois].sort((a, b) => {
        return getPoiDistance(a, centerLng, centerLat) - getPoiDistance(b, centerLng, centerLat);
      });
      poiName = sortedPois[0].name;
    } else {
      const sortedAllPois = [...regeocode.pois].sort((a, b) => {
        return getPoiDistance(a, centerLng, centerLat) - getPoiDistance(b, centerLng, centerLat);
      });
      poiName = sortedAllPois[0].name;
    }
  } else if (regeocode.aois && regeocode.aois.length > 0) {
    // Fall back to first AOI
    poiName = regeocode.aois[0].name;
  } else {
    let neighborhoodName = '';
    if (addressComp.neighborhood) {
      neighborhoodName = typeof addressComp.neighborhood === 'string'
        ? addressComp.neighborhood
        : (addressComp.neighborhood.name || '');
    }
    if (neighborhoodName && neighborhoodName.trim()) {
      poiName = neighborhoodName;
    } else {
      let buildingName = '';
      if (addressComp.building) {
        buildingName = typeof addressComp.building === 'string'
          ? addressComp.building
          : (addressComp.building.name || '');
      }
      if (buildingName && buildingName.trim()) {
        poiName = buildingName;
      } else {
        const formattedAddress = regeocode.formattedAddress || fallbackAddress;
        let cleanLabel = formattedAddress;
        if (addressComp.province) cleanLabel = cleanLabel.replace(addressComp.province, '');
        if (addressComp.city) cleanLabel = cleanLabel.replace(addressComp.city, '');
        if (addressComp.district) cleanLabel = cleanLabel.replace(addressComp.district, '');
        poiName = cleanLabel.trim() ? cleanLabel : formattedAddress;
      }
    }
  }

  if (roadName && poiName) {
    if (poiName.includes(roadName)) {
      return poiName;
    }
    return `（${roadName}）${poiName}`;
  }
  return poiName || fallbackAddress;
};

const getCurrent6AmDay = (): string => {
  const now = new Date();
  const adjusted = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const yyyy = adjusted.getFullYear();
  const mm = String(adjusted.getMonth() + 1).padStart(2, '0');
  const dd = String(adjusted.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function App() {
  // Support WeChat mobile authorization route directly
  if (window.location.pathname === '/wechat-login-mobile') {
    return <WeChatAuthMobile />;
  }

  const isStandaloneAdmin = () => {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname;
    const params = new URLSearchParams(window.location.search);
    // If a driver phone or passenger self-service flag is provided via URL, it is NOT standalone admin!
    if (params.get('passenger') === 'true' || params.has('driver')) {
      return false;
    }
    return hostname === 'admin.lyheiwandaijiamax.com' || params.get('admin') === 'true';
  };

  // --- 1. Persistent State Management ---
  const [billingRules, setBillingRules] = useState<BillingRules>(() => {
    const cached = localStorage.getItem('dd_billing_rules');
    return cached ? JSON.parse(cached) : DEFAULT_BILLING_RULES;
  });

  const [onlineBillingRules, setOnlineBillingRules] = useState<BillingRules>(DEFAULT_BILLING_RULES);

  const [settings, setSettings] = useState<ChauffeurSettings>(() => {
    const cached = localStorage.getItem('dd_settings');
    return cached ? JSON.parse(cached) : DEFAULT_SETTINGS;
  });

  const [stats, setStats] = useState<DriverStats>(() => {
    const cached = localStorage.getItem('dd_stats');
    const hasResetMyPoints = localStorage.getItem('dd_stats_reset_my_points_v1');
    const defaultStats: DriverStats = { todayOrders: 0, todayIncome: 0.00, myPoints: 0, lastResetDate: getCurrent6AmDay() };

    if (!hasResetMyPoints) {
      localStorage.setItem('dd_stats_reset_my_points_v1', 'true');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          parsed.myPoints = 0;
          localStorage.setItem('dd_stats', JSON.stringify(parsed));
          const currentDay = getCurrent6AmDay();
          if (parsed.lastResetDate !== currentDay) {
            parsed.todayOrders = 0;
            parsed.todayIncome = 0.00;
            parsed.lastResetDate = currentDay;
          }
          return { ...defaultStats, ...parsed };
        } catch {
          return defaultStats;
        }
      }
    }

    if (!cached) return defaultStats;
    try {
      const parsed = JSON.parse(cached);
      if (parsed.myPoints === undefined || parsed.myPoints === 360) {
        parsed.myPoints = 0;
      }
      const currentDay = getCurrent6AmDay();
      if (parsed.lastResetDate !== currentDay) {
        parsed.todayOrders = 0;
        parsed.todayIncome = 0.00;
        parsed.lastResetDate = currentDay;
      }
      return { ...defaultStats, ...parsed };
    } catch {
      return defaultStats;
    }
  });

  const [currentTrip, setCurrentTrip] = useState<TripState | null>(() => {
    const cached = localStorage.getItem('dd_current_trip');
    return cached ? JSON.parse(cached) : null;
  });

  const [isOnline, setIsOnline] = useState<boolean>(() => {
    const cached = localStorage.getItem('dd_is_online');
    return cached === 'true';
  });

  const [currentView, setCurrentView] = useState<string>('home');
  const [mobileActiveTab, setMobileActiveTab] = useState<'app' | 'admin' | 'passenger' | 'wechat_mini'>(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const params = new URLSearchParams(window.location.search);
      // Prioritize passenger view for QR code scans
      if (params.get('passenger') === 'true' || params.has('driver')) {
        return 'passenger';
      }
      if (hostname === 'admin.lyheiwandaijiamax.com' || params.get('admin') === 'true') {
        return 'admin';
      }
      if (params.get('wechat_mini') === 'true') {
        return 'wechat_mini';
      }
    }
    return 'app';
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [passengerDriverPhone, setPassengerDriverPhone] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('driver');
  });
  const [userPhone, setUserPhone] = useState<string | null>(() => {
    return localStorage.getItem('dd_user_phone');
  });

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('isAdminAuthenticated') === 'true';
    }
    return false;
  });

  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  // Version management states at the root level of the app
  const [sysVersion, setSysVersion] = useState<string>('V1.0');
  const [sysForceUpgrade, setSysForceUpgrade] = useState<boolean>(false);
  const [sysUpgradeUrl, setSysUpgradeUrl] = useState<string>('https://download.heiwan.com/max');
  const [sysXianyuUrl, setSysXianyuUrl] = useState<string>('https://www.goofish.com');
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);

  // Real-time listen for system version information
  useEffect(() => {
    const versionDocRef = doc(db, 'config', 'system_version');
    const unsubscribe = onSnapshot(versionDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSysVersion(data.version || 'V1.0');
        setSysForceUpgrade(!!data.forceUpgrade);
        setSysUpgradeUrl(data.upgradeUrl || 'https://download.heiwan.com/max');
        setSysXianyuUrl(data.xianyuUrl || 'https://www.goofish.com');
      }
    }, (error) => {
      console.error("Error subscribing to system version:", error);
    });
    return () => unsubscribe();
  }, []);

  // Sync upgrade modal & online status when cloud version settings change in real-time
  useEffect(() => {
    if (sysForceUpgrade) {
      if (isOnline) {
        setIsOnline(false);
        setShowUpgradeModal(true);
      }
    } else {
      // If force upgrade is canceled/downgraded, dismiss the upgrade modal in real-time.
      setShowUpgradeModal(false);
    }
  }, [sysForceUpgrade, isOnline]);

  useEffect(() => {
    const q = collection(db, 'team_members');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setTeamMembers(list);
    }, (error) => {
      console.error("Error subscribing to team members in App:", error);
    });
    return () => unsubscribe();
  }, []);

  const [isInSquad, setIsInSquad] = useState(false);

  useEffect(() => {
    if (!userPhone) {
      setIsInSquad(false);
      return;
    }
    const docRef = doc(db, 'squad_members', userPhone);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      setIsInSquad(docSnap.exists());
    }, (error) => {
      console.error("Error subscribing to squad member state:", error);
    });
    return () => unsubscribe();
  }, [userPhone]);

  const loggedInMember = teamMembers.find(m => m.phone === userPhone);
  const userRole = (isAdminAuthenticated || userPhone === '15509601222')
    ? '开发者司机'
    : (loggedInMember ? loggedInMember.role : '普通司机');
  const userTeamCity = loggedInMember ? loggedInMember.city : '';
  const [incomingOrder, setIncomingOrder] = useState<any>(null);
  const [activeOnlineOrder, setActiveOnlineOrder] = useState<any>(null);
  const [driverCoords, setDriverCoords] = useState<{ lat: number; lng: number }>(() => {
    try {
      const cachedLat = localStorage.getItem('dd_bg_driver_coords_lat');
      const cachedLng = localStorage.getItem('dd_bg_driver_coords_lng');
      if (cachedLat && cachedLng) {
        return { lat: Number(cachedLat), lng: Number(cachedLng) };
      }
    } catch (_) {}
    return {
      lat: 38.487193,
      lng: 106.230912
    };
  });

  // Load Gaode Map API script once in App.tsx to ensure background geolocation works flawlessly
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const scriptId = 'amap-js-api-v2-main';
    let script = document.getElementById(scriptId) as HTMLScriptElement || document.querySelector('script[src*="webapi.amap.com"]');
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://webapi.amap.com/maps?v=2.0&key=4143e567d55bbc1855231f9637efd6b0';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  // Periodically track physical geolocation of the driver, and update/sync it onto their driver_user document in Firestore
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncDriverLocation = () => {
      const city = settings?.city || '银川市';
      const fallbackGrid = getCityCenterCoords(city);
      const AMap = (window as any).AMap;

      const updateCoords = (latitude: number, longitude: number, methodUsed: string) => {
        setDriverCoords({ lat: latitude, lng: longitude });
        localStorage.setItem('dd_bg_driver_coords_lat', latitude.toString());
        localStorage.setItem('dd_bg_driver_coords_lng', longitude.toString());
        
        // Silently store coordinate updates directly onto the active DB document to let simulated matching query work stably
        if (userPhone && isOnline) {
          const uRef = doc(db, 'driver_users', userPhone);
          setDoc(uRef, { 
            lat: latitude, 
            lng: longitude, 
            lastUpdatedBy: methodUsed, 
            lastUpdatedTime: new Date().toISOString() 
          }, { merge: true }).catch((e) => {
            console.error("Failed to sync driver GPS location coordinates to Firestore:", e);
          });
        }

        // Trigger real-time reverse geocoding on coordinate update to keep high-precision location name in sync in background
        if (AMap) {
          AMap.plugin('AMap.Geocoder', () => {
            try {
              const geocoder = new AMap.Geocoder({
                city: city,
                extensions: 'all'
              });
              geocoder.getAddress([longitude, latitude], (geoStatus: string, geoResult: any) => {
                if (geoStatus === 'complete' && geoResult.regeocode) {
                  const name = getHighPrecisionLocationName(geoResult.regeocode, geoResult.regeocode.formattedAddress, longitude, latitude);
                  localStorage.setItem('dd_bg_driver_coords_name', name);
                }
              });
            } catch (e) {
              console.warn("Geocoder background execution failed:", e);
            }
          });
        }
      };

      const fallbackToBrowserGeolocation = () => {
        if (navigator.geolocation) {
          try {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const latitude = pos.coords.latitude;
                const longitude = pos.coords.longitude;
                updateCoords(latitude, longitude, "HTML5 Geolocation (High Accuracy)");
              },
              (err) => {
                console.warn("⚡ [App GPS] High-accuracy tracking failed, trying lower accuracy fallback:", err.message);
                navigator.geolocation.getCurrentPosition(
                  (pos2) => {
                    const latitude2 = pos2.coords.latitude;
                    const longitude2 = pos2.coords.longitude;
                    updateCoords(latitude2, longitude2, "HTML5 Geolocation (Standard Accuracy)");
                  },
                  (err2) => {
                    console.warn("⚡ [App GPS] All tracking attempts failed, using city center fallback:", err2.message);
                    setDriverCoords(fallbackGrid);

                    if (userPhone && isOnline) {
                      const uRef = doc(db, 'driver_users', userPhone);
                      setDoc(uRef, { 
                        ...fallbackGrid, 
                        lastUpdatedBy: "City Center Fallback", 
                        lastUpdatedTime: new Date().toISOString() 
                      }, { merge: true }).catch((e) => {
                        console.error("Failed to sync driver fallback coordinates to Firestore:", e);
                      });
                    }
                  },
                  { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
                );
              },
              { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
            );
          } catch (geoErr) {
            console.warn("Synchronous geolocation error caught inside iframe fallback:", geoErr);
            setDriverCoords(fallbackGrid);
          }
        } else {
          setDriverCoords(fallbackGrid);
          if (userPhone && isOnline) {
            const uRef = doc(db, 'driver_users', userPhone);
            setDoc(uRef, { 
              ...fallbackGrid, 
              lastUpdatedBy: "City Center Fallback No GPS Support", 
              lastUpdatedTime: new Date().toISOString() 
            }, { merge: true }).catch((e) => {
              console.error("Failed to sync driver fallback coordinates to Firestore:", e);
            });
          }
        }
      };

      // If Gaode Map AMap SDK is loaded, prefer AMap Geolocation (highly optimized for domestic high accuracy and fast positioning)
      if (AMap) {
        AMap.plugin('AMap.Geolocation', () => {
          try {
            const geolocation = new AMap.Geolocation({
              enableHighAccuracy: true,  // Use GPS/high accuracy
              timeout: 8000,             // 8s timeout to allow satellite lock
              noIpLocate: 0,             // Support IP fallback if GPS fails
              noGeoLocation: 0,
            });

            geolocation.getCurrentPosition((status: string, result: any) => {
              if (status === 'complete' && result.position) {
                const lat = result.position.lat;
                const lng = result.position.lng;
                updateCoords(lat, lng, "Gaode Map (AMap) Geolocation API");
              } else {
                console.warn("Gaode AMap Geolocation plugin failed, falling back to browser API. Details:", status, result);
                fallbackToBrowserGeolocation();
              }
            });
          } catch (e) {
            console.error("Exception during Gaode AMap Geolocation:", e);
            fallbackToBrowserGeolocation();
          }
        });
      } else {
        // Fallback directly to native browser API if AMap is not ready yet
        fallbackToBrowserGeolocation();
      }
    };

    // Trigger instant location alignment on mount / status transitions
    syncDriverLocation();

    // Recheck location every 12 seconds to ensure high accuracy
    const trackTimer = setInterval(syncDriverLocation, 12000);
    return () => clearInterval(trackTimer);
  }, [userPhone, isOnline, settings?.city]);

  const handleLogout = () => {
    localStorage.removeItem('dd_user_phone');
    setUserPhone(null);
    setCurrentView('home');
    triggerToast('您的司机端安全会话已安全退出断开！');
  };

  // Real-time synchronization for global online billing rules configured in Admin Panel
  useEffect(() => {
    const configDocRef = doc(db, 'config', 'online_billing_rules');
    const unsubscribe = onSnapshot(configDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const activeName = data.activeTemplateName || '线上二维码开单';
        const templatesList = data.templates || [];
        const found = templatesList.find((t: any) => t.templateName === activeName);
        if (found) {
          setOnlineBillingRules(found);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Sinks to disk
  useEffect(() => {
    localStorage.setItem('dd_billing_rules', JSON.stringify(billingRules));
  }, [billingRules]);

  useEffect(() => {
    localStorage.setItem('dd_settings', JSON.stringify(settings));
  }, [settings]);

  // One-time automatic clean-up of legacy QR codes from user session/database to eliminate old center logos/text
  useEffect(() => {
    const isCleaned = localStorage.getItem('dd_qr_clean_v3') === 'true';
    if (!isCleaned) {
      localStorage.setItem('dd_qr_clean_v3', 'true');
      const cleanLegacyQrs = async () => {
        let updated = false;
        const newSettings = { ...settings };
        
        if (settings.wechatQrCode) {
          try {
            const cleaned = await regenerateQRCode(settings.wechatQrCode, 'wechat');
            if (cleaned && cleaned !== settings.wechatQrCode) {
              newSettings.wechatQrCode = cleaned;
              updated = true;
            }
          } catch (e) {
            console.error("Auto-heal WeChat QR failed: ", e);
          }
        }
        
        if (settings.alipayQrCode) {
          try {
            const cleaned = await regenerateQRCode(settings.alipayQrCode, 'alipay');
            if (cleaned && cleaned !== settings.alipayQrCode) {
              newSettings.alipayQrCode = cleaned;
              updated = true;
            }
          } catch (e) {
            console.error("Auto-heal Alipay QR failed: ", e);
          }
        }
        
        if (updated) {
          setSettings(newSettings);
        }
      };
      
      cleanLegacyQrs();
    }
  }, []);

  // Synchronize driver user account membership expiry & online orders status with Firestore in real-time
  useEffect(() => {
    if (!userPhone) return;
    
    const userDocRef = doc(db, 'driver_users', userPhone);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data) {
          setSettings(prev => {
            let nextSettings = { ...prev };
            let changed = false;
            if (data.vipExpiry !== undefined && prev.vipExpiry !== data.vipExpiry) {
              nextSettings.vipExpiry = data.vipExpiry;
              changed = true;
            }
            if (data.onlineOrdersEnabled !== undefined && prev.onlineOrdersEnabled !== data.onlineOrdersEnabled) {
              nextSettings.onlineOrdersEnabled = data.onlineOrdersEnabled;
              changed = true;
            }
            if (data.city !== undefined && prev.city !== data.city) {
              nextSettings.city = data.city;
              changed = true;
            }
            if (data.isBanned !== undefined && prev.isBanned !== data.isBanned) {
              nextSettings.isBanned = data.isBanned;
              changed = true;
            }
            if (data.customAppName !== undefined && prev.customAppName !== data.customAppName) {
              nextSettings.customAppName = data.customAppName;
              changed = true;
            }
            if (data.wechatQrCode !== undefined && prev.wechatQrCode !== data.wechatQrCode) {
              nextSettings.wechatQrCode = data.wechatQrCode;
              changed = true;
            }
            if (data.alipayQrCode !== undefined && prev.alipayQrCode !== data.alipayQrCode) {
              nextSettings.alipayQrCode = data.alipayQrCode;
              changed = true;
            }
            if (data.billingTemplateName !== undefined && prev.billingTemplateName !== data.billingTemplateName) {
              nextSettings.billingTemplateName = data.billingTemplateName;
              changed = true;
            }
            if (data.voiceBroadcast !== undefined && prev.voiceBroadcast !== data.voiceBroadcast) {
              nextSettings.voiceBroadcast = data.voiceBroadcast;
              changed = true;
            }
            if (data.accountBalance !== undefined && prev.accountBalance !== data.accountBalance) {
              nextSettings.accountBalance = data.accountBalance;
              changed = true;
            }
            if (data.startServiceSMS !== undefined && prev.startServiceSMS !== data.startServiceSMS) {
              nextSettings.startServiceSMS = data.startServiceSMS;
              changed = true;
            }
            if (data.endServiceSMS !== undefined && prev.endServiceSMS !== data.endServiceSMS) {
              nextSettings.endServiceSMS = data.endServiceSMS;
              changed = true;
            }
            if (data.smsContent !== undefined && prev.smsContent !== data.smsContent) {
              nextSettings.smsContent = data.smsContent;
              changed = true;
            }
            if (data.homepageColorway !== undefined && prev.homepageColorway !== data.homepageColorway) {
              nextSettings.homepageColorway = data.homepageColorway;
              changed = true;
            }
            if (data.deviationMitigation !== undefined && prev.deviationMitigation !== data.deviationMitigation) {
              nextSettings.deviationMitigation = data.deviationMitigation;
              changed = true;
            }
            if (data.deviationKm !== undefined && prev.deviationKm !== data.deviationKm) {
              nextSettings.deviationKm = data.deviationKm;
              changed = true;
            }
            if (data.deviationWaitSec !== undefined && prev.deviationWaitSec !== data.deviationWaitSec) {
              nextSettings.deviationWaitSec = data.deviationWaitSec;
              changed = true;
            }
            return changed ? nextSettings : prev;
          });
        }
      } else {
        // Create user doc if it doesn't exist yet
        const initialExpiry = settings.vipExpiry || '';
        const initialOnlineEnabled = settings.onlineOrdersEnabled || false;
        const initialCity = settings.city || '';
        const initialIsBanned = settings.isBanned || false;
        setDoc(userDocRef, {
          phoneNumber: userPhone,
          vipExpiry: initialExpiry,
          onlineOrdersEnabled: initialOnlineEnabled,
          city: initialCity,
          isBanned: initialIsBanned,
          customAppName: settings.customAppName || '',
          wechatQrCode: settings.wechatQrCode || '',
          alipayQrCode: settings.alipayQrCode || '',
          billingTemplateName: settings.billingTemplateName || '',
          voiceBroadcast: settings.voiceBroadcast || '',
          accountBalance: settings.accountBalance || 0,
          startServiceSMS: !!settings.startServiceSMS,
          endServiceSMS: !!settings.endServiceSMS,
          smsContent: settings.smsContent || '',
          homepageColorway: settings.homepageColorway || 'green',
          deviationMitigation: !!settings.deviationMitigation,
          deviationKm: settings.deviationKm ?? 1.0,
          deviationWaitSec: settings.deviationWaitSec ?? 30,
          updatedAt: new Date().toISOString()
        }).catch(err => {
          console.error("Error registering driver user in firestore:", err);
        });
      }
    }, (err) => {
      console.error("Error listening to driver user changes:", err);
    });
    
    return () => unsubscribe();
  }, [userPhone]);

  useEffect(() => {
    localStorage.setItem('dd_stats', JSON.stringify(stats));
  }, [stats]);

  // Automatic daily reset at 6:00 AM
  useEffect(() => {
    const checkAndResetStats = () => {
      const currentDay = getCurrent6AmDay();
      if (stats.lastResetDate !== currentDay) {
        setStats(prev => ({
          ...prev,
          todayOrders: 0,
          todayIncome: 0.00,
          lastResetDate: currentDay
        }));
      }
    };

    // Run custom reset check immediately on mount/update
    checkAndResetStats();

    // Check every 10 seconds for precise, live 6:00 AM transition
    const interval = setInterval(checkAndResetStats, 10000);
    return () => clearInterval(interval);
  }, [stats.lastResetDate]);

  useEffect(() => {
    if (currentTrip) {
      localStorage.setItem('dd_current_trip', JSON.stringify(currentTrip));
    } else {
      localStorage.removeItem('dd_current_trip');
    }
  }, [currentTrip]);

  useEffect(() => {
    localStorage.setItem('dd_is_online', isOnline ? 'true' : 'false');
  }, [isOnline]);

  // Active Account Ban Listener: automatically force-offline banned driver
  useEffect(() => {
    if (settings.isBanned && isOnline) {
      setIsOnline(false);
      alert('⚠️ 系统警告：您的账号已被管理员封停。已强制为您切换至下线状态，封停期间您将无法接单或开启线上听单服务！如有异议请联系客服。');
    }
  }, [settings.isBanned, isOnline]);

  // Active Online Listening Qualification Listener: automatically force-offline drivers without active approval (except developer drivers)
  useEffect(() => {
    if (userRole !== '开发者司机' && !settings.onlineOrdersEnabled && isOnline) {
      setIsOnline(false);
      alert('⚠️ 听单资质已失效：您的账号尚未通过「线上听单资质认证」或开通资格已被管理员收回。已强制为您切换至下线状态！');
    }
  }, [settings.onlineOrdersEnabled, isOnline, userRole]);

  // Listen for real-time incoming passenger orders from passenger self-service scans or admin dispatching
  useEffect(() => {
    if (!userPhone) return;

    const docRef = doc(db, 'passenger_links', userPhone);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.status === 'submitted') {
          const submitTime = data.timestamp || 0;
          // Verify submission timestamp to avoid processing historical stales (last 1 hour to prevent clock skews)
          if (submitTime > Date.now() - 3600000) {
            // Verify dispatching/receiving permissions: management team is unaffected by dispatch squad restrictions
            const isManagementTeam = userRole === '开发者司机' || userRole === '城市老板司机' || userRole === '城市管理司机' || userRole === '城市派单员司机';
            const isApproved = !!settings.onlineOrdersEnabled;
            const canReceive = isManagementTeam || (isApproved && isInSquad);

            if (!canReceive) {
              console.log("Blocking incoming order: Driver is not approved or not in squad, and not in management team.");
              return;
            }

            // Only trigger if we are NOT on the 'create_order' (手动报单) view
            if (currentView !== 'create_order') {
              setIncomingOrder(data);
            }
          }
        }
      }
    });

    return () => unsubscribe();
  }, [userPhone, currentView, userRole, settings.onlineOrdersEnabled, isInSquad]);

  const handleAcceptIncomingOrder = (trip: TripState) => {
    if (!userPhone) return;
    setActiveOnlineOrder(incomingOrder);
    setCurrentView('create_order');
    setIncomingOrder(null);
    triggerToast('✓ 成功确认接单！已自动为您规划骑行前往接客起点的路线。');
    // Clear/delete the passenger link doc to finish the session
    deleteDoc(doc(db, 'passenger_links', userPhone)).catch(err => {
      console.error("Error clearing accepted passenger order link document:", err);
    });
  };

  const handleDeclineIncomingOrder = () => {
    if (!userPhone) return;
    setIncomingOrder(null);
    triggerToast('已拒收/取消当前派发的线上订单。');
    // Clear/delete the passenger link doc to finish the session
    deleteDoc(doc(db, 'passenger_links', userPhone)).catch(err => {
      console.error("Error clearing declined passenger order link document:", err);
    });
  };

  // Handle route locking: if an active ride is underway, keep display constrained to active navigation
  useEffect(() => {
    if (currentTrip) {
      if (currentTrip.currentStatus === 'serving') {
        setCurrentView('navigation');
      } else if (currentTrip.currentStatus === 'ended') {
        setCurrentView('cost');
      } else if (currentTrip.currentStatus === 'payment_pending') {
        setCurrentView('payment_qr');
      }
    }
  }, [currentTrip]);

  // --- 2. Action Flow Responders ---
  const handleStartTrip = (trip: TripState) => {
    setCurrentTrip(trip);
    setCurrentView('navigation');
    triggerToast('订单已被接单！计费计时系统已极速激活。');
  };

  const handleUpdateTrip = (updated: TripState) => {
    setCurrentTrip(updated);
  };

  const handleEndTrip = (finalBaseFee: number) => {
    if (!currentTrip) return;
    const endedTrip = {
      ...currentTrip,
      calculatedBaseFee: finalBaseFee,
      currentStatus: 'ended' as const
    };
    setCurrentTrip(endedTrip);
    setCurrentView('cost');
    triggerToast('行程结束。请登记路桥及垫付费用。');
  };

  const handleGoToCollection = (finalizedTrip: TripState) => {
    setCurrentTrip(finalizedTrip);
    setCurrentView('payment_qr');
  };

  const handleFinishTrip = (amount: number) => {
    // Record to driver order history
    if (currentTrip) {
      try {
        const existingStr = localStorage.getItem('dd_driver_orders');
        let orders = existingStr ? JSON.parse(existingStr) : [];
        if (!Array.isArray(orders)) orders = [];
        const now = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 6);

        // Filter out orders older than half a year (6 months)
        orders = orders.filter((order: any) => {
          if (!order) return false;
          if (order.timestamp) {
            return new Date(order.timestamp) >= sixMonthsAgo;
          }
          if (order.id && !isNaN(Number(order.id))) {
            const ts = Number(order.id);
            if (ts > 1500000000000) {
              return new Date(ts) >= sixMonthsAgo;
            }
          }
          if (order.timeStr && typeof order.timeStr === 'string') {
            const parts = order.timeStr.match(/(\d+)-(\d+)\s+(\d+):(\d+)/);
            if (parts) {
              const month = parseInt(parts[1], 10) - 1;
              const day = parseInt(parts[2], 10);
              const hour = parseInt(parts[3], 10);
              const min = parseInt(parts[4], 10);
              const orderDate = new Date(now.getFullYear(), month, day, hour, min);
              if (orderDate > now) {
                orderDate.setFullYear(now.getFullYear() - 1);
              }
              return orderDate >= sixMonthsAgo;
            }
          }
          return true;
        });

        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        
        const newOrder = {
          id: currentTrip.id || Date.now().toString(),
          timeStr: `${month}-${day} ${hours}:${minutes}`,
          timestamp: Date.now(),
          amount: amount,
          startLocation: currentTrip.startLocation || '未定位起点',
          endLocation: currentTrip.endLocation || '未定位终点',
          type: currentTrip.orderType || (currentTrip.isOnlineOrder ? '乘客下单' : '报单'),
          status: '已支付'
        };
        orders.unshift(newOrder);
        localStorage.setItem('dd_driver_orders', JSON.stringify(orders));
      } catch (e) {
        console.error('Failed to save order to history:', e);
      }
    }

    // Add up stats securely
    const nextPoints = (stats.myPoints || 0) + 1;
    const updatedStats = {
      todayOrders: stats.todayOrders + 1,
      todayIncome: Number((stats.todayIncome + amount).toFixed(2)),
      myPoints: nextPoints,
      lastResetDate: stats.lastResetDate || getCurrent6AmDay()
    };
    setStats(updatedStats);
    setCurrentTrip(null);
    setCurrentView('home');

    const isVip = checkVipActive(settings.vipExpiry);
    if (!isVip && updatedStats.todayOrders >= 2) {
      setIsOnline(false);
      triggerToast(`账款 ¥${amount.toFixed(2)} 元收取成功！提示：因您不是VIP，达每日2次上限已自动下线。`);
    } else {
      triggerToast(`账款 ¥${amount.toFixed(2)} 元收取成功，并入今日收入统计！`);
    }

    // Voice announcement overlay completion
    if (settings.voiceBroadcast === '开单语音播报' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const textStr = `收款成功。本次收款金额：${amount}元，已存入代驾指定账户钱包中。感谢您的辛苦劳动！`;
        const utter = new SpeechSynthesisUtterance(textStr);
        utter.lang = 'zh-CN';
        window.speechSynthesis.speak(utter);
      } catch(e){}
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  const handleToggleOnline = (online: boolean) => {
    if (online) {
      if (sysForceUpgrade) {
        setShowUpgradeModal(true);
        return;
      }
      const isVip = checkVipActive(settings.vipExpiry);
      if (!isVip && stats.todayOrders >= 2) {
        alert('🔒 提示：非VIP会员每日限制报单次数已用完（每天限额2次，明早6:00自动恢复，激活VIP解除限制）。');
        return;
      }
    }
    setIsOnline(online);
    if (userPhone) {
      const userDocRef = doc(db, 'driver_users', userPhone);
      setDoc(userDocRef, {
        isOnline: online,
        lastOnlineTime: online ? new Date().toISOString() : null
      }, { merge: true }).catch((e) => {
        console.error("Failed to sync isOnline toggle to Firestore:", e);
      });
    }
  };

  const handleUpdateSettings = (newSettings: ChauffeurSettings) => {
    setSettings(newSettings);
    if (userPhone) {
      const userDocRef = doc(db, 'driver_users', userPhone);
      setDoc(userDocRef, {
        phoneNumber: userPhone,
        vipExpiry: newSettings.vipExpiry || '',
        customAppName: newSettings.customAppName || '',
        wechatQrCode: newSettings.wechatQrCode || '',
        alipayQrCode: newSettings.alipayQrCode || '',
        billingTemplateName: newSettings.billingTemplateName || '',
        voiceBroadcast: newSettings.voiceBroadcast || '',
        accountBalance: newSettings.accountBalance ?? 0,
        startServiceSMS: !!newSettings.startServiceSMS,
        endServiceSMS: !!newSettings.endServiceSMS,
        smsContent: newSettings.smsContent || '',
        homepageColorway: newSettings.homepageColorway || 'green',
        deviationMitigation: !!newSettings.deviationMitigation,
        deviationKm: newSettings.deviationKm ?? 1.0,
        deviationWaitSec: newSettings.deviationWaitSec ?? 30,
        onlineOrdersEnabled: !!newSettings.onlineOrdersEnabled,
        city: newSettings.city || '',
        isBanned: !!newSettings.isBanned,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(err => {
        console.error("Error syncing user settings update to Firestore:", err);
      });
    }
  };

  // --- 3. Page Router dispatcher ---
  const renderView = () => {
    // Check for forced upgrade lock triggered during slide online
    if (showUpgradeModal && mobileActiveTab === 'app') {
      return (
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0C15] via-[#07080F] to-[#030407] z-50 flex flex-col justify-between p-6 text-slate-300 font-sans animate-in fade-in duration-500 overflow-y-auto">
          {/* Cybernetic Grid/Background Glow Overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#14b8a6_1px,transparent_1px)] [background-size:16px_16px]"></div>
          
          {/* Header & Visual Content */}
          <div className="relative flex-1 flex flex-col items-center justify-center text-center space-y-7 pt-8 z-10">
            {/* Glowing Hologram-like Pulse Visual */}
            <div className="relative">
              {/* Outer pulsing neon ring */}
              <div className="absolute inset-0 rounded-full bg-teal-500/10 blur-xl animate-pulse"></div>
              {/* Spinning status perimeter lines */}
              <div className="absolute -inset-2 rounded-full border border-teal-500/20 border-dashed animate-spin" style={{ animationDuration: '20s' }}></div>
              <div className="absolute -inset-4 rounded-full border border-emerald-500/10 border-dashed animate-spin" style={{ animationDuration: '35s', animationDirection: 'reverse' }}></div>
              
              <div className="relative p-6 rounded-full bg-[#111322] border-2 border-teal-500/30 text-teal-400 shadow-2xl shadow-teal-950/50">
                <ShieldAlert className="w-10 h-10 animate-pulse text-teal-400" />
              </div>
            </div>

            {/* Title Section */}
            <div className="space-y-3.5 px-2">
              <h3 className="text-lg font-black tracking-tight text-white font-sans flex items-center justify-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-teal-500 animate-ping"></span>
                云端安全升级提示
              </h3>
              
              {/* Version pill */}
              <div className="inline-flex items-center gap-2 bg-[#121E24]/60 border border-teal-500/30 px-3.5 py-1.5 rounded-full shadow-lg shadow-teal-950/30">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-teal-300">
                  发现全新合规版本：{sysVersion}
                </span>
              </div>
            </div>

            {/* Futuristic Details Card */}
            <div className="bg-[#121422]/90 border border-slate-800/80 rounded-2xl p-5 max-w-sm space-y-4 shadow-2xl relative overflow-hidden backdrop-blur-md">
              {/* Cyber top glow line */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500/50 to-emerald-500/50"></div>
              
              <div className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed text-left font-sans">
                  您当前正处于安全离线状态。黑湾代驾安全防伪系统已全面更新。旧版本已停止向云端数据库通信授权，请即刻完成安全合规包的同步下载。
                </p>
                
                {/* Visual upgrade points */}
                <div className="space-y-2 pt-2 border-t border-slate-800/60 text-left text-[11px] text-slate-400 font-sans">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                    <span>高精里程计算模块自适应锁止</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                    <span>定位多点漂移冗余补偿修正</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                    <span>最新全系统VIP阻断安全协议下发</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Zone - Clean buttons with cyber themes (No white background at all) */}
          <div className="relative space-y-3.5 pb-4 shrink-0 max-w-sm mx-auto w-full z-10">
            {/* Action 1: High-glowing copy link */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(sysUpgradeUrl);
                triggerToast('📋 升级网址复制成功！请在手机浏览器中粘贴下载');
              }}
              className="w-full py-3.5 bg-gradient-to-r from-teal-600/90 to-emerald-600/90 hover:from-teal-500 hover:to-emerald-500 text-slate-900 font-black text-xs rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-teal-500/20"
            >
              <span>📋 复制全新版本升级网址</span>
            </button>

            {/* Action 2: Silent remain offline button */}
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="w-full py-3 bg-[#111322]/80 border border-slate-800 hover:bg-[#151829] text-slate-500 hover:text-slate-400 font-bold text-xs rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>✕ 暂不升级 (保持离线状态)</span>
            </button>
          </div>
        </div>
      );
    }

    if (mobileActiveTab === 'passenger' || passengerDriverPhone) {
      return (
        <PassengerOrderView 
          driverPhone={passengerDriverPhone || userPhone || '18609518888'}
          onUnlockAdmin={() => {
            setMobileActiveTab('admin');
            triggerToast('🔒 请正确核对并输入运营安全系统账号与安全密钥');
          }}
          onClose={() => {
            if (mobileActiveTab === 'passenger') {
              setMobileActiveTab('app');
            } else {
              // Remove ?driver=xxxxx query param and reset passenger state to access demo
              const newUrl = window.location.origin + window.location.pathname;
              window.history.replaceState({}, '', newUrl);
              setPassengerDriverPhone(null);
            }
          }}
        />
      );
    }

    if (!userPhone) {
      return (
        <LoginView
          onLoginSuccess={(phone) => {
            localStorage.setItem('dd_user_phone', phone);
            setUserPhone(phone);
            // Sync setting with dynamic driver name
            setSettings(prev => ({
              ...prev,
              customAppName: 'XX代驾'
            }));
            triggerToast('🎉 设备签署校验通过，欢迎重新登录回一键代驾系统！');
          }}
        />
      );
    }

    if (incomingOrder && currentView !== 'create_order') {
      return (
        <IncomingOrderOverlay
          order={incomingOrder}
          driverCoords={driverCoords}
          onlineBillingRules={onlineBillingRules}
          onAccept={handleAcceptIncomingOrder}
          onDecline={handleDeclineIncomingOrder}
        />
      );
    }

    switch (currentView) {
      case 'settings':
        return (
          <SettingsView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onClose={() => setCurrentView('home')}
            onNavigateToBilling={() => setCurrentView('mileage')}
            onLogout={handleLogout}
            systemVersion={sysVersion}
          />
        );

      case 'create_order':
        return (
          <CreateOrderView
            billingRules={billingRules}
            settings={settings}
            userPhone={userPhone}
            onStartTrip={handleStartTrip}
            onNavigateBack={() => {
              setActiveOnlineOrder(null);
              setCurrentView('home');
            }}
            driverCoords={driverCoords}
            activeOnlineOrder={activeOnlineOrder}
            onClearOnlineOrder={() => setActiveOnlineOrder(null)}
          />
        );

      case 'mileage':
        return (
          <MileageModeView
            billingRules={billingRules}
            onSave={(rules) => {
              setBillingRules(rules);
              // Sync template name directly on settings too for display match
              setSettings({ ...settings, billingTemplateName: rules.templateName });
            }}
            onNavigateBack={() => setCurrentView('settings')}
          />
        );

      case 'navigation':
        if (!currentTrip) return null;
        return (
          <ActiveTripView
            trip={currentTrip}
            settings={settings}
            billingRules={currentTrip.isOnlineOrder ? onlineBillingRules : billingRules}
            onUpdateTrip={handleUpdateTrip}
            onEndTrip={handleEndTrip}
          />
        );

      case 'cost':
        if (!currentTrip) return null;
        return (
          <TripCostView
            trip={currentTrip}
            onNavigateBack={() => {
              // Safe fallback back to navigation
              if (currentTrip) {
                setCurrentTrip({ ...currentTrip, currentStatus: 'serving' });
                setCurrentView('navigation');
              }
            }}
            onGoToCollection={handleGoToCollection}
          />
        );

      case 'payment_qr':
        if (!currentTrip) return null;
        return (
          <PaymentQRView
            trip={currentTrip}
            settings={settings}
            onNavigateBack={() => {
              // Roll back to fee adjustment page
              if (currentTrip) {
                setCurrentTrip({ ...currentTrip, currentStatus: 'ended' });
                setCurrentView('cost');
              }
            }}
            onFinishTrip={handleFinishTrip}
          />
        );

      case 'home':
      default:
        return (
          <HomeView
            settings={settings}
            stats={stats}
            currentTrip={currentTrip}
            billingRules={billingRules}
            onNavigate={setCurrentView}
            onStartTrip={handleStartTrip}
            onUpdateStats={setStats}
            onToggleOnline={handleToggleOnline}
            isOnline={isOnline}
            onUpdateSettings={handleUpdateSettings}
            userPhone={userPhone}
            userRole={userRole}
            userTeamCity={userTeamCity}
            onLogout={handleLogout}
            driverCoords={driverCoords}
            xianyuUrl={sysXianyuUrl}
          />
        );
    }
  };

  // Determine if we should render the clean single-screen view without any of the debug desktop workspace wrappers (header, watermark footer, etc.)
  const isMobileOrStandalone = () => {
    if (typeof window === 'undefined') return false;
    
    const params = new URLSearchParams(window.location.search);
    const hasPassengerOrDriver = params.has('driver') || params.get('passenger') === 'true';
    
    // 1. Native Capacitor packaged app
    if (!!(window as any).Capacitor || window.location.protocol === 'capacitor:' || window.location.protocol === 'file:') {
      return true;
    }
    
    // 2. Query parameters indicating standalone / native mode
    if (params.get('native') === 'true' || params.get('standalone') === 'true') {
      return true;
    }
    
    // 3. Under a mobile phone screen width OR mobile user agent (e.g. when passenger scans the QR code on their phone, or driver opens it on phone)
    if (window.innerWidth < 768) {
      return true;
    }
    
    // 4. If we are on the passenger self-service page, and it's loaded as a result of a QR scan, and not explicitly being debugged on wide screen
    if (hasPassengerOrDriver && window.innerWidth < 1024) {
      return true;
    }
    
    return false;
  };

  if (isMobileOrStandalone()) {
    return (
      <div className="h-screen w-screen bg-[#f8fafc] flex flex-col overflow-hidden text-[#333333]">
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {renderView()}
          
          {/* Floating toasts for nice user experience */}
          {showToast && (
            <div className="absolute top-16 left-4 right-4 bg-teal-600/95 border border-teal-400/20 text-white p-3 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-4 duration-300 flex items-start space-x-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle className="w-3.5 h-3.5 fill-current" />
              </div>
              <span className="text-xs font-semibold leading-relaxed tracking-wide font-sans">
                {toastMessage}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isStandaloneAdmin()) {
    return (
      <div className="h-screen w-screen bg-[#07080b] flex flex-col overflow-hidden text-slate-200 antialiased font-sans">
        <div className="flex-1 overflow-y-auto">
          <AdminPanel 
            userPhone={userPhone}
            userRole={userRole}
            userTeamCity={userTeamCity}
            isAdminAuthenticated={isAdminAuthenticated}
            setIsAdminAuthenticated={setIsAdminAuthenticated}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#07080b] flex flex-col items-center justify-start overflow-hidden text-slate-200 antialiased font-sans">
      
      {/* Top Professional Control Center Header Bar for real-time developers */}
      <div className="w-full bg-[#111625] border-b border-[#212b44] px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/10">
            <Database className="w-4 h-4 text-slate-900 font-bold" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-bold tracking-wide text-white">XX代驾 - 开发者智能调试工作台</h1>
            <p className="text-[9px] sm:text-[10px] text-gray-400">实时观察数据库变动 / 账号模拟 / 优惠券代码秒发</p>
          </div>
        </div>

        {/* View togglers for flexible debugging */}
        <div className="flex items-center bg-[#1b233a] rounded-full p-1 border border-gray-700/50 text-xs font-semibold shrink-0">
          <button
            onClick={() => setMobileActiveTab('app')}
            className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
              mobileActiveTab === 'app'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>手机端(司机)</span>
          </button>

          <button
            onClick={() => setMobileActiveTab('passenger')}
            className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
              mobileActiveTab === 'passenger'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>乘客自助端(代开单)</span>
          </button>

          <button
            onClick={() => setMobileActiveTab('wechat_mini')}
            className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
              mobileActiveTab === 'wechat_mini'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>微信小程序下单</span>
          </button>
          
          <button
            onClick={() => setMobileActiveTab('admin')}
            className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
              mobileActiveTab === 'admin'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>管理后台</span>
          </button>
        </div>
      </div>

      {/* Main split-screen or single workspace zone */}
      <div className="flex-1 w-full max-w-[1550px] mx-auto p-3 sm:p-5 flex flex-row items-stretch justify-center gap-6 overflow-hidden">
        
        {mobileActiveTab === 'wechat_mini' ? (
          <div className="flex-1 bg-[#111625]/90 border border-[#212b44] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
            <WeChatMiniSimulator 
              currentDriverPhone={userPhone}
              onTriggerToast={triggerToast}
            />
          </div>
        ) : (
          <>
            {/* Left pane: Smartphone simulator containing driver client app or passenger self booking view */}
            <div className={`flex flex-col items-center justify-center transition-all duration-300 shrink-0 ${
              mobileActiveTab === 'app' || mobileActiveTab === 'passenger' ? 'flex-1 max-w-[420px] w-full' : 'hidden lg:flex lg:w-[400px]'
            }`}>
              <div className="relative w-full h-full sm:h-[82vh] sm:max-h-[820px] sm:rounded-[40px] sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] sm:border-8 sm:border-[#1e293b] bg-[#f8fafc] flex flex-col overflow-hidden">
                <div className="flex-1 flex flex-col relative overflow-hidden text-[#333333]">
                  {renderView()}

                  {/* Top floating toasts */}
                  {showToast && (
                    <div className="absolute top-16 left-4 right-4 bg-teal-600/95 border border-teal-400/20 text-white p-3 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-4 duration-300 flex items-start space-x-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle className="w-3.5 h-3.5 fill-current" />
                      </div>
                      <span className="text-xs font-semibold leading-relaxed tracking-wide font-sans">
                        {toastMessage}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right pane / Center AdminPanel (Hidden if mobileActiveTab is app on mobile, but visible/scrollable as a secondary panel on lg: screens!) */}
            <div className={`transition-all duration-300 bg-[#111625]/90 border border-[#212b44] rounded-3xl overflow-hidden flex flex-col ${
              mobileActiveTab === 'admin' ? 'flex-1 w-full' : 'hidden lg:flex lg:flex-1'
            }`}>
              <div className="flex-1 overflow-y-auto">
                <AdminPanel 
                  userPhone={userPhone}
                  userRole={userRole}
                  userTeamCity={userTeamCity}
                  isAdminAuthenticated={isAdminAuthenticated}
                  setIsAdminAuthenticated={setIsAdminAuthenticated}
                />
              </div>
            </div>
          </>
        )}

      </div>

      {/* Persistent helper watermark for comfortable navigation */}
      <div className="w-full bg-[#0a0d17] py-2 px-4 text-center border-t border-[#121927] shrink-0 text-[10px] text-gray-500 flex justify-between items-center z-40">
        <span>XX代驾 © 2026 调试环境已对接云端（系统自动检测到 Firebase 联动机制健全）</span>
        <button 
          onClick={() => {
            setMobileActiveTab(
              mobileActiveTab === 'app' 
                ? 'passenger' 
                : mobileActiveTab === 'passenger' 
                ? 'wechat_mini' 
                : mobileActiveTab === 'wechat_mini' 
                ? 'admin' 
                : 'app'
            );
          }}
          className="text-teal-400 hover:text-teal-300 cursor-pointer lg:hidden font-medium"
        >
          {mobileActiveTab === 'app' ? '切换至乘客端 ➔' : mobileActiveTab === 'passenger' ? '切换至小程序 ➔' : mobileActiveTab === 'wechat_mini' ? '切换至后台 ➔' : '返回手机端 ➔'}
        </button>
        <span className="hidden lg:inline text-gray-400 font-mono text-[9px]">
          建议宽屏设备下并排操作：左侧模拟接单，右侧调试审核 ⚡
        </span>
      </div>

    </div>
  );
}
