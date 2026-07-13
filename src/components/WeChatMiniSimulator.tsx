import React, { useState, useEffect } from 'react';
import TencentMap from './TencentMap';
import { db, doc, setDoc } from '../lib/dbProxy';
import { 
  Phone, 
  MapPin, 
  Navigation, 
  Copy, 
  Check, 
  FileCode, 
  ArrowRight, 
  ShieldCheck, 
  Smartphone,
  CloudRain,
  Compass,
  AlertCircle,
  Plus,
  Minus,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  Map,
  Share2
} from 'lucide-react';

const YINCHUAN_POIS = [
  { name: '唐徕小学', address: '宁夏回族自治区银川市兴庆区唐徕小区内', lng: 106.2285, lat: 38.4842 },
  { name: '唐徕小区', address: '宁夏回族自治区银川市兴庆区唐徕路与新华西街交叉口', lng: 106.2275, lat: 38.4838 },
  { name: '大阅城', address: '宁夏回族自治区银川市金凤区正源北街建发大阅城', lng: 106.2205, lat: 38.5175 },
  { name: '（和平巷）颐和家园', address: '宁夏回族自治区银川市兴庆区和平巷颐和家园', lng: 106.230912, lat: 38.487193 },
  { name: '和枫颐景', address: '宁夏回族自治区银川市兴庆区和枫路与和平巷交叉口东 100 米', lng: 106.2312, lat: 38.4878 },
  { name: '鲜西域生鲜超市', address: '宁夏回族自治区银川市兴庆区和枫路与和平巷交叉口东 50 米', lng: 106.230112, lat: 38.487093 },
  { name: '二哥辣炒小公鸡', address: '宁夏回族自治区银川市兴庆区和枫路 104 号', lng: 106.231212, lat: 38.487393 },
  { name: '万家香鲜蔬果屋', address: '宁夏回族自治区银川市兴庆区和平巷 12 号', lng: 106.230712, lat: 38.486993 },
  { name: '银川市人民政府', address: '宁夏回族自治区银川市金凤区北京中路 166 号', lng: 106.2223, lat: 38.4908 },
  { name: '春晓园', address: '宁夏回族自治区银川市兴庆区中山北街 204 号', lng: 106.2305, lat: 38.4875 },
  { name: '瑞丰小酒楼 (湖滨东街店)', address: '兴庆区湖滨东街 139 号', lng: 106.2335, lat: 38.4845 },
  { name: '长相忆宾馆 (银川鼓楼玉皇阁店)', address: '兴庆区玉皇阁北街 120 号', lng: 106.2315, lat: 38.4825 },
  { name: '银川市第三人民医院', address: '玉皇阁北街 8 号', lng: 106.2285, lat: 38.4815 },
  { name: '建发大阅城', address: '金凤区正源北街与万寿路交汇处', lng: 106.2205, lat: 38.5175 },
  { name: '银川火车站', address: '金凤区上海西路', lng: 106.1805, lat: 38.4975 },
  { name: '新华百货(鼓楼店)', address: '兴庆区新华东街', lng: 106.2355, lat: 38.4815 },
  { name: '宁夏大学(本部)', address: '西夏区贺兰山西路 489 号', lng: 106.1405, lat: 38.5075 },
  { name: '万达广场写字楼A座', address: '金凤区正源北街22号', lng: 106.2225, lat: 38.4885 },
  { name: '金凤万达广场', address: '金凤区正源北街与上海路交汇处', lng: 106.2215, lat: 38.4895 },
  { name: '宁夏医科大学总医院', address: '兴庆区胜利街21号', lng: 106.2345, lat: 38.4485 },
  { name: '玉皇阁', address: '兴庆区解放东街与玉皇阁北街交叉口', lng: 106.2325, lat: 38.4835 },
  { name: '中山公园', address: '兴庆区公园街', lng: 106.2225, lat: 38.4855 }
];

const getSimulationPointOverride = (lng: number, lat: number) => {
  const overrides = [
    { name: '（和平巷）颐和家园', address: '宁夏回族自治区银川市兴庆区和平巷颐和家园', lng: 106.230912, lat: 38.487193 },
    { name: '和枫颐景', address: '宁夏回族自治区银川市兴庆区中山北街与和枫路交叉口东 100 米', lng: 106.2312, lat: 38.4878 },
    { name: '鲜西域生鲜超市', address: '宁夏回族自治区银川市兴庆区和枫路与和平巷交叉口东 50 米', lng: 106.230112, lat: 38.487093 },
    { name: '二哥辣炒小公鸡', address: '宁夏回族自治区银川市兴庆区和枫路 104 号', lng: 106.231212, lat: 38.487393 },
    { name: '万家香鲜蔬果屋', address: '宁夏回族自治区银川市兴庆区和平巷 12 号', lng: 106.230712, lat: 38.486993 },
    { name: '银川市人民政府', address: '宁夏回族自治区银川市金凤区北京中路 166 号', lng: 106.2223, lat: 38.4908 },
  ];
  for (const item of overrides) {
    const dist = getDistance(lng, lat, item.lng, item.lat);
    if (dist < 150) { // Within 150 meters, match exactly for simulation fidelity
      return item;
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

const getClosestLocalPoi = (lng: number, lat: number) => {
  let closest = YINCHUAN_POIS[0];
  let minDist = Infinity;
  for (const poi of YINCHUAN_POIS) {
    const dist = getDistance(lng, lat, poi.lng, poi.lat);
    if (dist < minDist) {
      minDist = dist;
      closest = poi;
    }
  }
  return closest;
};

const getHighPrecisionLocationName = (regeocode: any, fallbackAddress: string, centerLng?: number, centerLat?: number): string => {
  if (!regeocode) return fallbackAddress || '未知地点';
  
  const addressComponent = regeocode.addressComponent;
  const district = addressComponent ? (addressComponent.district || '') : '';
  const township = addressComponent ? (addressComponent.township || '') : '';
  
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
        return { lng: parseFloat(parts[0]), lat: parseFloat(parts[1] || '0') };
      }
    }
    return null;
  };

  const getPoiDistance = (poi: any, cLng?: number, cLat?: number): number => {
    if (poi.distance !== undefined && poi.distance !== null && poi.distance !== '') {
      const dist = Number(poi.distance);
      if (!isNaN(dist)) return dist;
    }
    if (cLng !== undefined && cLat !== undefined) {
      const loc = getPoiLngLat(poi);
      if (loc) {
        return getDistance(cLng, cLat, loc.lng, loc.lat);
      }
    }
    return 999999;
  };

  let poiName = '';
  if (regeocode.pois && regeocode.pois.length > 0) {
    const validPois = regeocode.pois.filter((poi: any) => {
      const name = (poi.name || '').trim();
      return name !== '银川' && name !== '银川市' && name !== '市辖区' && name !== '兴庆区' && name !== '金凤区' && name !== '西夏区';
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
    poiName = regeocode.aois[0].name;
  }

  if (poiName) {
    return poiName;
  }

  const cleanFormat = fallbackAddress
    .replace('宁夏回族自治区', '')
    .replace('银川市', '')
    .replace(district, '')
    .replace(township, '')
    .trim();

  return cleanFormat || fallbackAddress;
};

interface WeChatMiniSimulatorProps {
  currentDriverPhone: string | null;
  onTriggerToast: (msg: string) => void;
}

export default function WeChatMiniSimulator({ currentDriverPhone, onTriggerToast }: WeChatMiniSimulatorProps) {
  // Simulator Interactive States
  const [targetDriver, setTargetDriver] = useState(currentDriverPhone || '15509601222');
  const [passengerPhone, setPassengerPhone] = useState('13988889999');
  const [startPoint, setStartPoint] = useState('（和平巷）颐和家园');
  const [destination, setDestination] = useState('');
  const [isRainy, setIsRainy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'success' | 'profile' | 'about' | 'rules' | 'agreement' | 'select-start' | 'select-dest'>('idle');
  const [selectedLocationIndex, setSelectedLocationIndex] = useState<number>(0);
  const [selectedLocName, setSelectedLocName] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // WeChat Native address-form Plugin States
  const [addressReceiver, setAddressReceiver] = useState<string>('张伟');
  const [addressPhone, setAddressPhone] = useState<string>('13988889999');
  const [addressArea, setAddressArea] = useState<string>('宁夏回族自治区 银川市 兴庆区');
  const [addressLabel, setAddressLabel] = useState<string>('家');
  const [addressIsDefault, setAddressIsDefault] = useState<boolean>(false);
  const [showAreaPicker, setShowAreaPicker] = useState<boolean>(false);
  const [showMapSelector, setShowMapSelector] = useState<boolean>(false);
  const [aiInputText, setAiInputText] = useState<string>('');
  const [showAiInput, setShowAiInput] = useState<boolean>(false);

  // Tencent Map interactive states
  const [tencentMapCenter, setTencentMapCenter] = useState({ lat: 38.487193, lng: 106.230912 });
  const [tencentMapZoom, setTencentMapZoom] = useState(17);
  const [tencentPois, setTencentPois] = useState<any[]>([]);
  const [poisLoading, setPoisLoading] = useState(false);

  // Code Tab state: 'simulator' or 'code'
  const [activeTab, setActiveTab] = useState<'simulator' | 'code'>('simulator');
  const [codeFile, setCodeFile] = useState<'wxml' | 'wxss' | 'js' | 'json'>('wxml');
  const [copied, setCopied] = useState(false);

  // Sync target driver if the current driver phone changes
  useEffect(() => {
    if (currentDriverPhone) {
      setTargetDriver(currentDriverPhone);
    }
  }, [currentDriverPhone]);

  const fetchPoisForCoords = (lng: number, lat: number, isInitial = false) => {
    setPoisLoading(true);
    
    const handleResults = (centerName: string, centerAddress?: string) => {
      // Create first result which represents the exact geolocated/center address
      const firstResult = {
        name: centerName,
        address: centerAddress || centerName,
        distance: '0m',
        isCurrentLocation: isInitial,
        isCenter: !isInitial,
        lng,
        lat
      };

      // Generate 6 sub-POIs dynamically based on centerName to ensure extremely high fidelity simulation
      const cleanName = centerName.trim();
      const cleanAddress = (centerAddress || centerName).trim();
      
      const subPoiTemplates = [
        { suffix: ' (东门)', addrSuffix: '东侧出入口' },
        { suffix: ' (西门)', addrSuffix: '西侧出入口' },
        { suffix: ' (南门)', addrSuffix: '南侧正门' },
        { suffix: ' (北门)', addrSuffix: '北侧通道' },
        { suffix: ' (地下停车场)', addrSuffix: '地下车库入口' },
        { suffix: ' (停车场)', addrSuffix: '地面硬化停车场' },
        { suffix: ' (1号楼)', addrSuffix: '1号楼单元楼口' },
        { suffix: ' (2号楼)', addrSuffix: '2号楼底商门口' },
        { suffix: ' (A座)', addrSuffix: 'A座写字楼大堂' },
        { suffix: ' (B座)', addrSuffix: 'B座商务中心' },
        { suffix: ' (正门)', addrSuffix: '正门大堂入口' },
        { suffix: ' (公交站)', addrSuffix: '公交站台旁' },
        { suffix: '-生活便利店', addrSuffix: '底商便利超市' },
        { suffix: '-综合服务中心', addrSuffix: '社区物业服务大厅' },
      ];

      // Shuffle templates and take exactly 6
      const shuffledTemplates = [...subPoiTemplates].sort(() => 0.5 - Math.random());
      const selectedTemplates = shuffledTemplates.slice(0, 6);
      
      const generatedSubPois = selectedTemplates.map((template, idx) => {
        const dist = [18, 35, 62, 89, 124, 158][idx] || (20 + idx * 25);
        // Calculate coordinate offsets for visual completeness on the map if displayed
        const angle = (idx * 2 * Math.PI) / 6;
        const offsetLng = (dist / 111000) * Math.cos(angle);
        const offsetLat = (dist / 111000) * Math.sin(angle);
        
        return {
          name: `${cleanName}${template.suffix}`,
          address: `${cleanAddress}${template.addrSuffix}`,
          distance: `${dist}m`,
          rawDistance: dist,
          lng: lng + offsetLng,
          lat: lat + offsetLat
        };
      });

      // Combine: First result, then the 6 generated sub-POIs
      const finalPois = [firstResult, ...generatedSubPois];
      setTencentPois(finalPois);
      setSelectedLocationIndex(0);
      
      // Update selected start point to centerName immediately
      if (isInitial || orderStatus === 'select-start') {
        setStartPoint(centerName);
      } else if (orderStatus === 'select-dest') {
        setDestination(centerName);
      }
      setPoisLoading(false);
    };

    // Check custom simulation override first to bypass incorrect physical/IP geocoding in sandbox
    const simOverride = getSimulationPointOverride(lng, lat);
    if (simOverride) {
      handleResults(simOverride.name, simOverride.address);
      return;
    }

    const AMap = (window as any).AMap;
    if (AMap) {
      AMap.plugin('AMap.Geocoder', () => {
        try {
          const geocoder = new AMap.Geocoder({
            city: '银川市',
            extensions: 'all'
          });
          geocoder.getAddress([lng, lat], (status: string, result: any) => {
            if (status === 'complete' && result.regeocode) {
              const addressName = getHighPrecisionLocationName(
                result.regeocode, 
                result.regeocode.formattedAddress, 
                lng, 
                lat
              );
              let streetAddress = result.regeocode.formattedAddress || addressName;
              streetAddress = streetAddress.replace('宁夏回族自治区', '').replace('银川市', '').trim();
              handleResults(addressName, streetAddress);
            } else {
              const closestPoi = getClosestLocalPoi(lng, lat);
              handleResults(closestPoi.name, closestPoi.address);
            }
          });
        } catch (err) {
          console.warn("Error inside AMap Geocoder:", err);
          const closestPoi = getClosestLocalPoi(lng, lat);
          handleResults(closestPoi.name, closestPoi.address);
        }
      });
    } else {
      const closestPoi = getClosestLocalPoi(lng, lat);
      handleResults(closestPoi.name, closestPoi.address);
    }
  };

  const triggerWeChatGeolocate = () => {
    setPoisLoading(true);
    // For selecting departure (select-start), always center on the physical current location of the user (which is （和平巷）颐和家园)
    // For selecting destination (select-dest), we center on the destination if it exists, otherwise default to current location
    let defaultLng = 106.230912;
    let defaultLat = 38.487193;

    if (orderStatus === 'select-dest' && destination) {
      const knownPoi = YINCHUAN_POIS.find(poi => poi.name === destination);
      if (knownPoi) {
        defaultLng = knownPoi.lng;
        defaultLat = knownPoi.lat;
      }
    }

    setTencentMapCenter({ lat: defaultLat, lng: defaultLng });
    setTencentMapZoom(17);
    fetchPoisForCoords(defaultLng, defaultLat, true);
  };

  const getSearchLocations = () => {
    if (!searchKeyword.trim()) {
      return tencentPois;
    }
    
    const lowerKeyword = searchKeyword.toLowerCase();
    const seenNames = new Set<string>();
    const results: any[] = [];
    
    for (const poi of tencentPois) {
      if (poi.name.toLowerCase().includes(lowerKeyword) || poi.address.toLowerCase().includes(lowerKeyword)) {
        results.push(poi);
        seenNames.add(poi.name);
      }
    }
    
    for (const poi of YINCHUAN_POIS) {
      if (seenNames.has(poi.name)) continue;
      if (poi.name.toLowerCase().includes(lowerKeyword) || poi.address.toLowerCase().includes(lowerKeyword)) {
        const dist = getDistance(tencentMapCenter.lng, tencentMapCenter.lat, poi.lng, poi.lat);
        results.push({
          name: poi.name,
          address: poi.address,
          distance: dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`,
          rawDistance: dist,
          lng: poi.lng,
          lat: poi.lat
        });
        seenNames.add(poi.name);
      }
    }
    
    return results;
  };

  const handleWeChatImport = () => {
    setAddressReceiver('李华');
    setAddressPhone('18912345678');
    setAddressArea('宁夏回族自治区 银川市 金凤区');
    setSearchKeyword('大阅城');
    setSelectedLocName('大阅城');
    const known = YINCHUAN_POIS.find(p => p.name === '大阅城');
    if (known) {
      setTencentMapCenter({ lat: known.lat, lng: known.lng });
    }
    setAddressLabel('公司');
    setAddressIsDefault(true);
    onTriggerToast('已成功导入微信收货地址！');
  };

  const handleSmartParse = () => {
    if (!aiInputText.trim()) {
      onTriggerToast('请先输入或选择要解析的文本！');
      return;
    }
    
    const phoneRegex = /(1[3-9]\d{9})/;
    const phoneMatch = aiInputText.match(phoneRegex);
    const parsedPhone = phoneMatch ? phoneMatch[0] : '';
    
    const cleanText = aiInputText.replace(parsedPhone, '').trim();
    const segments = cleanText.split(/[,，\s\n]+/).map(s => s.trim()).filter(Boolean);
    
    let parsedName = '联系人';
    let parsedAddress = '';
    
    if (segments.length >= 2) {
      if (segments[0].length < segments[1].length) {
        parsedName = segments[0];
        parsedAddress = segments[1];
      } else {
        parsedName = segments[1];
        parsedAddress = segments[0];
      }
    } else if (segments.length === 1) {
      parsedAddress = segments[0];
    }
    
    if (parsedName) setAddressReceiver(parsedName);
    if (parsedPhone) setAddressPhone(parsedPhone);
    
    if (parsedAddress) {
      setSearchKeyword(parsedAddress);
      setSelectedLocName(parsedAddress);
      
      if (parsedAddress.includes('唐徕')) {
        setAddressArea('宁夏回族自治区 银川市 兴庆区');
      } else if (parsedAddress.includes('大阅城')) {
        setAddressArea('宁夏回族自治区 银川市 金凤区');
      }
      
      const matchedPoi = YINCHUAN_POIS.find(p => p.name.includes(parsedAddress) || parsedAddress.includes(p.name));
      if (matchedPoi) {
        setTencentMapCenter({ lat: matchedPoi.lat, lng: matchedPoi.lng });
      }
    }
    
    onTriggerToast('智能解析成功！已自动填充表单。');
  };

  // Trigger geolocation and POI fetching automatically when selecting departure or destination
  useEffect(() => {
    if (orderStatus === 'select-start' || orderStatus === 'select-dest') {
      triggerWeChatGeolocate();
    }
  }, [orderStatus]);

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    onTriggerToast('✓ 代码已成功复制到剪贴板！');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlaceOrder = async () => {
    if (!passengerPhone) {
      alert('请输入乘客手机号码，以便司机联系！');
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(passengerPhone.trim())) {
      alert('请核对并输入11位有效手机号码！');
      return;
    }
    if (!startPoint) {
      alert('请输入出发地点！');
      return;
    }
    if (!targetDriver) {
      alert('暂无可派单的司机，请登录司机端或指定一个司机手机号！');
      return;
    }

    setSubmitting(true);
    
    // Slight coordinates offset to place order near center
    const lat = 38.487193 + (Math.random() - 0.5) * 0.005;
    const lng = 106.230912 + (Math.random() - 0.5) * 0.005;

    try {
      // Setup passenger link model in firebase
      const docRef = doc(db, 'passenger_links', targetDriver.trim());
      await setDoc(docRef, {
        passengerPhone: passengerPhone.trim(),
        startLocation: startPoint.trim() + (isRainy ? ' (雨雪天加急)' : ''),
        destination: destination.trim() || '无需终点，听从分配',
        status: 'submitted',
        timestamp: Date.now(),
        passengerLat: lat,
        passengerLng: lng
      });

      setOrderStatus('success');
      onTriggerToast('🎉 微信小程序下单成功！司机端已同步发出强震动及播报语音！');
    } catch (err: any) {
      console.error('WeChat ordering proxy error:', err);
      // Fallback post
      try {
        const response = await fetch('https://daijiajifei.ccwu.cc/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driverPhone: targetDriver.trim(),
            passengerPhone: passengerPhone.trim(),
            startLocation: startPoint.trim() + (isRainy ? ' (雨雪天加急)' : ''),
            destination: destination.trim() || '无需终点，听从分配'
          })
        });
        const resData = await response.json();
        if (resData.success) {
          setOrderStatus('success');
          onTriggerToast('🎉 微信小程序下单成功 (Cloudflare 中继)！');
        } else {
          alert('下单通道响应异常，请核实后台配置。');
        }
      } catch (e: any) {
        alert('小程序连线提交失败: ' + e.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // WeChat Native Codes templates
  const wxmlCode = `<!-- index.wxml -->
<navigation-bar title="飞鸟代驾" back="{{false}}" color="#ffffff" background="#3B82F6"></navigation-bar>

<scroll-view class="container" scroll-y="true">
  <!-- 头部状态栏与胶囊导航由微信原生提供 -->
  
  <!-- 顶部 Banner -->
  <view class="banner-box">
    <view class="banner-content">
      <view class="logo-wrapper">
        <image class="logo-img" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC-5g4ojoRPa55Wl8YXIgPhJz1i0yEq3zrGa3pnbw94XfnOEqkiZwF5GrH9sodWcRTaCoPsyP-uJ78sCGzjI3PWc_2lvQaeY-yDbRr2wtuh-ohwcRR2mltqACFNJUKu__qYvUDDMayEKagIVtx_8m0jsjPuGfObhQiG2bdO2VtcELKSOm2NZAreW3tDWvZUNZFiet_ObScqBl3zvtUM0GflIaaHaA-FmgbiROy86gQ-5el7AHGpPhEgQQ" mode="aspectFill" />
        <text class="logo-title">黑湾酒后代驾</text>
      </view>
      <text class="banner-slogan">极速接驾 让出行更安心</text>
    </view>
  </view>

  <!-- 模拟下单卡片 -->
  <view class="order-card shadow-class">
    <!-- 附近司机数 -->
    <view class="status-header">
      <text class="driver-count">附近有 12 位司机候驾</text>
      <text class="base-price">起步价: 28元</text>
    </view>

    <!-- 地址选择区域 -->
    <view class="location-group">
      <!-- 乘客输入手机号 -->
      <view class="input-item border-bottom">
        <view class="dot dot-blue"></view>
        <input class="input-field" placeholder="请输入您的联系手机号" type="number" maxlength="11" bindinput="onInputPhone" value="{{passengerPhone}}" />
      </view>

      <!-- 出发地点 -->
      <view class="input-item border-bottom">
        <view class="dot dot-green"></view>
        <input class="input-field" placeholder="修改出发点" bindinput="onInputStart" value="{{startPoint}}" />
        <button class="locate-btn" bindtap="chooseLocation">地图定位</button>
      </view>

      <!-- 目的地 -->
      <view class="input-item">
        <view class="dot dot-red"></view>
        <input class="input-field" placeholder="输入代驾目的地 (选填)" bindinput="onInputDestination" value="{{destination}}" />
      </view>
    </view>

    <!-- 附加天气配置 -->
    <view class="options-area" bindtap="toggleRainWeather">
      <view class="option-icon-box {{isRainy ? 'option-active' : ''}}">
        <image class="option-icon" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC3qlNF0-oQybxBb1aQi-uvXG07BUVSaWUfq28B1oS1gSdmIz_y0YC_Ezk0KQaDPr3lOGD784PjZHxxuys8P9Jf7ThNw7FzrBk5G6Ge10g1IrI7LpccZthnv7uPqaiXEjaWnWUH1lWl_WMJWireu-aOsDmBE63MOysfacCGZ6tumaRxPutEyeIpD105lprJpfXLBMEaiTPuB16uHb-UwZpIPwz6AYQohkR-eTk72PyIBlch6y0a5VMCZQ" mode="aspectFill" />
        <text class="option-label">雨雪天气 {{isRainy ? '(加急)' : ''}}</text>
      </view>
    </view>
  </view>

  <!-- 立即下单主大按钮 -->
  <view class="btn-container">
    <button class="submit-btn" loading="{{submitting}}" disabled="{{submitting}}" bindtap="submitOrder">
      无需终点 立即下单
    </button>
  </view>

  <!-- 司机招募等 -->
  <view class="secondary-grid">
    <view class="recruit-card shadow-class">
      <view class="recruit-text">
        <text class="recruit-title">招募司机</text>
        <text class="recruit-desc">海量订单·多劳多得</text>
        <button class="join-btn">期待你的加入!</button>
      </view>
      <image class="recruit-img" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1UaTuiY0V-FR2lFLrMoA6sIiC6WqFYGJHxc4IH3p9PZ8dFm0tWKKL0Pyuo235CZglC5ZRy7lTZv3l8_33kiesqKC6fLp7jht-S5aOlkqHtdLygzsERGE_jYSaWAQU-C4sn8j1EAtqLgruvLFAMdJYNrAH4UcgvK9Q0Hek33BX1Nf7Kte0vTX2fEROJPD1xjMSehRTRRNWnbUlTpUije4iSLMUAm0Dtc8wqZcMvr2A1E5HIl91MsxS5Q" mode="aspectFill" />
    </view>
  </view>
</scroll-view>`;

  const wxssCode = `/* index.wxss */
page {
  background-color: #F8FAFC;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding-bottom: 50rpx;
}

.container {
  width: 100%;
  display: flex;
  flex-direction: column;
}

/* Banner 渐变样式 */
.banner-box {
  background: linear-gradient(180deg, #93C5FD 0%, #DBEAFE 100%);
  height: 350rpx;
  display: flex;
  align-items: center;
  padding: 0 40rpx;
  position: relative;
  overflow: hidden;
}

.banner-content {
  display: flex;
  flex-direction: column;
  z-index: 10;
}

.logo-wrapper {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 12rpx;
}

.logo-img {
  width: 110rpx;
  height: 110rpx;
  border-radius: 50%;
  background-color: #ffffff;
  margin-right: 20rpx;
  box-shadow: 0 4rpx 10rpx rgba(0,0,0,0.1);
}

.logo-title {
  font-size: 44rpx;
  font-weight: bold;
  color: #1E3A8A;
  letter-spacing: 2rpx;
}

.banner-slogan {
  font-size: 32rpx;
  font-weight: 800;
  color: #1E40AF;
  letter-spacing: 4rpx;
  margin-top: 10rpx;
}

/* 下单卡片样式 */
.order-card {
  background-color: #ffffff;
  border-radius: 40rpx;
  margin: -60rpx 30rpx 40rpx 30rpx;
  padding: 40rpx;
  position: relative;
  z-index: 20;
}

.shadow-class {
  box-shadow: 0 10rpx 40rpx rgba(0, 0, 0, 0.06);
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40rpx;
}

.driver-count {
  font-size: 26rpx;
  color: #64748B;
}

.base-price {
  font-size: 26rpx;
  font-weight: bold;
  color: #1E293B;
}

/* 输入框组 */
.location-group {
  display: flex;
  flex-direction: column;
}

.input-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 30rpx 0;
}

.border-bottom {
  border-bottom: 2rpx solid #F1F5F9;
}

.dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  margin-right: 30rpx;
  flex-shrink: 0;
}

.dot-blue { background-color: #3B82F6; }
.dot-green { background-color: #10B981; }
.dot-red { background-color: #EF4444; }

.input-field {
  flex: 1;
  font-size: 30rpx;
  color: #1E293B;
}

.locate-btn {
  font-size: 24rpx;
  background-color: #F8FAFC;
  color: #475569;
  border: 2rpx solid #E2E8F0;
  border-radius: 8rpx;
  padding: 8rpx 16rpx;
  margin-left: 10rpx;
  line-height: 1.5;
}

/* 天气选项 */
.options-area {
  display: flex;
  justify-content: center;
  margin-top: 30rpx;
  padding-top: 30rpx;
  border-top: 2rpx solid #F8FAFC;
}

.option-icon-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 30rpx;
  border-radius: 16rpx;
  background-color: #F8FAFC;
  transition: all 0.2s ease;
}

.option-active {
  background-color: #EFF6FF;
  border: 1rpx solid #BFDBFE;
}

.option-icon {
  width: 80rpx;
  height: 80rpx;
  margin-bottom: 10rpx;
  border-radius: 50%;
}

.option-label {
  font-size: 24rpx;
  color: #475569;
}

/* 下单按钮 */
.btn-container {
  padding: 0 40rpx;
  margin-bottom: 50rpx;
}

.submit-btn {
  background: linear-gradient(90deg, #60A5FA, #3B82F6);
  color: #ffffff;
  font-size: 36rpx;
  font-weight: bold;
  height: 100rpx;
  line-height: 100rpx;
  border-radius: 20rpx;
  box-shadow: 0 10rpx 30rpx rgba(59, 130, 246, 0.3);
  letter-spacing: 2rpx;
}

/* 招募模块 */
.secondary-grid {
  padding: 0 30rpx;
}

.recruit-card {
  background-color: #ffffff;
  border-radius: 30rpx;
  padding: 30rpx;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  overflow: hidden;
  height: 200rpx;
}

.recruit-text {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.recruit-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #1E293B;
}

.recruit-desc {
  font-size: 22rpx;
  color: #94A3B8;
}

.join-btn {
  background-color: #3B82F6;
  color: #ffffff;
  font-size: 20rpx;
  padding: 8rpx 20rpx;
  border-radius: 50rpx;
  margin-left: 0;
  margin-top: 10rpx;
  line-height: 1.5;
}

.recruit-img {
  width: 150rpx;
  height: 150rpx;
  align-self: flex-end;
}`;

  const jsCode = `// index.js
Page({
  data: {
    driverPhone: '${targetDriver}', // 当前指派绑定的司机手机号
    passengerPhone: '',
    startPoint: '兴庆区政府住宅区',
    destination: '',
    isRainy: false,
    submitting: false
  },

  onLoad: function (options) {
    // 若扫码URL携带特定司机手机号，可动态提取绑定
    if (options.driver) {
      this.setData({
        driverPhone: options.driver
      });
    }
  },

  onInputPhone: function (e) {
    this.setData({ passengerPhone: e.detail.value });
  },

  onInputStart: function (e) {
    this.setData({ startPoint: e.detail.value });
  },

  onInputDestination: function (e) {
    this.setData({ destination: e.detail.value });
  },

  toggleRainWeather: function() {
    this.setData({
      isRainy: !this.data.isRainy
    });
  },

  chooseLocation: function() {
    const that = this;
    wx.chooseLocation({
      success: function(res) {
        that.setData({
          startPoint: res.name
        });
      },
      fail: function() {
        wx.showToast({
          title: '定位失败，请手动输入',
          icon: 'none'
        });
      }
    });
  },

  // 核心：点击立即下单，上报数据触达司机端
  submitOrder: function () {
    const d = this.data;
    if (!d.passengerPhone) {
      wx.showModal({
        title: '提示',
        content: '请输入您的联系手机号，以便司机接单后联系！',
        showCancel: false
      });
      return;
    }

    if (!/^1[3-9]\\d{9}$/.test(d.passengerPhone.trim())) {
      wx.showModal({
        title: '格式错误',
        content: '请输入11位有效的中国手机号码！',
        showCancel: false
      });
      return;
    }

    this.setData({ submitting: true });

    // 微信小程序直接向云端或 Cloudflare 中继网关发起 REST POST 下单
    wx.request({
      url: 'https://daijiajifei.ccwu.cc/api/submit',
      method: 'POST',
      header: {
        'content-type': 'application/json'
      },
      data: {
        driverPhone: d.driverPhone,
        passengerPhone: d.passengerPhone,
        startLocation: d.startPoint + (d.isRainy ? ' (雨雪天加急)' : ''),
        destination: d.destination || '无需终点，听从分配'
      },
      success: (res) => {
        if (res.data && res.data.success) {
          wx.showModal({
            title: '下单成功',
            content: '已成功通知黑湾代驾司机：' + d.driverPhone + '！司机端正在震动振铃播报，请在原地稍候。',
            showCancel: false,
            success: () => {
              // 微信内通常可重置表单或进入行程等待页
            }
          });
        } else {
          wx.showToast({
            title: '中继返回异常，请联系客服',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        wx.showModal({
          title: '连接超时',
          content: '上报数据异常，请确保设备联网或检查 Cloudflare 节点！',
          showCancel: false
        });
      },
      complete: () => {
        this.setData({ submitting: false });
      }
    });
  }
});`;

  const jsonCode = `{
  "navigationBarTitleText": "飞鸟代驾-乘客自助端",
  "navigationBarBackgroundColor": "#3B82F6",
  "navigationBarTextStyle": "white",
  "usingComponents": {}
}`;

  return (
    <div className="w-full flex flex-col h-full bg-[#0a0d17] animate-in fade-in duration-300">
      
      {/* Simulation Selector Bar */}
      <div className="flex items-center justify-between bg-[#111625] px-4 py-2.5 border-b border-[#212b44] shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-black text-slate-100 font-sans">
            微信小程序开发与联调中心
          </span>
        </div>
        
        {/* Toggle Mode button */}
        <div className="flex space-x-1.5 bg-[#1b233a] rounded-lg p-0.5 border border-slate-700/40 text-[10px] font-bold">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              activeTab === 'simulator' 
                ? 'bg-amber-500 text-slate-950 font-black' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📱 小程序交互模拟
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              activeTab === 'code' 
                ? 'bg-amber-500 text-slate-950 font-black' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            💻 微信原生开发代码
          </button>
        </div>
      </div>

      {activeTab === 'simulator' ? (
        <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto p-4 space-y-4">
          
          {/* Device Frame */}
          <div className="relative w-full max-w-[340px] aspect-[9/18.5] bg-white rounded-[32px] shadow-2xl border-[6px] border-[#222] overflow-hidden flex flex-col text-left">
            
            {/* Phone Top Notch Bar */}
            <div className="w-full h-5 bg-white flex justify-between items-center px-4 pt-1 select-none text-[10px] text-slate-900 font-bold font-sans">
              <span>17:40</span>
              <div className="w-16 h-3 bg-black rounded-full shrink-0 -mt-1"></div>
              <div className="flex items-center space-x-1 font-mono text-[9px]">
                <span>5G</span>
                <div className="w-4 h-2 border border-slate-900 rounded-sm p-px flex items-center"><div className="w-2.5 h-full bg-slate-900 rounded-xs"></div></div>
              </div>
            </div>

            {/* WeChat Header Bar with Capsule Menu button */}
            {orderStatus === 'select-start' || orderStatus === 'select-dest' ? null : orderStatus === 'profile' || orderStatus === 'about' || orderStatus === 'rules' || orderStatus === 'agreement' ? (
              <header className="w-full bg-white px-3 py-1.5 flex items-center justify-between sticky top-0 z-50 border-b border-slate-100 select-none">
                <button 
                  onClick={() => {
                    if (orderStatus === 'rules') {
                      setOrderStatus('profile');
                    } else if (orderStatus === 'about') {
                      setOrderStatus('profile');
                    } else if (orderStatus === 'agreement') {
                      setOrderStatus('profile');
                    } else {
                      setOrderStatus('idle');
                    }
                  }}
                  className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                  aria-label="返回"
                >
                  <svg className="w-5 h-5 text-slate-700 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path>
                  </svg>
                </button>
                <h1 className="text-sm font-bold absolute left-1/2 -translate-x-1/2 text-slate-800">
                  {orderStatus === 'rules' ? '计价规则' : orderStatus === 'about' ? '关于我们' : orderStatus === 'agreement' ? '代驾协议' : '个人中心'}
                </h1>
                
                {/* WeChat standard Capsule button */}
                <div className="flex items-center bg-white border border-gray-150 rounded-full px-2 py-0.5 space-x-2 shadow-xs">
                  <div className="flex space-x-0.5">
                    <div className="w-1 h-1 bg-black rounded-full"></div>
                    <div className="w-1 h-1 bg-black rounded-full"></div>
                    <div className="w-1 h-1 bg-black rounded-full"></div>
                  </div>
                  <div className="w-[1px] h-2.5 bg-gray-200"></div>
                  <div className="w-2.5 h-2.5 border border-black rounded-full p-px flex items-center justify-center">
                    <div className="w-0.5 h-0.5 bg-black rounded-full"></div>
                  </div>
                </div>
              </header>
            ) : (
              <header className="w-full bg-white px-3.5 py-2 flex items-center justify-between sticky top-0 z-50 border-b border-slate-100 select-none relative">
                <div className="flex items-center space-x-1.5">
                </div>
                <h1 className="text-xs font-black text-gray-850 absolute left-1/2 -translate-x-1/2">黑湾代驾</h1>

                {/* WeChat standard Capsule button */}
                <div className="flex items-center bg-white border border-gray-150 rounded-full px-2.5 py-1 space-x-2.5 shadow-xs">
                  <div className="flex space-x-0.5">
                    <div className="w-1 h-1 bg-black rounded-full"></div>
                    <div className="w-1 h-1 bg-black rounded-full"></div>
                    <div className="w-1 h-1 bg-black rounded-full"></div>
                  </div>
                  <div className="w-[1px] h-3 bg-gray-200"></div>
                  <div className="w-3 h-3 border border-black rounded-full p-px flex items-center justify-center">
                    <div className="w-1 h-1 bg-black rounded-full"></div>
                  </div>
                </div>
              </header>
            )}

            {/* Mini-Program Scroll Canvas */}
            <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col relative text-slate-800 font-sans">
              {orderStatus === 'idle' ? (
                <>
                  {/* Banner Area - Redesigned with premium aesthetics */}
                  <section className="bg-slate-900 w-full h-40 flex items-center justify-between px-5 relative overflow-hidden shrink-0 select-none">
                    {/* Background glows & grids */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black" />
                    
                    {/* Floating ambient glow spheres */}
                    <div className="absolute -left-10 -top-10 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl" />
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-amber-500/10 rounded-full blur-xl" />

                    {/* Main content layout */}
                    <div className="z-10 flex flex-col space-y-1.5 max-w-[75%] text-left">
                      {/* Premium Badge & Brand Label */}
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-amber-400/10 text-amber-400 text-[8px] font-black tracking-widest rounded uppercase border border-amber-400/20">ALLIANCE</span>
                        <span className="text-xs font-black text-white/95 tracking-wider">黑湾代驾</span>
                      </div>
                      
                      {/* Catchy Slogan / Question */}
                      <p className="text-[10px] text-slate-300 font-medium leading-normal">
                        您是否遇到恶劣天气无司机接单？
                      </p>
                      
                      {/* Trust guarantee subtext */}
                      <p className="text-[9.5px] text-amber-300 font-bold leading-normal flex items-start gap-1">
                        <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse shrink-0 mt-1" />
                        <span>一键下单，为您全城极速匹配司机师傅</span>
                      </p>
                    </div>

                    {/* Right side: Interactive Avatar Button */}
                    <div className="z-10 flex flex-col items-center gap-1 shrink-0">
                      <div 
                        onClick={() => setOrderStatus('profile')}
                        className="relative w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center p-0.5 shadow-xl border border-white/10 cursor-pointer group active:scale-95 hover:scale-105 transition-all"
                      >
                        <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 relative z-10 border border-slate-950 flex items-center justify-center">
                          <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                              <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#1e293b" />
                                <stop offset="100%" stopColor="#0f172a" />
                              </linearGradient>
                              <linearGradient id="capGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#fbbf24" />
                                <stop offset="100%" stopColor="#d97706" />
                              </linearGradient>
                              <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#ffedd5" />
                                <stop offset="100%" stopColor="#fed7aa" />
                              </linearGradient>
                            </defs>
                            
                            {/* Circle Background */}
                            <circle cx="50" cy="50" r="48" fill="url(#avatarGrad)" />
                            <circle cx="50" cy="50" r="46" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeOpacity="0.4" />
                            
                            {/* Driver's Suit Body */}
                            <path d="M25,85 C25,70 35,65 50,65 C65,65 75,70 75,85" fill="#1e3a8a" />
                            <path d="M42,65 L50,78 L58,65" fill="#f8fafc" />
                            <path d="M48,72 L52,72 L50,85 Z" fill="#0f172a" />

                            {/* Driver's Head / Ears */}
                            <circle cx="34" cy="52" r="5" fill="url(#skinGrad)" />
                            <circle cx="66" cy="52" r="5" fill="url(#skinGrad)" />
                            <circle cx="50" cy="50" r="16" fill="url(#skinGrad)" />

                            {/* Eyes */}
                            <path d="M42,48 C43,46 46,46 47,48" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none" />
                            <path d="M53,48 C54,46 57,46 58,48" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none" />
                            
                            {/* Cheeks */}
                            <circle cx="38" cy="54" r="2.5" fill="#f43f5e" fillOpacity="0.4" />
                            <circle cx="62" cy="54" r="2.5" fill="#f43f5e" fillOpacity="0.4" />

                            {/* Friendly Smile */}
                            <path d="M45,54 Q50,59 55,54" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none" />

                            {/* Chauffeur's Cap */}
                            <path d="M30,38 C35,32 65,32 70,38 C72,40 70,42 66,42 C56,43 44,43 34,42 C30,42 28,40 30,38 Z" fill="#0f172a" />
                            <path d="M32,36 C32,24 68,24 68,36" fill="url(#capGrad)" />
                            <path d="M32,34 L68,34 L67,38 L33,38 Z" fill="#0f172a" />
                            {/* Golden Cap Badge */}
                            <path d="M50,28 L52,32 L56,32 L53,35 L54,39 L50,37 L46,39 L47,35 L44,32 L48,32 Z" fill="#fbbf24" />
                          </svg>
                        </div>
                      </div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">个人中心</span>
                    </div>
                  </section>

                  {/* Order card content - offset upwards */}
                  <section className="px-3 -mt-6 relative z-20 space-y-3">
                    <div className="bg-white rounded-2xl p-4 shadow-md flex flex-col border border-slate-100">
                      
                      {/* Driver nearby indicator */}
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] text-slate-500 font-bold">附近有 12 位司机候驾</span>
                        <div className="flex items-center text-[10px] font-black text-slate-900">
                          <span>起步价: 28元</span>
                          <ArrowRight className="w-3 h-3 text-slate-400 ml-0.5" />
                        </div>
                      </div>

                      {/* Location input forms */}
                      <div className="space-y-3">

                        {/* Start point input */}
                        <div className="flex flex-col space-y-1">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">📍 出发地点</span>
                          <div 
                            onClick={() => {
                              setSelectedLocationIndex(0);
                              setSelectedLocName(startPoint);
                              setSearchKeyword('');
                              setOrderStatus('select-start');
                            }}
                            className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 flex items-center justify-between hover:bg-slate-100/50 active:scale-[0.99] transition-all cursor-pointer"
                          >
                            <div className="flex items-center flex-1 min-w-0">
                              <MapPin className="w-3.5 h-3.5 text-emerald-500 mr-2 shrink-0" />
                              <span className={`text-xs font-bold truncate ${startPoint ? 'text-slate-850' : 'text-slate-400'}`}>
                                {startPoint || "选择出发地点"}
                              </span>
                            </div>
                            <span className="text-[9px] px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded shrink-0 font-extrabold shadow-2xs">修改</span>
                          </div>
                        </div>

                        {/* Destination input */}
                        <div className="flex flex-col space-y-1">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">🏁 目的地 (选填)</span>
                          <div 
                            onClick={() => {
                              setSelectedLocationIndex(0);
                              setSelectedLocName(destination);
                              setSearchKeyword('');
                              setOrderStatus('select-dest');
                            }}
                            className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 flex items-center justify-between hover:bg-slate-100/50 active:scale-[0.99] transition-all cursor-pointer"
                          >
                            <div className="flex items-center flex-1 min-w-0">
                              <Navigation className="w-3.5 h-3.5 text-rose-500 mr-2 shrink-0" />
                              <span className={`text-xs font-bold truncate ${destination ? 'text-slate-850' : 'text-slate-400'}`}>
                                {destination || "输入代驾目的地"}
                              </span>
                            </div>
                            <span className="text-[9px] px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded shrink-0 font-extrabold shadow-2xs">选择</span>
                          </div>
                        </div>

                      </div>

                      {/* Rainy Snow option */}
                      <button
                        type="button"
                        onClick={() => setIsRainy(!isRainy)}
                        className={`mt-4 py-2 px-3 border rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          isRainy 
                            ? 'bg-blue-50/80 border-blue-200 text-blue-600 font-black' 
                            : 'bg-slate-50 border-slate-100 text-slate-500'
                        }`}
                      >
                        <CloudRain className={`w-4 h-4 ${isRainy ? 'text-blue-500 animate-bounce' : 'text-slate-400'}`} />
                        <span className="text-xs">
                          {isRainy ? '☔ 雨雪天加急服务已激活' : '❄ 雨雪天气 (一键加急)'}
                        </span>
                      </button>

                    </div>

                    {/* Order Button */}
                    <button
                      onClick={handlePlaceOrder}
                      disabled={submitting}
                      className="w-full bg-gradient-to-r from-blue-400 to-blue-600 text-white py-3 rounded-xl font-extrabold text-sm shadow-md shadow-blue-300/30 tracking-wider text-center active:scale-[0.98] transition-all cursor-pointer"
                    >
                      {submitting ? '⏳ 正在提交至司机台...' : '无需终点 立即下单'}
                    </button>

                    {/* Promos cards mimicking WeChat Mini-program grids */}
                    <div className="grid grid-cols-2 gap-2 pb-5">
                      <div className="bg-white rounded-xl p-3 shadow-xs border border-slate-100 flex flex-col justify-between h-24 relative overflow-hidden">
                        <span className="text-[10px] font-black text-slate-800 leading-tight">极速接驾体验</span>
                        <span className="text-[8px] text-slate-400">一键代叫，闪电触达</span>
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center self-end mt-1 overflow-hidden">
                          <img 
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBvx-gaCL2Ncg-oi3pmRs2Xt86iHDN6c_D4mZ8bTa4LoWw-tlat9aWoGsAnR6RpTxcqm0H2zZ5KvDXxG8nEbfOelz3FIROOJrAg2_cL416zI4Sdx7O6GheuzY8dQc_UzRtUmjzYIRC16DoFWIL04BbxAZMkcoHE4bIa_NDkw3t32jUhtQ-_WqovL8R1PvyLRVHffm6o7lHP6F1y2LX0KVJRbwiB0x6yCk3nETT-oKM6HtLeKMcLdnZiMA" 
                            alt="Driver" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-3 shadow-xs border border-slate-100 flex flex-col justify-between h-24 relative overflow-hidden">
                        <div>
                          <span className="text-[10px] font-black text-slate-800 block">招募司机</span>
                          <span className="text-[8px] text-slate-400">海量订单·多劳多得</span>
                        </div>
                        <button className="bg-blue-500 text-white text-[8px] font-bold px-2 py-1 rounded-full w-max cursor-pointer">期待加入</button>
                        <div className="absolute right-1 bottom-1 w-10 h-10 overflow-hidden opacity-80">
                          <img 
                            alt="driver" 
                            className="w-full h-auto object-cover" 
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1UaTuiY0V-FR2lFLrMoA6sIiC6WqFYGJHxc4IH3p9PZ8dFm0tWKKL0Pyuo235CZglC5ZRy7lTZv3l8_33kiesqKC6fLp7jht-S5aOlkqHtdLygzsERGE_jYSaWAQU-C4sn8j1EAtqLgruvLFAMdJYNrAH4UcgvK9Q0Hek33BX1Nf7Kte0vTX2fEROJPD1xjMSehRTRRNWnbUlTpUije4iSLMUAm0Dtc8wqZcMvr2A1E5HIl91MsxS5Q"
                          />
                        </div>
                      </div>
                    </div>

                  </section>
                </>
              ) : orderStatus === 'select-start' || orderStatus === 'select-dest' ? (
                <div className="flex-1 flex flex-col bg-slate-50 text-slate-800 select-none overflow-hidden h-full absolute inset-0 z-50 animate-in fade-in slide-in-from-bottom duration-250">
                  {/* WeChat Native Plugin Top Bar */}
                  <header className="bg-white border-b border-slate-100 shrink-0 select-none px-3 py-2.5 flex items-center justify-between">
                    <button 
                      onClick={() => {
                        setOrderStatus('idle');
                        setSearchKeyword('');
                      }}
                      className="p-1 hover:bg-slate-100 rounded-full transition-colors active:opacity-70 text-slate-600"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-700 stroke-[2.5]" />
                    </button>
                    <h1 className="text-xs font-black text-slate-800">
                      {orderStatus === 'select-start' ? '编辑出发地址' : '编辑目的地'}
                    </h1>
                    <div className="w-6"></div> {/* spacer to balance back button */}
                  </header>

                  {/* Plugin Branding & WeChat Quick Import Header */}
                  <div className="bg-slate-100/50 px-3 py-2 shrink-0 flex items-center justify-between border-b border-slate-100">
                    <span className="text-[9px] font-black text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full">
                      <Compass className="w-2.5 h-2.5" /> 地图地址输入服务
                    </span>
                    <button 
                      onClick={handleWeChatImport}
                      className="bg-emerald-50 hover:bg-emerald-100/80 text-emerald-600 border border-emerald-100 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 active:scale-95 transition-all"
                    >
                      <Share2 className="w-2.5 h-2.5" /> 微信一键导入
                    </button>
                  </div>

                  {/* Main Form Fields Container */}
                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 pb-6">
                    
                    {/* Collapsible AI Text Parser */}
                    <div className="bg-white rounded-xl border border-slate-100 p-2.5 shadow-xs">
                      <button 
                        onClick={() => setShowAiInput(!showAiInput)}
                        className="flex items-center justify-between w-full text-left text-[10px] font-black text-slate-600 hover:text-blue-600 transition-colors"
                      >
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-blue-500" /> 智能快速填写 (粘贴整段地址解析)
                        </span>
                        <span className="text-[8px] font-bold text-blue-600 bg-blue-50/50 px-1.5 py-0.5 rounded">
                          {showAiInput ? '收起' : '展开'}
                        </span>
                      </button>
                      {showAiInput && (
                        <div className="mt-2 space-y-2 bg-slate-50/40 p-2 rounded-lg border border-slate-100 animate-in fade-in slide-in-from-top duration-200">
                          <textarea
                            value={aiInputText}
                            onChange={(e) => setAiInputText(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-[9.5px] font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                            rows={2}
                            placeholder="示例：张三，13812345678，银川市兴庆区唐徕小区"
                          />
                          <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <div className="flex gap-1">
                              <button 
                                onClick={() => setAiInputText('张小华，13811112222，唐徕小学')}
                                className="text-[8px] font-black text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-50"
                              >
                                填入唐徕小学例
                              </button>
                              <button 
                                onClick={() => setAiInputText('王大帅，15922223333，大阅城')}
                                className="text-[8px] font-black text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-50"
                              >
                                填入大阅城例
                              </button>
                            </div>
                            <button
                              onClick={handleSmartParse}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full active:scale-95 transition-all"
                            >
                              解析填充
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Standard Contact Form Fields Card */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-3 shadow-xs space-y-2.5">
                      
                      {/* 联系人 Field */}
                      <div className="flex items-center justify-between py-1 border-b border-slate-50">
                        <span className="text-[11px] font-black text-slate-500 w-16">联系人</span>
                        <input 
                          type="text"
                          value={addressReceiver}
                          onChange={(e) => setAddressReceiver(e.target.value)}
                          className="flex-1 bg-transparent border-none text-[11px] font-bold text-slate-800 placeholder:text-slate-300 outline-none p-0"
                          placeholder="您的姓名/称呼"
                        />
                      </div>

                      {/* 手机号码 Field */}
                      <div className="flex items-center justify-between py-1 border-b border-slate-50">
                        <span className="text-[11px] font-black text-slate-500 w-16">手机号码</span>
                        <input 
                          type="tel"
                          value={addressPhone}
                          onChange={(e) => setAddressPhone(e.target.value)}
                          maxLength={11}
                          className="flex-1 bg-transparent border-none text-[11px] font-bold text-slate-800 placeholder:text-slate-300 outline-none p-0"
                          placeholder="11位手机号码"
                        />
                      </div>

                      {/* 所在地区 Field */}
                      <div className="flex items-center justify-between py-1 border-b border-slate-50">
                        <span className="text-[11px] font-black text-slate-500 w-16">所在地区</span>
                        <button 
                          onClick={() => setShowAreaPicker(true)}
                          className="flex-1 text-left flex items-center justify-between text-[11px] font-bold text-slate-800 p-0"
                        >
                          <span className="truncate">{addressArea}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </button>
                      </div>

                      {/* 详细地址 Input with Autocomplete Suggestions */}
                      <div className="flex items-start justify-between py-1 border-b border-slate-50 gap-2">
                        <span className="text-[11px] font-black text-slate-500 w-16 pt-1">详细地址</span>
                        <div className="flex-1 flex flex-col relative">
                          <div className="flex items-center gap-1 bg-slate-50 rounded-xl px-2.5 py-1">
                            <input 
                              type="text"
                              value={searchKeyword}
                              onChange={(e) => {
                                setSearchKeyword(e.target.value);
                                setSelectedLocationIndex(0);
                                setSelectedLocName(e.target.value);
                              }}
                              className="flex-1 bg-transparent border-none text-[11px] font-bold text-slate-800 placeholder:text-slate-400 outline-none p-0"
                              placeholder="输入地名，如唐、大..."
                            />
                            {searchKeyword && (
                              <button 
                                onClick={() => {
                                  setSearchKeyword('');
                                  setSelectedLocName('');
                                }}
                                className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 active:scale-95 shrink-0"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Instant Autocomplete Suggestions List */}
                          {searchKeyword.trim() && (
                            <div className="absolute top-[32px] left-0 right-0 max-h-40 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-y-auto mt-1 divide-y divide-slate-50 animate-in fade-in duration-150">
                              {(() => {
                                const filtered = getSearchLocations();
                                return filtered.length > 0 ? (
                                  filtered.map((loc, idx) => {
                                    const isSelected = selectedLocName === loc.name;
                                    return (
                                      <div
                                        key={idx}
                                        onClick={() => {
                                          setSelectedLocName(loc.name);
                                          setSearchKeyword(loc.name);
                                          setSelectedLocationIndex(idx);
                                          if (loc.lng && loc.lat) {
                                            setTencentMapCenter({ lat: loc.lat, lng: loc.lng });
                                          }
                                        }}
                                        className={`p-2 hover:bg-blue-50/40 cursor-pointer flex flex-col text-left transition-colors ${isSelected ? 'bg-blue-50/60' : ''}`}
                                      >
                                        <span className="text-[10px] font-black text-slate-800 truncate">{loc.name}</span>
                                        <span className="text-[8px] text-slate-400 truncate mt-0.5">{loc.address}</span>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="p-3 text-center text-slate-400 text-[9px] font-bold">
                                    暂无联想地址
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                        
                        {/* Inline Tencent Map Trigger */}
                        <button 
                          onClick={() => setShowMapSelector(!showMapSelector)}
                          className={`p-1.5 rounded-xl border flex items-center gap-1 transition-all text-[9px] font-extrabold shrink-0 ${
                            showMapSelector 
                              ? 'bg-blue-50 border-blue-200 text-blue-600 scale-105' 
                              : 'border-slate-100 hover:bg-slate-50 text-slate-500'
                          }`}
                        >
                          <Map className="w-3.5 h-3.5" />
                          <span>地图选点</span>
                        </button>
                      </div>

                      {/* WeChat Style Inline Tencent Map Selector */}
                      {showMapSelector && (
                        <div className="bg-slate-50 rounded-xl border border-slate-150 p-2 space-y-2 animate-in fade-in slide-in-from-top duration-200">
                          <div className="h-44 rounded-lg overflow-hidden relative border border-slate-200">
                            <TencentMap 
                              apiKey="5N4BZ-YFOCT-BWJXC-L7O2O-ATI6K-UYFZW" 
                              center={tencentMapCenter}
                              zoom={tencentMapZoom}
                              onDragEnd={(coords) => {
                                setTencentMapCenter(coords);
                                fetchPoisForCoords(coords.lng, coords.lat);
                              }}
                              onZoomChange={(newZoom) => {
                                setTencentMapZoom(newZoom);
                              }}
                            />
                            {/* Central Pin */}
                            <div className="absolute inset-0 flex justify-center items-center pointer-events-none z-20">
                              <div className="relative flex flex-col items-center -mt-5">
                                <div className="bg-blue-600 p-1.5 rounded-full shadow-lg border-2 border-white animate-bounce">
                                  <MapPin className="w-3.5 h-3.5 text-white" />
                                </div>
                                <div className="w-2.5 h-1 bg-black/20 rounded-full blur-[2px] mt-0.5"></div>
                              </div>
                            </div>
                            {/* Map Floating Controls */}
                            <div className="absolute bottom-2 right-2 z-30 flex flex-col items-center gap-1">
                              <div className="flex flex-col bg-white rounded-md shadow border border-slate-200 overflow-hidden shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setTencentMapZoom(prev => Math.min(20, prev + 1))}
                                  className="p-1 hover:bg-slate-50 active:bg-slate-100 transition-colors border-b border-slate-150 flex items-center justify-center"
                                >
                                  <Plus className="w-3 h-3 text-slate-700" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTencentMapZoom(prev => Math.max(3, prev - 1))}
                                  className="p-1 hover:bg-slate-50 active:bg-slate-100 transition-colors flex items-center justify-center"
                                >
                                  <Minus className="w-3 h-3 text-slate-700" />
                                </button>
                              </div>
                              <button 
                                onClick={triggerWeChatGeolocate}
                                className="bg-white p-1.5 rounded-md shadow border border-slate-200 hover:bg-slate-50 active:scale-90 transition-all shrink-0 flex items-center justify-center"
                              >
                                <Compass className="w-3.5 h-3.5 text-blue-600" />
                              </button>
                            </div>
                          </div>

                          {/* Nearby list under the map */}
                          <div className="max-h-36 overflow-y-auto space-y-1 relative pr-1">
                            {poisLoading && (
                              <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center space-y-1">
                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-[8px] text-slate-400 font-bold">获取周边位置中...</span>
                              </div>
                            )}
                            {tencentPois.map((loc, idx) => {
                              const isSelected = selectedLocName === loc.name;
                              return (
                                <div 
                                  key={idx}
                                  onClick={() => {
                                    setSelectedLocationIndex(idx);
                                    setSelectedLocName(loc.name);
                                    setSearchKeyword(loc.name);
                                    if (loc.lng && loc.lat) {
                                      setTencentMapCenter({ lat: loc.lat, lng: loc.lng });
                                    }
                                  }}
                                  className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                                    isSelected 
                                      ? 'bg-blue-50/50 border-blue-200' 
                                      : 'border-slate-50 hover:bg-slate-50'
                                  }`}
                                >
                                  <div className="flex flex-col text-left max-w-[85%]">
                                    <span className="text-[10px] font-black text-slate-800 truncate">{loc.name}</span>
                                    <span className="text-[8px] text-slate-400 truncate mt-0.5">{loc.address}</span>
                                  </div>
                                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                                    isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                                  }`}>
                                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 标签 Choice Field */}
                      <div className="flex items-center justify-between py-1 border-b border-slate-50">
                        <span className="text-[11px] font-black text-slate-500 w-16">标签</span>
                        <div className="flex-1 flex gap-1.5 flex-wrap">
                          {['家', '公司', '学校'].map((lbl) => {
                            const isSelected = addressLabel === lbl;
                            return (
                              <button
                                key={lbl}
                                onClick={() => setAddressLabel(lbl)}
                                className={`px-3 py-1 text-[9px] font-black rounded-full border transition-all active:scale-95 ${
                                  isSelected 
                                    ? 'bg-blue-50 border-blue-200 text-blue-600 scale-105 shadow-xs' 
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {lbl}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => {
                              const val = prompt('请输入自定义标签名称 (最多4个字)：', '');
                              if (val && val.trim()) {
                                setAddressLabel(val.trim().substring(0, 4));
                              }
                            }}
                            className={`px-3 py-1 text-[9px] font-black rounded-full border transition-all active:scale-95 ${
                              !['家', '公司', '学校'].includes(addressLabel) 
                                ? 'bg-blue-50 border-blue-200 text-blue-600 scale-105 shadow-xs' 
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {!['家', '公司', '学校'].includes(addressLabel) ? addressLabel : '自定义'}
                          </button>
                        </div>
                      </div>

                      {/* 设为默认地址 WeChat Style Toggle Switch */}
                      <div className="flex items-center justify-between py-1">
                        <div className="flex flex-col text-left">
                          <span className="text-[11px] font-black text-slate-800">设为默认地址</span>
                          <span className="text-[8px] text-slate-400 font-medium mt-0.5">每次下单或添加地址时优先推荐</span>
                        </div>
                        <button 
                          onClick={() => setAddressIsDefault(!addressIsDefault)}
                          className={`w-8 h-4.5 rounded-full p-0.5 transition-colors focus:outline-none shrink-0 ${
                            addressIsDefault ? 'bg-emerald-500' : 'bg-slate-200'
                          }`}
                        >
                          <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform duration-200 ease-in-out ${
                            addressIsDefault ? 'translate-x-3.5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>

                    </div>
                  </div>

                  {/* Standard WeChat Native bottom "保存" button */}
                  <div className="p-3 bg-white border-t border-slate-100 shrink-0">
                    <button 
                      onClick={() => {
                        const currentType = orderStatus === 'select-dest' ? 'dest' : 'start';
                        const finalAddressName = selectedLocName || searchKeyword.trim();
                        
                        if (!finalAddressName) {
                          onTriggerToast('请在详细地址中输入或选择有效位置！');
                          return;
                        }
                        
                        // Smart contact sync
                        if (addressPhone.trim() && addressPhone !== '13988889999') {
                          setPassengerPhone(addressPhone);
                        }
                        
                        if (currentType === 'start') {
                          setStartPoint(finalAddressName);
                        } else {
                          setDestination(finalAddressName);
                        }
                        
                        setOrderStatus('idle');
                        setSearchKeyword('');
                        onTriggerToast(`✓ 已应用${currentType === 'start' ? '出发' : '目的'}地址：${finalAddressName}`);
                      }}
                      className="w-full bg-[#0067FF] hover:bg-blue-700 text-white font-black text-[11px] py-2.5 rounded-xl transition-all active:scale-95 shadow-md shadow-blue-500/15"
                    >
                      保存并使用
                    </button>
                  </div>

                  {/* WeChat Bottom Sheet Region/District Picker Dialog Overlay */}
                  {showAreaPicker && (
                    <div className="absolute inset-0 bg-black/40 z-50 flex flex-col justify-end animate-in fade-in duration-200">
                      <div className="bg-white rounded-t-2xl max-h-[60%] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
                          <span className="text-[11px] font-black text-slate-800">选择所在地区</span>
                          <button 
                            onClick={() => setShowAreaPicker(false)}
                            className="text-[11px] font-black text-blue-600"
                          >
                            确定
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                          {[
                            '兴庆区',
                            '金凤区',
                            '西夏区',
                            '贺兰县',
                            '永宁县',
                            '灵武市'
                          ].map((district) => {
                            const areaName = `宁夏回族自治区 银川市 ${district}`;
                            const isSelected = addressArea === areaName;
                            return (
                              <div 
                                key={district}
                                onClick={() => {
                                  setAddressArea(areaName);
                                  setShowAreaPicker(false);
                                  onTriggerToast(`已选择所在地区：${district}`);
                                }}
                                className="px-4 py-3 text-left flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
                              >
                                <span className={`text-[11.5px] font-black ${isSelected ? 'text-blue-600' : 'text-slate-700'}`}>
                                  {areaName}
                                </span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : orderStatus === 'rules' ? (
                <div className="flex-1 flex flex-col bg-[#f8f9fb] text-[#191c1e] select-none pb-6 overflow-y-auto animate-in fade-in slide-in-from-right duration-200">
                  <main className="px-3 pt-3 space-y-4">
                    {/* Map Visualization Section */}
                    <section className="relative rounded-2xl overflow-hidden h-44 shadow-sm border border-slate-100 shrink-0">
                      <TencentMap apiKey="5N4BZ-YFOCT-BWJXC-L7O2O-ATI6K-UYFZW" showBoundary={true} />
                      
                      {/* Map Overlay Legend */}
                      <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1.5 border border-slate-200/50 z-20">
                        <span className="w-2.5 h-2.5 bg-[#033998] rounded-sm opacity-80" />
                        <span className="text-[9px] font-bold text-slate-800">围栏范围 (银川城区)</span>
                      </div>
                      
                      {/* Map Attribution */}
                      <div className="absolute bottom-1 right-2 flex items-center gap-0.5 opacity-60 z-20">
                        <span className="text-[8px] font-medium text-slate-500">高德地图</span>
                      </div>
                    </section>

                    {/* Pricing Rules Title */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                        <h2 className="text-sm font-black text-slate-800">代驾计价规则</h2>
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                      </div>
                    </div>

                    {/* Pricing Content Card */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-5">
                      
                      {/* Scope Section */}
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-1.5 border-l-3 border-[#033998] pl-2">
                          <h3 className="text-xs font-black text-slate-850">黑湾代驾银川城区范围内</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 mb-1">晚上12点前</span>
                            <div className="flex items-baseline gap-0.5">
                              <span className="text-[#033998] font-black text-xl">28</span>
                              <span className="text-slate-600 text-[9px] font-bold">元 / 一小时</span>
                            </div>
                            <div className="mt-1.5 pt-1 border-t border-slate-100 flex items-center gap-1 text-[8px] text-emerald-600 font-extrabold">
                              <span>✓</span>
                              <span>随便跑</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 mb-1">晚上12点后</span>
                            <div className="flex items-baseline gap-0.5">
                              <span className="text-[#033998] font-black text-xl">35</span>
                              <span className="text-slate-600 text-[9px] font-bold">元 / 一小时</span>
                            </div>
                            <div className="mt-1.5 pt-1 border-t border-slate-100 flex items-center gap-1 text-[8px] text-emerald-600 font-extrabold">
                              <span>✓</span>
                              <span>随便跑</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Overtime & OOB rules */}
                      <div className="bg-slate-50 rounded-xl p-3 space-y-2 text-[10px] text-slate-600 font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-[#835500] font-bold">⏱</span>
                          <p>超一小时一分钟 <span className="font-bold text-slate-800">1</span> 元</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#835500] font-bold">📍</span>
                          <p>超范围一公里 <span className="font-bold text-slate-800">5</span> 元</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-[#835500] font-bold mt-0.5">⏳</span>
                          <div>
                            <p>司机就位免费等待 <span className="font-bold text-slate-800">10</span> 分钟</p>
                            <p className="text-[8px] text-slate-400">超1分钟加收1元</p>
                          </div>
                        </div>
                      </div>

                      {/* Out of Bounds Rules */}
                      <div className="pt-4 border-t border-slate-100 space-y-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[#033998]">🚫</span>
                          <h3 className="text-xs font-black text-slate-850">范围外起步计费规则</h3>
                        </div>
                        <div className="space-y-2">
                          <div className="flex flex-col gap-0.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[9px] font-bold text-amber-600">晚上12点前</span>
                            <p className="text-[10px] text-slate-600 font-medium">
                              <span className="font-black text-[#033998] text-xs">28元</span> 包含5公里，超5公里后每公里加收 <span className="font-black text-[#033998]">2元</span>
                            </p>
                          </div>
                          <div className="flex flex-col gap-0.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[9px] font-bold text-amber-600">晚上12点后</span>
                            <p className="text-[10px] text-slate-600 font-medium">
                              <span className="font-black text-[#033998] text-xs">35元</span> 包含5公里，超5公里后每公里加收 <span className="font-black text-[#033998]">2元</span>
                            </p>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Small inline Return Button */}
                    <div className="pt-2 pb-4 flex justify-center">
                      <button 
                        onClick={() => setOrderStatus('profile')}
                        className="px-4 py-1.5 bg-gradient-to-r from-slate-700 to-slate-800 active:scale-95 text-white font-black rounded-xl text-[10px] transition-all flex items-center gap-1 shadow-md cursor-pointer"
                      >
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path>
                        </svg>
                        <span>返回个人中心</span>
                      </button>
                    </div>

                  </main>
                </div>
              ) : orderStatus === 'agreement' ? (
                <div className="flex-1 flex flex-col bg-slate-50 text-slate-800 select-none pb-6 overflow-y-auto animate-in fade-in slide-in-from-right duration-200">
                  <main className="px-3 pt-3.5 space-y-4">
                    {/* Agreement Card */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-4">
                      
                      <div className="flex flex-col items-center gap-1 pb-2 border-b border-slate-100">
                        <span className="text-[9px] uppercase tracking-widest text-slate-400 font-extrabold">USER AGREEMENT</span>
                        <h2 className="text-xs font-black text-slate-800">代驾服务使用协议</h2>
                      </div>

                      <div className="space-y-4 text-[10px] text-slate-600 leading-relaxed max-h-[340px] overflow-y-auto pr-1">
                        
                        {/* Section 1 */}
                        <div className="space-y-1.5">
                          <h3 className="font-extrabold text-slate-800 text-[11px] border-l-2 border-orange-500 pl-1.5">
                            第一条 用户注册与资格
                          </h3>
                          <div className="space-y-1 pl-1 text-slate-500">
                            <p className="font-medium">
                              1. 您注册时，请您认真阅读本协议，审阅并接受或不接受本协议。若您确认注册为本平台用户，即表示您已充分阅读、理解并同意自己与本平台订立本协议，且您自愿受本协议的条款约束。本平台有权随时根据实际情况变更本协议并在本平台上予以公告。经修订的条款一经在本平台的公布后，立即自动生效。如您不同意相关变更，必须停止使用本平台，并注销您的账户信息，一旦您继续使用本平台，则表示您已接受并自愿遵守经修订后的条款。本协议内容包括协议正文及所有本平台已经发布的各类规则。所有规则为本协议不可分割的一部分，与本协议正文具有同等法律效力。
                            </p>
                            <p>
                              2. 用户一经签署本协议，即视为用户允许代驾平台通过短信、公众号、APP 服务器推送或其他方式向其发送订单服务信息、优惠服务信息及与本协议相关的其他信息。
                            </p>
                            <p>
                              3. 用户应保证其注册信息的真实、准确、有效；如该等信息有任何变更，用户应当及时完成信息更新。因用户信息更新不及时所导致用户遭受任何损失的，应由用户自行承担责任，代驾平台不承担责任。
                            </p>
                            <p>
                              4、只有符合下列条件之一的自然人或法人才能申请成为本平台用户，可以使用本平台的服务：a、年满十八岁，并具有民事权利能力和民事行为能力的自然人；b、无民事行为能力人或限制民事行为能力人应事先取得其监护人的同意；
                            </p>
                          </div>
                        </div>

                        {/* Section 2 */}
                        <div className="space-y-1.5">
                          <h3 className="font-extrabold text-slate-800 text-[11px] border-l-2 border-orange-500 pl-1.5">
                            第二条 信息服务
                          </h3>
                          <div className="space-y-1 pl-1 text-slate-500">
                            <p>
                              1. 代驾平台为用户提供发送代驾请求（叫单）和接受该请求（接单）的信息推送服务，以及用户代驾订单履行情况的信息记录服务。
                            </p>
                            <p>
                              2. 代驾服务费收费标准由代驾服务提供商当地合作商制定及调整。
                            </p>
                            <p>
                              3. 用户可通过代驾平台对代驾服务行为作出评价或投诉，代驾平台将用户评价和投诉实时反馈。
                            </p>
                          </div>
                        </div>

                        {/* Section 3 */}
                        <div className="space-y-1.5">
                          <h3 className="font-extrabold text-slate-800 text-[11px] border-l-2 border-orange-500 pl-1.5">
                            第三条 双方的权利义务
                          </h3>
                          <div className="space-y-2 pl-1 text-slate-500">
                            <p>
                              1. 用户应确保提供给代驾司机代驾的车辆满足如下所有条件；如任一条件不满足，用户应如实告知代驾平台指派的代驾司机，代驾司机有权拒绝该次服务。如因用户不主动告知或隐瞒以上情况带来的纠纷或者损害，代驾及代驾平台不承担任何责任及赔偿，由用户自行承担。
                            </p>
                            <div className="pl-2 space-y-0.5 text-[9.5px]">
                              <p>（1）对代驾车辆有合法使用权；</p>
                              <p>（2）车辆手续齐全（具备符合法律规定的号牌证、机动车登记证、行驶证等上路手续）；</p>
                              <p>（3）车况正常，符合机动车国家安全技术标准，已按规定检验车辆并检验合格；</p>
                              <p>（4）已购买机动车交通事故责任强制保险；</p>
                              <p>（5）代驾车辆上路符合当地法律法规和政策，不违反针对尾号、高峰期、外地车等的行驶限制。</p>
                              <p>（6）对于营运车辆，车主应如实告知，公司禁止代驾营运车辆，如未告知，发生事故后代驾员及飞鸟代驾公司不承担任何责任。</p>
                            </div>
                            <p className="pt-1">
                              2. 代驾平台在如下情形下不承担责任：
                            </p>
                            <div className="pl-2 space-y-0.5 text-[9.5px]">
                              <p>（1）不满足本协议第 1 条条件；</p>
                              <p>（2）代驾服务过程中因用户及 / 或代驾车辆上人员及代驾司机及 / 或代驾车辆本身原因导致发生的所有损失（包括但不限于政府部门罚款、代驾车辆上人员人身伤亡和财产损失、代驾车辆损失、代驾车辆上财产损失、任何第三方财产损失和人身伤亡损失）；</p>
                              <p>（3）代驾车辆上违法、违章搭乘人员的人身伤亡；</p>
                              <p>（4）代驾车辆上人员及代驾司机因疾病、分娩、斗殴、自杀、犯罪行为造成的伤亡或损失；</p>
                              <p>（5）用户财产及 / 或任何第三方财产因 market 价格变动造成的贬值，修理后因价值降低引起；</p>
                              <p>（6）损失发生后，用户放任损失发生未进行必要修理或适当处理，致使损失扩大的部分。</p>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Small inline Return Button */}
                    <div className="pt-1 pb-4 flex justify-center">
                      <button 
                        onClick={() => setOrderStatus('profile')}
                        className="px-4 py-1.5 bg-gradient-to-r from-orange-400 to-orange-500 active:scale-95 text-white font-black rounded-xl text-[10px] transition-all flex items-center gap-1 shadow-md cursor-pointer"
                      >
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path>
                        </svg>
                        <span>返回个人中心</span>
                      </button>
                    </div>

                  </main>
                </div>
              ) : orderStatus === 'about' ? (
                <div 
                  className="flex-1 flex flex-col text-slate-800 select-none pb-6 overflow-y-auto animate-in fade-in slide-in-from-right duration-200" 
                  style={{ background: 'linear-gradient(180deg, #ffb347 0%, #ffcc33 100%)' }}
                >
                  {/* BEGIN: TopDecorativeSection */}
                  <div className="relative h-44 w-full flex items-center justify-center overflow-hidden shrink-0">
                    {/* Abstract Orange Shapes */}
                    <div className="absolute -top-10 -left-10 w-44 h-44 bg-orange-400 opacity-60 rounded-full blur-2xl"></div>
                    <div className="absolute top-20 -right-20 w-48 h-48 bg-orange-300 opacity-40 rounded-full blur-xl"></div>
                    
                    {/* Visual Heading Container */}
                    <div className="relative z-10 bg-white/95 rounded-2xl p-5 shadow-lg flex flex-col items-center border border-white/40">
                      <div className="relative">
                        <h1 className="text-3xl font-black tracking-widest text-orange-500 drop-shadow-md">
                          关于<span className="text-orange-400">我们</span>
                        </h1>
                        {/* Small Bubble Detail */}
                        <div className="absolute -top-3.5 -right-6 bg-orange-500 text-white text-[8px] px-2 py-0.5 rounded-full font-bold shadow-xs">
                          ABOUT US
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* END: TopDecorativeSection */}

                  {/* BEGIN: ContentCard */}
                  <main className="relative z-10 flex-1 px-4 pb-6 -mt-2">
                    <div 
                      className="rounded-3xl min-h-[360px] relative border border-orange-100 flex flex-col p-5 shadow-xl"
                      style={{ background: 'linear-gradient(180deg, #ffffff 0%, #fff9e6 100%)' }}
                    >
                      {/* Section Header Label */}
                      <div 
                        className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-7.5 flex items-center justify-center shadow-md"
                        style={{
                          background: 'linear-gradient(90deg, #ffcc00 0%, #ffd700 100%)',
                          clipPath: 'polygon(10% 0, 90% 0, 100% 100%, 0% 100%)'
                        }}
                      >
                        <span className="text-orange-950 font-black tracking-widest text-[10px]">公司简介</span>
                      </div>

                      {/* Body Text Content */}
                      <div className="pt-5 space-y-4 text-gray-700 text-[11px] leading-relaxed">
                        <p className="font-bold text-slate-800 text-center text-xs border-b border-orange-100 pb-2">
                          本公司承接酒后代驾、商务代驾、长途代驾、旅游代驾、婚庆代驾等。
                        </p>

                        {/* Section: Service Principle */}
                        <div className="space-y-1">
                          <h3 className="font-extrabold text-orange-600 flex items-center gap-1 text-[11px]">
                            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                            服务宗旨：
                          </h3>
                          <div className="pl-3.5 space-y-0.5 text-slate-600 font-medium">
                            <p>坚持诚信、周到服务是我们服务之本；</p>
                            <p>高效便捷、安全至上是我们的服务理念；</p>
                          </div>
                        </div>

                        {/* Section: Service Principle 2 */}
                        <div className="space-y-1">
                          <h3 className="font-extrabold text-orange-600 flex items-center gap-1 text-[11px]">
                            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                            服务品质：
                          </h3>
                          <ul className="pl-3.5 space-y-0.5 text-slate-600 list-none font-medium">
                            <li>您的意见 —— 是我们进步的动力；</li>
                            <li>您的信任 —— 是我们殷切的期盼；</li>
                            <li>您的满意 —— 是我们最高的荣誉。</li>
                          </ul>
                        </div>

                        {/* Section: Commitment */}
                        <div className="space-y-1">
                          <h3 className="font-extrabold text-orange-600 flex items-center gap-1 text-[11px]">
                            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                            代驾的承诺：
                          </h3>
                          <div className="pl-3.5 space-y-0.5 text-slate-600 font-medium">
                            <p>每一趟代驾，后台有司机出行轨迹定位；</p>
                            <p>每一趟代驾，都为您投保！</p>
                          </div>
                        </div>

                        {/* Section: Goal */}
                        <div className="space-y-1">
                          <h3 className="font-extrabold text-orange-600 flex items-center gap-1 text-[11px]">
                            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                            代驾的目标：
                          </h3>
                          <p className="pl-3.5 text-slate-600 font-medium">
                            安全为本，诚信至上，为您地生活保驾护航！
                          </p>
                        </div>
                      </div>

                      {/* Small inline Return Button */}
                      <div className="pt-4 flex justify-center">
                        <button 
                          onClick={() => setOrderStatus('profile')}
                          className="px-4 py-1.5 bg-gradient-to-r from-orange-400 to-orange-500 active:scale-95 hover:scale-105 text-white font-black rounded-xl text-[10px] transition-all flex items-center gap-1 shadow-sm shadow-orange-500/20 cursor-pointer"
                        >
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path>
                          </svg>
                          <span>返回个人中心</span>
                        </button>
                      </div>

                    </div>
                  </main>
                  {/* END: ContentCard */}
                </div>
              ) : orderStatus === 'profile' ? (
                <div className="flex-1 flex flex-col text-slate-800 select-none pb-4 overflow-y-auto animate-in fade-in slide-in-from-right duration-200" style={{ background: 'linear-gradient(to bottom, #FFF3E5 0%, #F5F5F5 30%, #F5F5F5 100%)' }}>
                  <main className="px-3 pt-4 space-y-4">
                    
                    {/* BEGIN: UserInfoSection */}
                    <section className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full border-[3px] border-orange-400 overflow-hidden bg-white shadow-sm flex items-center justify-center">
                          <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                              <linearGradient id="avatarGradProfile" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#1e293b" />
                                <stop offset="100%" stopColor="#0f172a" />
                              </linearGradient>
                              <linearGradient id="capGradProfile" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#fbbf24" />
                                <stop offset="100%" stopColor="#d97706" />
                              </linearGradient>
                              <linearGradient id="skinGradProfile" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#ffedd5" />
                                <stop offset="100%" stopColor="#fed7aa" />
                              </linearGradient>
                            </defs>
                            
                            {/* Circle Background */}
                            <circle cx="50" cy="50" r="48" fill="url(#avatarGradProfile)" />
                            <circle cx="50" cy="50" r="46" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeOpacity="0.4" />
                            
                            {/* Driver's Suit Body */}
                            <path d="M25,85 C25,70 35,65 50,65 C65,65 75,70 75,85" fill="#1e3a8a" />
                            <path d="M42,65 L50,78 L58,65" fill="#f8fafc" />
                            <path d="M48,72 L52,72 L50,85 Z" fill="#0f172a" />

                            {/* Driver's Head / Ears */}
                            <circle cx="34" cy="52" r="5" fill="url(#skinGradProfile)" />
                            <circle cx="66" cy="52" r="5" fill="url(#skinGradProfile)" />
                            <circle cx="50" cy="50" r="16" fill="url(#skinGradProfile)" />

                            {/* Eyes */}
                            <path d="M42,48 C43,46 46,46 47,48" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none" />
                            <path d="M53,48 C54,46 57,46 58,48" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none" />
                            
                            {/* Cheeks */}
                            <circle cx="38" cy="54" r="2.5" fill="#f43f5e" fillOpacity="0.4" />
                            <circle cx="62" cy="54" r="2.5" fill="#f43f5e" fillOpacity="0.4" />

                            {/* Friendly Smile */}
                            <path d="M45,54 Q50,59 55,54" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none" />

                            {/* Chauffeur's Cap */}
                            <path d="M30,38 C35,32 65,32 70,38 C72,40 70,42 66,42 C56,43 44,43 34,42 C30,42 28,40 30,38 Z" fill="#0f172a" />
                            <path d="M32,36 C32,24 68,24 68,36" fill="url(#capGradProfile)" />
                            <path d="M32,34 L68,34 L67,38 L33,38 Z" fill="#0f172a" />
                            {/* Golden Cap Badge */}
                            <path d="M50,28 L52,32 L56,32 L53,35 L54,39 L50,37 L46,39 L47,35 L44,32 L48,32 Z" fill="#fbbf24" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-extrabold tracking-tight text-slate-900">
                            {passengerPhone && passengerPhone.length === 11 
                              ? `${passengerPhone.slice(0, 3)}****${passengerPhone.slice(7)}` 
                              : '155****1222'}
                          </span>
                          <span className="bg-orange-100 text-[#FF8200] text-[8px] px-1.5 py-0.5 rounded-full font-black flex items-center shadow-2xs">
                            至尊VIP
                          </span>
                        </div>
                        <button 
                          onClick={() => {
                            setOrderStatus('idle');
                            onTriggerToast('💡 提示：请直接在输入框修改您的联系手机号！');
                          }}
                          className="mt-1 flex items-center text-slate-500 text-[10px] hover:text-slate-700"
                        >
                          <svg className="w-3 h-3 mr-1 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
                          </svg>
                          更改手机号
                        </button>
                      </div>
                    </section>
                    {/* END: UserInfoSection */}

                    {/* BEGIN: WalletRechargeSection */}
                    <section className="bg-white rounded-2xl p-3 shadow-md flex flex-col border border-slate-100">
                      {/* Action Buttons Row */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        {/* Wallet Button */}
                        <button 
                          onClick={() => onTriggerToast('💳 当前钱包资产：0.00 元')}
                          className="flex items-center gap-2 bg-[#FFF5EB] p-2.5 rounded-xl border border-orange-50 active:scale-95 transition-all text-left"
                        >
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FFB770] to-[#FF8200] flex items-center justify-center shadow-xs shrink-0">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"></path>
                            </svg>
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-800">钱包</div>
                            <div className="text-[8px] text-[#FF8200] font-bold">查看资产</div>
                          </div>
                        </button>
                        
                        {/* Recharge Button */}
                        <button 
                          onClick={() => {
                            const amt = prompt('请输入您想要充值的金额 (元)：', '100');
                            if (amt) {
                              const parsed = parseFloat(amt);
                              if (!isNaN(parsed) && parsed > 0) {
                                onTriggerToast(`🎉 成功充值 ${parsed.toFixed(2)} 元！余额已更新。`);
                              } else {
                                onTriggerToast('⚠️ 输入金额有误！');
                              }
                            }
                          }}
                          className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 active:scale-95 transition-all text-left"
                        >
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#87C8FF] to-[#3B99FF] flex items-center justify-center shadow-xs shrink-0">
                            <div className="w-5 h-5 bg-white/20 rounded-md flex items-center justify-center text-white text-xs font-black">￥</div>
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-800">充值</div>
                            <div className="text-[8px] text-slate-400">快速到账</div>
                          </div>
                        </button>
                      </div>
                      
                      {/* Balances Row */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-slate-50/80 rounded-xl p-2 flex flex-col gap-0.5">
                          <span className="text-[9px] text-slate-500 font-bold">钱包余额</span>
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-sm font-black text-slate-800">0.00</span>
                            <span className="text-[9px] text-slate-400">元</span>
                          </div>
                        </div>
                        <div className="bg-slate-50/80 rounded-xl p-2 flex flex-col gap-0.5">
                          <span className="text-[9px] text-slate-500 font-bold">邀请奖励</span>
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-sm font-black text-slate-800">0.00</span>
                            <span className="text-[9px] text-slate-400">元</span>
                          </div>
                        </div>
                      </div>
                    </section>
                    {/* END: WalletRechargeSection */}

                    {/* BEGIN: GridMenuSection */}
                    <section className="bg-white rounded-2xl p-3 shadow-md border border-slate-100 grid grid-cols-4 gap-y-4 gap-x-0.5">
                      {/* Item 1: 我的订单 */}
                      <div 
                        onClick={() => onTriggerToast('📁 您当前暂无微信小程序历史订单')}
                        className="flex flex-col items-center gap-1 cursor-pointer group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-orange-50/70 flex items-center justify-center transition-all group-active:scale-95 border border-orange-50">
                          <div className="w-6.5 h-6.5 rounded-lg bg-gradient-to-br from-[#FFB770] to-[#FF8200] flex items-center justify-center shadow-xs">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeWidth="2"></path>
                            </svg>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-slate-600">我的订单</span>
                      </div>

                      {/* Item 2: 开具发票 */}
                      <div 
                        onClick={() => onTriggerToast('📄 开具发票功能暂未开放')}
                        className="flex flex-col items-center gap-1 cursor-pointer group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center transition-all group-active:scale-95 border border-slate-100">
                          <div className="w-6.5 h-6.5 rounded-lg bg-gradient-to-br from-[#87C8FF] to-[#3B99FF] flex items-center justify-center shadow-xs">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeWidth="2"></path>
                            </svg>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-slate-600">开具发票</span>
                      </div>

                      {/* Item 3: 优惠券 */}
                      <div 
                        onClick={() => onTriggerToast('🎫 您当前拥有 0 张可用优惠券')}
                        className="flex flex-col items-center gap-1 cursor-pointer group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center transition-all group-active:scale-95 border border-slate-100">
                          <div className="w-6.5 h-6.5 rounded-lg bg-gradient-to-br from-[#FF99AA] to-[#FF5A78] flex items-center justify-center shadow-xs">
                            <span className="text-white text-[8px] font-black">惠</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-slate-600">优惠券</span>
                      </div>

                      {/* Item 4: 安全中心 */}
                      <div 
                        onClick={() => onTriggerToast('🛡️ 本微信代叫行程均受人保车辆安行险全面保障')}
                        className="flex flex-col items-center gap-1 cursor-pointer group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center transition-all group-active:scale-95 border border-slate-100">
                          <div className="w-6.5 h-6.5 rounded-lg bg-gradient-to-br from-[#A8E6CF] to-[#56C596] flex items-center justify-center shadow-xs">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeWidth="2"></path>
                            </svg>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-slate-600">安全中心</span>
                      </div>

                      {/* Item 5: 关于平台 */}
                      <div 
                        onClick={() => setOrderStatus('about')}
                        className="flex flex-col items-center gap-1 cursor-pointer group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center transition-all group-active:scale-95 border border-slate-100">
                          <div className="w-6.5 h-6.5 rounded-lg bg-gradient-to-br from-[#FFAB91] to-[#FF7043] flex items-center justify-center shadow-xs">
                            <span className="text-white text-[11px] font-black">!</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-slate-600">关于平台</span>
                      </div>

                      {/* Item 6: 计费规则 */}
                      <div 
                        onClick={() => setOrderStatus('rules')}
                        className="flex flex-col items-center gap-1 cursor-pointer group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center transition-all group-active:scale-95 border border-slate-100">
                          <div className="w-6.5 h-6.5 rounded-lg bg-gradient-to-br from-[#C5CAE9] to-[#7986CB] flex items-center justify-center shadow-xs">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2"></path>
                            </svg>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-slate-600">计费规则</span>
                      </div>

                      {/* Item 7: 相关协议 */}
                      <div 
                        onClick={() => setOrderStatus('agreement')}
                        className="flex flex-col items-center gap-1 cursor-pointer group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center transition-all group-active:scale-95 border border-slate-100">
                          <div className="w-6.5 h-6.5 rounded-lg bg-gradient-to-br from-[#FFE0B2] to-[#FFB74D] flex items-center justify-center shadow-xs">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth="2"></path>
                            </svg>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-slate-600">相关协议</span>
                      </div>

                      {/* Item 8: 商户中心 */}
                      <div 
                        onClick={() => onTriggerToast('🏪 商户特约合作通道申请中')}
                        className="flex flex-col items-center gap-1 cursor-pointer group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center transition-all group-active:scale-95 border border-slate-100">
                          <div className="w-6.5 h-6.5 rounded-lg bg-gradient-to-br from-[#D1C4E9] to-[#9575CD] flex items-center justify-center shadow-xs">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeWidth="2"></path>
                            </svg>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-slate-600">商户中心</span>
                      </div>
                    </section>
                    {/* END: GridMenuSection */}

                    {/* BEGIN: BackButtonSection */}
                    <div className="pt-2 pb-6 flex justify-center">
                      <button 
                        onClick={() => setOrderStatus('idle')}
                        className="w-14 h-14 bg-gradient-to-br from-[#FFB770] to-[#FF8200] rounded-2xl flex flex-col items-center justify-center shadow-md shadow-orange-300/30 transition-all active:scale-95 hover:scale-105 cursor-pointer text-white"
                      >
                        <svg className="w-5 h-5 text-white mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                        </svg>
                        <span className="text-white font-extrabold text-[9px] tracking-wide">返回首页</span>
                      </button>
                    </div>
                    {/* END: BackButtonSection */}

                  </main>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 border border-emerald-500 animate-bounce">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-900">🎉 下单通知发送成功！</h3>
                    <p className="text-[10px] text-slate-500 leading-normal px-2">
                      订单数据已同步写入云端数据库。绑定司机 <strong>{targetDriver}</strong> 的手机端将立即听到开单振铃，并弹出强光抢单框！
                    </p>
                  </div>

                  <div className="w-full bg-slate-50 rounded-xl p-3 border border-slate-100 text-[10px] text-slate-600 space-y-1.5 text-left font-sans">
                    <div className="flex justify-between">
                      <span className="text-slate-400">乘客手机：</span>
                      <span className="font-bold font-mono text-slate-800">{passengerPhone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">出发地点：</span>
                      <span className="font-bold text-slate-800">{startPoint}</span>
                    </div>
                    {destination && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">目的地：</span>
                        <span className="font-bold text-slate-800">{destination}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-400">关联司机手机：</span>
                      <span className="font-bold font-mono text-blue-600">{targetDriver}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setOrderStatus('idle')}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    返回继续测试下单
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Indicator */}
            <div className="w-full bg-slate-50 py-1.5 flex justify-center items-center shrink-0 select-none">
              <div className="w-24 h-1 bg-slate-800 rounded-full"></div>
            </div>

          </div>



        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* File selector for WeChat files */}
          <div className="flex bg-[#121727] px-4 border-b border-slate-800/80 shrink-0 text-xs font-semibold overflow-x-auto select-none">
            <button
              onClick={() => setCodeFile('wxml')}
              className={`px-3 py-2.5 border-b-2 font-bold ${
                codeFile === 'wxml' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400'
              }`}
            >
              📄 index.wxml (骨架视图)
            </button>
            <button
              onClick={() => setCodeFile('wxss')}
              className={`px-3 py-2.5 border-b-2 font-bold ${
                codeFile === 'wxss' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400'
              }`}
            >
              🎨 index.wxss (样式皮肤)
            </button>
            <button
              onClick={() => setCodeFile('js')}
              className={`px-3 py-2.5 border-b-2 font-bold ${
                codeFile === 'js' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400'
              }`}
            >
              ⚙ index.js (交互控制与网络请求)
            </button>
            <button
              onClick={() => setCodeFile('json')}
              className={`px-3 py-2.5 border-b-2 font-bold ${
                codeFile === 'json' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400'
              }`}
            >
              ⚙ index.json (页面配置)
            </button>
          </div>

          {/* Code display window */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-3 relative">
            <div className="flex items-center justify-between bg-[#111322] border border-slate-800/60 rounded-xl px-4 py-2.5 text-xs text-slate-400 text-left">
              <div>
                <span className="font-bold text-slate-200">
                  {codeFile === 'wxml' && 'index.wxml (小程序骨架)'}
                  {codeFile === 'wxss' && 'index.wxss (页面样式)'}
                  {codeFile === 'js' && 'index.js (上报触发核心 js)'}
                  {codeFile === 'json' && 'index.json (配置声明)'}
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">可以直接复制此代码并放入您的微信小程序开发者工具中直接运行！</p>
              </div>
              
              <button
                onClick={() => {
                  const code = codeFile === 'wxml' ? wxmlCode : codeFile === 'wxss' ? wxssCode : codeFile === 'js' ? jsCode : jsonCode;
                  handleCopyCode(code);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-bold"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '已复制！' : '一键复制代码'}</span>
              </button>
            </div>

            {/* Code Highlight Box */}
            <pre className="flex-1 bg-[#090b12] text-emerald-400 border border-slate-900 rounded-xl p-4 font-mono text-[11px] overflow-auto text-left leading-relaxed">
              <code>
                {codeFile === 'wxml' && wxmlCode}
                {codeFile === 'wxss' && wxssCode}
                {codeFile === 'js' && jsCode}
                {codeFile === 'json' && jsonCode}
              </code>
            </pre>
          </div>

        </div>
      )}

    </div>
  );
}
