import React, { useState, useEffect, useRef } from 'react';
import { db, collection, doc, setDoc, getDoc, getDocs, onSnapshot, deleteDoc, clearCollection } from '../lib/dbProxy';
import { 
  MapPin, 
  Phone, 
  Navigation, 
  Loader2, 
  CheckCircle, 
  Users, 
  Search,
  ArrowRight,
  ArrowLeft,
  Trash2,
  History,
  RefreshCw,
  FileText,
  X,
  Lock,
  Settings,
  Edit2,
  Car,
  Clock,
  Bike,
  QrCode,
  Camera,
  Info,
  Zap,
  Check,
  ClipboardList,
  Flag,
  User,
  ChevronDown,
  Headphones,
  MoreVertical,
  UserPlus,
  Filter,
  SlidersHorizontal,
  ShieldCheck
} from 'lucide-react';
import driverAvatar from '../assets/images/driver_avatar_1784017528877.jpg';

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

const getOrderSyncPrice = (ord: any): string => {
  if (!ord) return '¥40.00';
  const raw = ord.rawOrder || ord;
  const p = raw.calculatedTotalFee ?? raw.estimatedPrice ?? raw.price ?? raw.fare ?? raw.totalFee ?? raw.approxPrice ?? ord.calculatedTotalFee ?? ord.estimatedPrice ?? ord.price ?? ord.fare ?? ord.approxPrice;
  
  if (p !== undefined && p !== null && p !== '') {
    const num = parseFloat(p.toString().replace(/[^\d.]/g, ''));
    if (!isNaN(num) && num > 0) {
      return `¥${num.toFixed(2)}`;
    }
  }

  return '¥40.00';
};

// 推荐本地热门商户起点列表 (按当前所在城市动态过滤/生成)
function getCityMerchantRecommendations(rawCity: string) {
  const city = (rawCity || '银川').replace(/市$/, '').trim();

  const cityMap: Record<string, Array<{ name: string; desc: string }>> = {
    '银川': [
      { name: '北京东路铂金大厦', desc: '银川市兴庆区北京东路' },
      { name: '银川大悦城音乐餐吧', desc: '银川市金凤区正源北街' },
      { name: '银川金凤万达广场', desc: '银川市金凤区黄河东路' },
      { name: '悦海新天地餐饮街', desc: '银川市金凤区康平路' },
      { name: '温州商城酒店区', desc: '银川市兴庆区胜利街' },
      { name: '凯宾斯基饭店宴会厅', desc: '银川市金凤区北京中路' },
      { name: '鼓楼步行街酒店区', desc: '银川市兴庆区解放东街' },
      { name: '建发大枫林餐吧', desc: '银川市金凤区贺兰山中路' }
    ],
    '北京': [
      { name: '工体MIX酒吧', desc: '北京市朝阳区工体北路' },
      { name: '三里屯太古里酒楼', desc: '北京市朝阳区三里屯路' },
      { name: '簋街胡大饭庄', desc: '北京市东城区东直门内大街' },
      { name: '望京SOHO美食街', desc: '北京市朝阳区望京街' },
      { name: '国贸大酒店宴会厅', desc: '北京市朝阳区建国门外大街' },
      { name: '芳草地半岛餐吧', desc: '北京市朝阳区东大桥路' },
      { name: '五道口酒吧街', desc: '北京市海淀区成府路' },
      { name: '中关村1号餐饮中心', desc: '北京市海淀区北清路' }
    ],
    '上海': [
      { name: '外滩18号宴会厅', desc: '上海市黄浦区中山东一路' },
      { name: '新天地酒吧街', desc: '上海市黄浦区太仓路' },
      { name: '陆家嘴国金中心酒楼', desc: '上海市浦东新区世纪大道' },
      { name: '静安嘉里中心餐吧', desc: '上海市静安区南京西路' },
      { name: '衡山路酒吧区', desc: '上海市徐汇区衡山路' },
      { name: '芮欧百货美食区', desc: '上海市静安区南京西路' },
      { name: '豫园绿波廊大酒楼', desc: '上海市黄浦区豫园路' },
      { name: '淮海中路KTV酒吧', desc: '上海市黄浦区淮海中路' }
    ],
    '广州': [
      { name: '珠江新城兴盛路酒吧街', desc: '广州市天河区兴盛路' },
      { name: '太古汇大酒楼', desc: '广州市天河区天河路' },
      { name: '太古仓码头餐吧区', desc: '广州市海珠区革新路' },
      { name: '广州塔旋转餐厅', desc: '广州市海珠区阅江西路' },
      { name: '天河城美食广场', desc: '广州市天河区天河路' },
      { name: '北京路步行街酒家', desc: '广州市越秀区北京路' },
      { name: '建设六马路酒吧街', desc: '广州市越秀区建设六马路' },
      { name: '琶醍啤酒文化艺术区', desc: '广州市海珠区磨碟沙大街' }
    ],
    '深圳': [
      { name: '购物公园酒吧街', desc: '深圳市福田区民田路' },
      { name: '万象城大酒楼', desc: '深圳市罗湖区嘉宾路' },
      { name: '海上世界餐饮区', desc: '深圳市南山区望海路' },
      { name: '华润万象天地广场', desc: '深圳市南山区深南大道' },
      { name: '深圳湾1号酒店厅', desc: '深圳市南山区科苑南路' },
      { name: '卓悦中心酒吧街', desc: '深圳市福田区福华一路' },
      { name: '车公庙美食街', desc: '深圳市福田区深南大道' },
      { name: '科技园美食广场', desc: '深圳市南山区高新南一道' }
    ],
    '成都': [
      { name: '九眼桥酒吧街', desc: '成都市锦江区丝管路' },
      { name: '兰桂坊餐饮区', desc: '成都市锦江区水井街' },
      { name: '太古里大酒楼', desc: '成都市锦江区中纱帽街' },
      { name: '锦里古街酒家', desc: '成都市武侯区武侯祠大街' },
      { name: '339电视塔酒吧街', desc: '成都市成华区猛追湾街' },
      { name: '奎星楼街美食广场', desc: '成都市青羊区奎星楼街' },
      { name: '玉林路小酒馆', desc: '成都市武侯区玉林西路' },
      { name: '环球中心美食广场', desc: '成都市高新区天府大道' }
    ],
    '杭州': [
      { name: '湖滨银泰IN77', desc: '杭州市上城区延安路' },
      { name: '黄龙体育中心酒吧街', desc: '杭州市西湖区黄龙路' },
      { name: '钱江新城来福士', desc: '杭州市上城区新业路' },
      { name: '运河天地餐饮街', desc: '杭州市拱墅区小河路' },
      { name: '西溪印象城大酒楼', desc: '杭州市余杭区五常大道' },
      { name: '胜利河美食街', desc: '杭州市拱墅区霞湾巷' },
      { name: '武林广场商业区', desc: '杭州市拱墅区延安路' },
      { name: '滨江天街餐饮区', desc: '杭州市滨江区江汉路' }
    ],
    '重庆': [
      { name: '九街酒吧街', desc: '重庆市江北区观音桥洋河一路' },
      { name: '洪崖洞民俗酒店区', desc: '重庆市渝中区嘉陵江滨江路' },
      { name: '解放碑国宾大酒楼', desc: '重庆市渝中区民族路' },
      { name: '观音桥大融城餐吧', desc: '重庆市江北区建新北路' },
      { name: '江北城国金中心', desc: '重庆市江北区江北城西大街' },
      { name: '南滨路景观餐饮带', desc: '重庆市南岸区南滨路' },
      { name: '时代天街美食广场', desc: '重庆市渝中区长江二路' },
      { name: '磁器口大酒楼', desc: '重庆市沙坪坝区磁南街' }
    ],
    '西安': [
      { name: '德福巷酒吧街', desc: '西安市碑林区德福巷' },
      { name: '大唐不夜城大酒楼', desc: '西安市雁塔区慈恩路' },
      { name: '小寨赛格餐饮中心', desc: '西安市雁塔区长安中路' },
      { name: '南门合生汇餐吧', desc: '西安市碑林区环城南路' },
      { name: '钟楼开元广场', desc: '西安市碑林区东大街' },
      { name: '曲江池公园酒店区', desc: '西安市雁塔区曲江池东路' },
      { name: '高新万达广场', desc: '西安市雁塔区唐延路' },
      { name: '回民街大酒家', desc: '西安市莲湖区北院门' }
    ],
    '武汉': [
      { name: '江汉路步行街酒楼', desc: '武汉市江汉区江汉路' },
      { name: '光谷步行街酒吧区', desc: '武汉市洪山区光谷广场' },
      { name: '楚河汉街餐饮区', desc: '武汉市武昌区公正路' },
      { name: '武汉天地音乐餐吧', desc: '武汉市江岸区芦沟桥路' },
      { name: '花园道艺术餐饮街', desc: '武汉市江汉区青年路' },
      { name: '吉庆街大酒楼', desc: '武汉市江岸区中山大道' },
      { name: '国广中心大酒店', desc: '武汉市江汉区解放大道' },
      { name: '汉街万达广场', desc: '武汉市武昌区烟霞路' }
    ],
    '南京': [
      { name: '1912酒吧街区', desc: '南京市玄武区长江路' },
      { name: '新街口德基广场酒楼', desc: '南京市秦淮区中山东路' },
      { name: '夫子庙大酒楼', desc: '南京市秦淮区贡院街' },
      { name: '河西万达广场美食街', desc: '南京市建邺区江东中路' },
      { name: '百家湖1912街区', desc: '南京市江宁区双龙大道' },
      { name: '水游城餐饮中心', desc: '南京市秦淮区建康路' },
      { name: '紫峰大厦宴会厅', desc: '南京市鼓楼区中山北路' },
      { name: '老门东大酒家', desc: '南京市秦淮区剪子巷' }
    ],
    '郑州': [
      { name: '二七广场德化街', desc: '郑州市二七区德化街' },
      { name: '农科路酒吧街', desc: '郑州市金水区农科路' },
      { name: 'CBD玉米楼宴会厅', desc: '郑州市金水区商务内环路' },
      { name: '正弘城餐饮中心', desc: '郑州市金水区花园路' },
      { name: '国贸360广场餐吧', desc: '郑州市金水区农业路' },
      { name: '万达广场美食街', desc: '郑州市中原区中原中路' },
      { name: '海亮时代广场', desc: '郑州市管城区紫荆山路' },
      { name: '熙地港餐饮区', desc: '郑州市金水区农业东路' }
    ],
    '长沙': [
      { name: '解放西路酒吧街', desc: '长沙市芙蓉区解放西路' },
      { name: '坡子街火宫殿', desc: '长沙市天心区坡子街' },
      { name: '国金中心IFS大酒楼', desc: '长沙市芙蓉区黄兴中路' },
      { name: '太平街老酒楼', desc: '长沙市天心区太平街' },
      { name: '渔人码头餐饮街', desc: '长沙市岳麓区潇湘北路' },
      { name: '黄兴路步行街餐吧', desc: '长沙市天心区黄兴南路' },
      { name: '万达广场餐饮区', desc: '长沙市开福区湘江中路' },
      { name: '德思勤四季汇', desc: '长沙市雨花区湘府中路' }
    ]
  };

  if (cityMap[city]) {
    return cityMap[city];
  }

  return [
    { name: `${city}中心万达广场`, desc: `${city}市中心城区商业主街` },
    { name: `${city}万象城大酒楼`, desc: `${city}市商务核心区` },
    { name: `${city}酒吧风情街`, desc: `${city}市特色酒吧娱乐街区` },
    { name: `${city}国际大饭店宴会厅`, desc: `${city}市迎宾大道核心区` },
    { name: `${city}新天地餐饮广场`, desc: `${city}市高新区核心商圈` },
    { name: `${city}商业步行街大酒家`, desc: `${city}市老城区商业步行街` },
    { name: `${city}金鹰购物中心餐吧`, desc: `${city}市主干道商业区` },
    { name: `${city}温州商城酒店区`, desc: `${city}市繁华商业物流园区` }
  ];
}

// Helper to format order number as YC + YYYYMMDDHHMM + 5-digit sequence (e.g. YC20260802191300001)
const formatMerchantOrderNo = (data: any, idx?: number, totalCount?: number) => {
  if (data?.orderNo && data.orderNo.startsWith('YC') && data.orderNo.length >= 19) {
    return data.orderNo;
  }
  
  const ts = data?.timestamp || (data?.id && !isNaN(Number(String(data.id).replace('MO_', ''))) ? Number(String(data.id).replace('MO_', '')) : Date.now());
  const dt = new Date(ts);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  const hh = String(dt.getHours()).padStart(2, '0');
  const min = String(dt.getMinutes()).padStart(2, '0');

  let seq = 1;
  if (data?.seqNumber) {
    seq = data.seqNumber;
  } else if (typeof idx === 'number' && typeof totalCount === 'number' && totalCount > 0) {
    seq = totalCount - idx;
  } else if (typeof idx === 'number') {
    seq = idx + 1;
  }

  const seqStr = String(seq).padStart(5, '0');
  return `YC${yyyy}${mm}${dd}${hh}${min}${seqStr}`;
};

interface MobileDispatchValetOrderProps {
  onShowToast: (msg: string) => void;
  userPhone?: string | null;
  userRole?: string;
  userTeamCity?: string;
  onClose?: () => void;
}

export default function MobileDispatchValetOrder({ 
  onShowToast,
  userPhone = null,
  userRole = '普通司机',
  userTeamCity = '',
  onClose
}: MobileDispatchValetOrderProps) {
  
  // Team management state (Default and fixed as requested)
  const teamName = '黑湾代驾小队';
  const setTeamName = (_name: string) => {};
  const tempTeamName = '黑湾代驾小队';
  const setTempTeamName = (_name: string) => {};
  const setIsEditingTeamName = (_editing: boolean) => {};

  // Network IP auto-detected current city state
  const [currentCity, setCurrentCity] = useState<string>(userTeamCity || '银川市');

  // Helper to auto-compress image and convert to PNG format
  const compressAndConvertToPng = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            const maxWidth = 800;
            const maxHeight = 800;
            let width = img.width;
            let height = img.height;

            if (width > maxWidth || height > maxHeight) {
              if (width / height > maxWidth / maxHeight) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              } else {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(e.target?.result as string);
              return;
            }

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            const pngUrl = canvas.toDataURL('image/png', 0.85);
            resolve(pngUrl);
          } catch (err) {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => resolve(e.target?.result as string || '');
        img.src = e.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Form states
  const [passengerAddress, setPassengerAddress] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [orderRemark, setOrderRemark] = useState('');
  const [scheduledTime, setScheduledTime] = useState('现在出发');
  const [needScooter, setNeedScooter] = useState(true);
  const [wechatQrUrl, setWechatQrUrl] = useState<string>(() => {
    const userKey = userPhone ? `dd_dispatch_wechat_qr_${userPhone}` : 'dd_dispatch_wechat_qr';
    return localStorage.getItem(userKey) || localStorage.getItem('dd_dispatch_wechat_qr') || localStorage.getItem('dd_wechat_qr') || '';
  });

  // Real-time listener for current dispatcher's WeChat QR code from Firestore
  useEffect(() => {
    const userKey = userPhone ? `dd_dispatch_wechat_qr_${userPhone}` : 'dd_dispatch_wechat_qr';
    const localSaved = localStorage.getItem(userKey) || localStorage.getItem('dd_dispatch_wechat_qr') || localStorage.getItem('dd_wechat_qr');
    if (localSaved) {
      setWechatQrUrl(localSaved);
    }

    if (db && userPhone) {
      const unsub = onSnapshot(doc(db, 'dispatch_qrs', userPhone), (snap) => {
        if (snap.exists() && snap.data()?.qrCode) {
          const remoteQr = snap.data().qrCode;
          setWechatQrUrl(remoteQr);
          localStorage.setItem(userKey, remoteQr);
          localStorage.setItem('dd_dispatch_wechat_qr', remoteQr);
        }
      });
      return () => unsub();
    }
  }, [userPhone]);

  // Modals & UI states
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [showBillingDetailModal, setShowBillingDetailModal] = useState(false);
  const [isDisclaimerAgreed, setIsDisclaimerAgreed] = useState(true);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [showOrderCenterModal, setShowOrderCenterModal] = useState(false);
  const [showTeamManagementModal, setShowTeamManagementModal] = useState(false);
  const [showApplicantApprovalModal, setShowApplicantApprovalModal] = useState(false);
  const [showConfirmClearOrdersModal, setShowConfirmClearOrdersModal] = useState(false);

  const handleExecuteClearAllOrders = async () => {
    setShowConfirmClearOrdersModal(false);
    // 1. Instantly reset local state in UI
    setAllDispatchedOrders([]);

    // 2. Clear backend collections
    try {
      await clearCollection('merchant_orders');
      await clearCollection('valet_orders');

      const allDocIds = new Set<string>();
      allDispatchedOrders.forEach((item: any) => {
        if (item?.id) allDocIds.add(String(item.id));
        if (item?.orderId) allDocIds.add(String(item.orderId));
      });

      if (db) {
        try {
          const snapshot = await getDocs(collection(db, 'merchant_orders'));
          snapshot.forEach((docSnap) => {
            if (docSnap?.id) allDocIds.add(String(docSnap.id));
          });
          const snapshotValet = await getDocs(collection(db, 'valet_orders'));
          snapshotValet.forEach((docSnap) => {
            if (docSnap?.id) allDocIds.add(String(docSnap.id));
          });
        } catch (e) {
          console.warn('getDocs error when clearing orders:', e);
        }
      }

      const deletePromises: Promise<void>[] = [];
      allDocIds.forEach((docId) => {
        deletePromises.push((async () => {
          try {
            await deleteDoc(doc(db, 'merchant_orders', docId));
            await deleteDoc(doc(db, 'valet_orders', docId));
          } catch (_) {}
        })());
      });
      await Promise.all(deletePromises);
    } catch (err) {
      console.warn('Error clearing merchant_orders collection:', err);
    }

    // 3. Wipe all local storage caches for orders
    try {
      localStorage.removeItem('dd_merchant_orders_v2');
      localStorage.removeItem('dd_merchant_orders');
      localStorage.removeItem('dd_active_orders');
      localStorage.removeItem('dd_passenger_links');
      localStorage.removeItem('dd_valet_orders');

      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('mock_db_merchant_orders_') ||
          key.startsWith('mock_db_valet_orders_') ||
          key.startsWith('dd_merchant_order') ||
          key.startsWith('dd_driver_orders') ||
          key.startsWith('ord_') ||
          key.startsWith('valet_order')
        )) {
          localStorage.removeItem(key);
        }
      }
    } catch (_) {}

    window.dispatchEvent(new CustomEvent('merchant_orders_updated'));
    window.dispatchEvent(new CustomEvent('valet_orders_updated'));
    onShowToast('🧹 商户代叫订单中心所有订单已彻底一键清空！');
  };

  // Applicants for squad join approval (团队审核 - 申请审批)
  const [applicants, setApplicants] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('dd_applicants_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((a: any) => !['app-1', 'app-2', 'app-3'].includes(a.id));
        }
      }
    } catch (_) {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('dd_applicants_v2', JSON.stringify(applicants));
    } catch (_) {}
  }, [applicants]);

  // Real-time synchronization of team name with Firestore city_configs & team_config
  useEffect(() => {
    const updateTeamNameFromConfigs = () => {
      const norm = (currentCity || '银川市').replace(/市$/, '').trim();
      const savedCityConfigs = localStorage.getItem('dd_city_configs_v2');
      if (savedCityConfigs) {
        try {
          const map = JSON.parse(savedCityConfigs);
          const cfg = map[norm] || map[`${norm}市`] || map[currentCity];
          if (cfg && Array.isArray(cfg.squadNames) && cfg.squadNames.length > 0) {
            setTeamName(cfg.squadNames[0]);
            setTempTeamName(cfg.squadNames[0]);
            localStorage.setItem('dd_dispatch_team_name', cfg.squadNames[0]);
            localStorage.setItem('dd_team_config_name', cfg.squadNames[0]);
            return;
          }
        } catch (e) {}
      }
      const savedTeamName = localStorage.getItem('dd_dispatch_team_name') || localStorage.getItem('dd_team_config_name');
      if (savedTeamName) {
        setTeamName(savedTeamName);
        setTempTeamName(savedTeamName);
      }
    };

    updateTeamNameFromConfigs();

    let unsubCity = () => {};
    let unsubTeam = () => {};

    if (db) {
      unsubCity = onSnapshot(doc(db, 'config', 'city_configs'), (snap) => {
        if (snap.exists() && snap.data().configs) {
          const configs = snap.data().configs;
          localStorage.setItem('dd_city_configs_v2', JSON.stringify(configs));
          const norm = (currentCity || '银川市').replace(/市$/, '').trim();
          const cfg = configs[norm] || configs[`${norm}市`] || configs[currentCity];
          if (cfg && Array.isArray(cfg.squadNames) && cfg.squadNames.length > 0) {
            setTeamName(cfg.squadNames[0]);
            setTempTeamName(cfg.squadNames[0]);
            localStorage.setItem('dd_dispatch_team_name', cfg.squadNames[0]);
            localStorage.setItem('dd_team_config_name', cfg.squadNames[0]);
          }
        }
      });

      unsubTeam = onSnapshot(doc(db, 'config', 'team_config'), (snap) => {
        if (snap.exists() && snap.data().teamName) {
          const name = snap.data().teamName;
          setTeamName(name);
          setTempTeamName(name);
          localStorage.setItem('dd_dispatch_team_name', name);
          localStorage.setItem('dd_team_config_name', name);
        }
      });
    }

    const handleTeamEvent = () => updateTeamNameFromConfigs();
    window.addEventListener('teamNameUpdated', handleTeamEvent);
    window.addEventListener('cityConfigsUpdated', handleTeamEvent);

    return () => {
      unsubCity();
      unsubTeam();
      window.removeEventListener('teamNameUpdated', handleTeamEvent);
      window.removeEventListener('cityConfigsUpdated', handleTeamEvent);
    };
  }, [currentCity]);

  const pendingApplicantCount = applicants.filter(a => a.status === '待审核').length;

  const handleApproveApplicant = (id: string, name: string) => {
    if (!canReviewApplicants) {
      onShowToast('⚠️ 您暂无审批权限，仅【开发者司机、城市老板司机、城市管理司机、城市派单员司机】可以审核');
      return;
    }

    const applicantObj = applicants.find(a => a.id === id);
    const targetPhone = applicantObj?.phone || '';
    const currentAdminName = adminProfile.name || '李扬';
    const currentAdminRole = adminProfile.role || userRole || '开发者司机';

    // 1. Update applicants status
    setApplicants(prev => prev.map(a => a.id === id ? { 
      ...a, 
      status: '已通过',
      approvedBy: currentAdminName,
      approvedRole: currentAdminRole,
      approvalTime: new Date().toLocaleString()
    } : a));

    // 2. Instantly update squadMembers state ("秒自动更新到团队管理页面的全部成员列表里")
    setSquadMembers(prev => {
      const exists = prev.some(m => m.phone === targetPhone || m.id === id);
      if (exists) {
        return prev.map(m => (m.phone === targetPhone || m.id === id) ? {
          ...m,
          name,
          role: m.role || '普通司机',
          status: '已通过',
          approvedBy: currentAdminName,
          approvedRole: currentAdminRole,
          note: applicantObj?.note || '',
          updatedAt: Date.now()
        } : m);
      }
      return [
        ...prev,
        {
          id: id || targetPhone,
          phone: targetPhone,
          name,
          role: '普通司机',
          status: '已通过',
          approvedBy: currentAdminName,
          approvedRole: currentAdminRole,
          note: applicantObj?.note || '',
          city: userTeamCity || currentCity || '银川市',
          createdAt: Date.now()
        }
      ];
    });

    // 3. Save to Firestore
    if (targetPhone) {
      setDoc(doc(db, 'squad_members', targetPhone), {
        name,
        phone: targetPhone,
        role: '普通司机',
        status: '已通过',
        approvedBy: currentAdminName,
        approvedRole: currentAdminRole,
        note: applicantObj?.note || '',
        lastUpdatedTime: new Date().toLocaleString()
      }, { merge: true }).catch(() => {});

      setDoc(doc(db, 'driver_users', targetPhone), {
        driverName: name,
        userRole: '普通司机',
        role: '普通司机',
        status: '已通过',
        lastUpdatedTime: new Date().toLocaleString()
      }, { merge: true }).catch(() => {});
    }

    onShowToast(`🎉 【${currentAdminName} (${currentAdminRole})】已成功通过【${name}】的加入申请！`);
  };

  const handleRejectApplicant = (id: string, name: string) => {
    if (!canReviewApplicants) {
      onShowToast('⚠️ 您暂无审批权限，仅【开发者司机、城市老板司机、城市管理司机、城市派单员司机】可以审核');
      return;
    }

    const applicantObj = applicants.find(a => a.id === id);
    const targetPhone = applicantObj?.phone || '';
    const currentAdminName = adminProfile.name || '李扬';
    const currentAdminRole = adminProfile.role || userRole || '开发者司机';

    // 1. Update applicants status
    setApplicants(prev => prev.map(a => a.id === id ? { 
      ...a, 
      status: '已拒绝',
      approvedBy: currentAdminName,
      approvedRole: currentAdminRole,
      approvalTime: new Date().toLocaleString()
    } : a));

    // 2. Instantly update squadMembers state
    setSquadMembers(prev => {
      const exists = prev.some(m => m.phone === targetPhone || m.id === id);
      if (exists) {
        return prev.map(m => (m.phone === targetPhone || m.id === id) ? {
          ...m,
          name,
          status: '已拒绝',
          approvedBy: currentAdminName,
          approvedRole: currentAdminRole,
          rejectionReasons: applicantObj?.selectedReasons || [],
          updatedAt: Date.now()
        } : m);
      }
      return [
        ...prev,
        {
          id: id || targetPhone,
          phone: targetPhone,
          name,
          role: '普通司机',
          status: '已拒绝',
          approvedBy: currentAdminName,
          approvedRole: currentAdminRole,
          note: applicantObj?.note || '',
          rejectionReasons: applicantObj?.selectedReasons || [],
          createdAt: Date.now()
        }
      ];
    });

    // 3. Save to Firestore
    if (targetPhone) {
      setDoc(doc(db, 'squad_members', targetPhone), {
        name,
        phone: targetPhone,
        status: '已拒绝',
        approvedBy: currentAdminName,
        approvedRole: currentAdminRole,
        rejectionReasons: applicantObj?.selectedReasons || [],
        lastUpdatedTime: new Date().toLocaleString()
      }, { merge: true }).catch(() => {});
    }

    onShowToast(`❌ 【${currentAdminName} (${currentAdminRole})】已拒绝【${name}】的加入申请`);
  };
  
  // Management Team Modal states
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberCategoryTab, setMemberCategoryTab] = useState<'全部' | '管理层' | '司机'>('全部');
  
  // Order Center filter states
  const [orderCenterTab, setOrderCenterTab] = useState<'全部' | '呼叫中' | '服务中' | '已完成' | '已取消'>('全部');
  const [filterYear, setFilterYear] = useState('2026');
  const [filterMonth, setFilterMonth] = useState('07');
  const [filterDay, setFilterDay] = useState('31');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any>(null);

  // Full-page Start Location Search state
  const [showStartLocationSearch, setShowStartLocationSearch] = useState(false);
  const [originSearchText, setOriginSearchText] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState<any[]>([]);
  
  const [passengerCoords, setPassengerCoords] = useState<{ lat: number; lng: number }>({
    lat: 38.487167,
    lng: 106.23091
  });
  
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [buttonState, setButtonState] = useState<'idle' | 'processing' | 'success'>('idle');
  const [dispatchResult, setDispatchResult] = useState<any | null>(null);
  
  // Real active drivers from Firestore
  const [realDrivers, setRealDrivers] = useState<any[]>([]);
  const [squadPhones, setSquadPhones] = useState<string[]>([]);
  const [squadMembers, setSquadMembers] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('dd_squad_members_v2');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
  });

  const [removedMemberPhones, setRemovedMemberPhones] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dd_removed_squad_phones_v2');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
  });

  useEffect(() => {
    if (squadMembers && squadMembers.length > 0) {
      try {
        localStorage.setItem('dd_squad_members_v2', JSON.stringify(squadMembers));
      } catch (_) {}
    }
  }, [squadMembers]);
  const [adminProfile, setAdminProfile] = useState<{ name: string; avatar: string; role: string }>(() => {
    const savedName = localStorage.getItem('dd_admin_name') || localStorage.getItem('dd_user_name') || '李扬';
    return {
      name: savedName,
      avatar: driverAvatar,
      role: userRole || '开发者司机'
    };
  });

  const [isEditingAdminName, setIsEditingAdminName] = useState(false);
  const [tempAdminName, setTempAdminName] = useState('');

  // Check if user is a management team member: 开发者司机/开发者, 城市老板司机/城市老板, 城市管理司机/城市管理, 城市派单员司机/城市派单员
  const isManagementRole = Boolean(
    userPhone === '15509601222' || 
    userRole === '开发者司机' || 
    userRole === '开发者' || 
    userRole === '总指挥官' || 
    userRole === '城市老板司机' || 
    userRole === '城市老板' || 
    userRole === '城市管理司机' || 
    userRole === '城市管理' ||
    userRole === '城市派单员司机' ||
    userRole === '城市派单员' ||
    (adminProfile?.role && (
      adminProfile.role.includes('开发者') ||
      adminProfile.role.includes('老板') ||
      adminProfile.role.includes('管理') ||
      adminProfile.role.includes('指挥') ||
      adminProfile.role.includes('派单')
    ))
  );

  // Permission check for reviewing applicant join requests:
  // 开发者司机、城市老板司机、城市管理司机、城市派单员司机 均具备审核审批权限
  const canReviewApplicants = Boolean(
    userPhone === '15509601222' ||
    ['开发者司机', '开发者', '总指挥官', '城市老板司机', '城市老板', '城市管理司机', '城市管理', '城市派单员司机', '城市派单员'].includes(userRole) ||
    ['开发者司机', '城市老板司机', '城市管理司机', '城市派单员司机'].includes(adminProfile.role)
  );

  // Member list inline editing states
  const [editingMemberPhone, setEditingMemberPhone] = useState<string | null>(null);
  const [editingMemberNameTemp, setEditingMemberNameTemp] = useState<string>('');

  // Helper to check allowed roles that current user can assign to target member
  const getAllowedAssignRoles = (targetMember: any) => {
    const isDevOp = userPhone === '15509601222' || userRole === '开发者司机' || userRole === '开发者' || userRole === '总指挥官';
    const isBossOp = userRole === '城市老板司机' || userRole === '城市老板';
    const isManagerOp = userRole === '城市管理司机' || userRole === '城市管理';

    // 开发者司机 can assign any role in any city
    if (isDevOp) {
      return ['开发者司机', '城市老板司机', '城市管理司机', '城市派单员司机', '普通司机'];
    }

    const opCity = userTeamCity || currentCity || '银川市';
    const memberCity = targetMember.city || opCity;

    // City Boss & Manager can ONLY set drivers in their own city
    if (opCity && memberCity && opCity !== memberCity) {
      return [];
    }

    // 城市老板司机 can assign: 城市老板司机, 城市管理司机, 城市派单员司机, 普通司机 (cannot assign 开发者司机)
    if (isBossOp) {
      return ['城市老板司机', '城市管理司机', '城市派单员司机', '普通司机'];
    }

    // 城市管理司机 can assign: 城市派单员司机, 普通司机
    if (isManagerOp) {
      return ['城市派单员司机', '普通司机'];
    }

    // 城市派单员司机 & 普通司机 cannot assign roles
    return [];
  };

  // Save modified member name in member list (up to 8 Chinese characters)
  const handleSaveMemberName = async (targetPhone: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      onShowToast('⚠️ 成员名字不能为空');
      return;
    }

    const finalName = trimmed.slice(0, 8); // Max 8 Chinese characters

    // Sync adminProfile if editing self
    if (targetPhone === userPhone || targetPhone === '15509601222') {
      setAdminProfile(prev => ({ ...prev, name: finalName }));
      localStorage.setItem('dd_admin_name', finalName);
      localStorage.setItem('dd_user_name', finalName);
      if (userPhone) {
        localStorage.setItem(`dd_custom_app_name_${userPhone}`, finalName);
      }
    }

    // Update local React state immediately so UI updates without external database/network dependency
    setSquadMembers(prev => {
      const exists = prev.some(m => m.phone === targetPhone);
      if (exists) {
        return prev.map(m => m.phone === targetPhone ? { ...m, name: finalName, driverName: finalName } : m);
      }
      return [...prev, { phone: targetPhone, name: finalName, driverName: finalName }];
    });

    // Also sync to applicants list if present
    setApplicants(prev => prev.map(a => (a.phone === targetPhone || a.id === targetPhone) ? { ...a, name: finalName } : a));

    try {
      if (targetPhone) {
        setDoc(doc(db, 'squad_members', targetPhone), {
          name: finalName,
          lastUpdatedTime: new Date().toLocaleString()
        }, { merge: true }).catch(() => {});

        setDoc(doc(db, 'driver_users', targetPhone), {
          driverName: finalName,
          lastUpdatedTime: new Date().toLocaleString()
        }, { merge: true }).catch(() => {});
      }
    } catch (_) {}

    onShowToast(`🎉 已成功将成员名字修改为：「${finalName}」！`);
    setEditingMemberPhone(null);
  };

  // Update member role in member list
  const handleUpdateMemberRole = async (targetMember: any, newRole: string) => {
    const allowed = getAllowedAssignRoles(targetMember);
    if (!allowed.includes(newRole)) {
      onShowToast(`❌ 权限不足：您无权将角色设置为【${newRole}】`);
      return;
    }

    // Update local React state immediately so UI updates without external database/network dependency
    setSquadMembers(prev => {
      const exists = prev.some(m => m.phone === targetMember.phone);
      if (exists) {
        return prev.map(m => m.phone === targetMember.phone ? { ...m, role: newRole, userRole: newRole } : m);
      }
      return [...prev, { ...targetMember, role: newRole, userRole: newRole }];
    });

    // Also sync to applicants list if present
    setApplicants(prev => prev.map(a => (a.phone === targetMember.phone || a.id === targetMember.id) ? { ...a, role: newRole } : a));

    try {
      if (targetMember.phone) {
        setDoc(doc(db, 'squad_members', targetMember.phone), {
          role: newRole,
          lastUpdatedTime: new Date().toLocaleString()
        }, { merge: true }).catch(() => {});

        setDoc(doc(db, 'driver_users', targetMember.phone), {
          userRole: newRole,
          role: newRole,
          lastUpdatedTime: new Date().toLocaleString()
        }, { merge: true }).catch(() => {});
      }
    } catch (_) {}

    onShowToast(`🎉 已成功将【${targetMember.name}】的角色修改为：${newRole}`);
  };

  const handleSaveAdminName = async () => {
    const trimmed = tempAdminName.trim();
    if (!trimmed) {
      onShowToast('⚠️ 管理员名字不能为空');
      return;
    }

    const finalName = trimmed.slice(0, 8); // Max 8 Chinese characters

    setAdminProfile(prev => ({ ...prev, name: finalName }));
    localStorage.setItem('dd_admin_name', finalName);
    localStorage.setItem('dd_user_name', finalName);

    if (userPhone) {
      try {
        setDoc(doc(db, 'driver_users', userPhone), {
          driverName: finalName,
          lastUpdatedTime: new Date().toLocaleString()
        }, { merge: true }).catch(() => {});

        setDoc(doc(db, 'squad_members', userPhone), {
          name: finalName
        }, { merge: true }).catch(() => {});
      } catch (err) {
        console.error('Failed to update admin name:', err);
      }
    }

    setIsEditingAdminName(false);
    onShowToast(`🎉 已成功修改名字为：「${finalName}」！`);
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Real-time listener for all dispatched orders
  const [allDispatchedOrders, setAllDispatchedOrders] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'merchant_orders'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.status !== 'cancelled') {
          list.push({
            id: docSnap.id,
            orderId: docSnap.id,
            statusCategory: data.statusCategory || (data.status === 'hall' ? '呼叫中' : data.status === 'completed' ? '已完成' : '服务中'),
            ...data
          });
        }
      });

      // Merge local storage dd_merchant_orders_v2 for local fallback (including both real and virtual orders)
      try {
        const saved = JSON.parse(localStorage.getItem('dd_merchant_orders_v2') || '[]');
        saved.forEach((item: any) => {
          if (
            item && 
            item.status !== 'cancelled' && 
            !list.some(x => x.id === item.id || x.orderNo === item.orderNo || x.id === item.orderId)
          ) {
            list.push({
              id: item.id || item.orderId,
              orderId: item.id || item.orderId,
              statusCategory: item.statusCategory || (item.status === 'hall' ? '呼叫中' : '服务中'),
              ...item
            });
          }
        });
      } catch (_) {}

      list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      const totalCount = list.length;
      list.forEach((item, idx) => {
        item.orderNo = formatMerchantOrderNo(item, idx, totalCount);
      });
      setAllDispatchedOrders(list);
    });

    return () => unsubscribe();
  }, []);

  // Fetch real drivers & current user profile
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'driver_users'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.isBanned) return;
        
        list.push({
          phone: docSnap.id,
          name: data.driverName || '在线代驾司机',
          lat: data.lat || (38.487167 + (Math.random() - 0.5) * 0.03),
          lng: data.lng || (106.23091 + (Math.random() - 0.5) * 0.03),
          drivingYears: data.drivingYears || 5,
          isOnline: data.isOnline === true,
          onlineOrdersEnabled: data.onlineOrdersEnabled === true,
          lastUpdatedTime: data.lastUpdatedTime || ''
        });

        if (userPhone && docSnap.id === userPhone) {
          setAdminProfile(prev => ({
            ...prev,
            name: data.driverName || prev.name,
            avatar: data.avatarUrl || prev.avatar
          }));
        }
      });
      setRealDrivers(list);
    });
    return () => unsubscribe();
  }, [userPhone]);

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

        if (userPhone && docSnap.id === userPhone) {
          const mData = docSnap.data();
          if (mData.name) {
            setAdminProfile(prev => ({ ...prev, name: mData.name }));
          }
        }
      });
      setSquadPhones(phones);
      setSquadMembers(list);
    });
    return () => unsubscribe();
  }, [userPhone]);

  // Requirement 1: 中国大陆每个城市，商户代叫，获得审批成功加入小队的司机（包括管理团队人员），每20秒自动上传一次当前位置
  useEffect(() => {
    if (!userPhone) return;

    const isManagementRole = [
      '开发者司机', '城市老板司机', '城市管理司机', '城市派单员司机', '总指挥官', '开发者'
    ].includes(adminProfile?.role || userRole || '');

    const isApprovedMember = squadMembers.some((m: any) => 
      m.phone === userPhone && ['已通过', 'approved', '通过'].includes(m.status || m.approvalStatus)
    ) || squadPhones.includes(userPhone);

    if (!isManagementRole && !isApprovedMember) return;

    const reportLocation = () => {
      const doReport = (lat: number, lng: number) => {
        const timeStr = new Date().toLocaleString();
        const locData = {
          driverName: adminProfile?.name || '代驾司机',
          phone: userPhone,
          lat,
          lng,
          city: currentCity || '银川市',
          isOnline: true,
          onlineOrdersEnabled: true,
          userRole: adminProfile?.role || userRole || '普通司机',
          lastUpdatedTime: timeStr,
          lastLocationTime: Date.now()
        };

        if (db) {
          setDoc(doc(db, 'driver_users', userPhone), locData, { merge: true }).catch(() => {});
          setDoc(doc(db, 'squad_members', userPhone), {
            lat,
            lng,
            city: currentCity || '银川市',
            lastLocationTime: Date.now(),
            lastUpdatedTime: timeStr
          }, { merge: true }).catch(() => {});
        }

        try {
          localStorage.setItem(`dd_driver_loc_${userPhone}`, JSON.stringify(locData));
        } catch (_) {}
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => doReport(pos.coords.latitude, pos.coords.longitude),
          () => doReport(passengerCoords.lat, passengerCoords.lng),
          { enableHighAccuracy: true, timeout: 6000 }
        );
      } else {
        doReport(passengerCoords.lat, passengerCoords.lng);
      }
    };

    reportLocation();
    const intervalId = setInterval(reportLocation, 20000); // 20秒自动上传一次当前位置
    return () => clearInterval(intervalId);
  }, [userPhone, squadMembers, squadPhones, adminProfile, userRole, currentCity, passengerCoords]);

  // Requirement 4: 选单大厅里20分钟没有司机接单则自动取消订单
  useEffect(() => {
    const check20MinHallTimeout = async () => {
      const now = Date.now();
      const TIMEOUT_20_MIN = 20 * 60 * 1000; // 20分钟 = 1,200,000毫秒

      setAllDispatchedOrders(prevOrders => {
        let changed = false;
        const updatedList = prevOrders.map(ord => {
          const isHallOrder = ord.status === 'hall' || ord.statusCategory === '呼叫中' || ord.status === 'submitted';
          const isNotFinal = ord.status !== 'cancelled' && ord.status !== 'completed' && ord.status !== 'claimed';
          const orderAge = ord.timestamp ? (now - ord.timestamp) : 0;

          if (isHallOrder && isNotFinal && orderAge >= TIMEOUT_20_MIN) {
            changed = true;
            const cancelledData = {
              ...ord,
              status: 'cancelled',
              statusCategory: '已取消',
              cancelReason: '选单大厅20分钟无人接单，系统自动取消',
              cancelledAt: now
            };

            if (db && ord.id) {
              setDoc(doc(db, 'merchant_orders', ord.id), {
                status: 'cancelled',
                statusCategory: '已取消',
                cancelReason: '选单大厅20分钟无人接单，系统自动取消',
                cancelledAt: now
              }, { merge: true }).catch(() => {});
            }

            return cancelledData;
          }
          return ord;
        });

        if (changed) {
          try {
            const localSaved = JSON.parse(localStorage.getItem('dd_merchant_orders_v2') || '[]');
            const updatedSaved = localSaved.map((item: any) => {
              const isHallOrder = item.status === 'hall' || item.statusCategory === '呼叫中';
              const orderAge = item.timestamp ? (now - item.timestamp) : 0;
              if (isHallOrder && item.status !== 'cancelled' && orderAge >= TIMEOUT_20_MIN) {
                return {
                  ...item,
                  status: 'cancelled',
                  statusCategory: '已取消',
                  cancelReason: '选单大厅20分钟无人接单，系统自动取消'
                };
              }
              return item;
            });
            localStorage.setItem('dd_merchant_orders_v2', JSON.stringify(updatedSaved));
            window.dispatchEvent(new CustomEvent('merchant_orders_updated'));
          } catch (_) {}
        }

        return updatedList;
      });
    };

    check20MinHallTimeout();
    const timer = setInterval(check20MinHallTimeout, 10000); // 每10秒检查一次
    return () => clearInterval(timer);
  }, []);

  // Helper to calculate member ID: developer default 888888, first management member 000001, subsequent squad members 000002, 000003, etc.
  const getSquadMemberId = (phone: string | null) => {
    // 1. Developer ID is fixed at 888888 for phone 15509601222 or developer role
    if (phone === '15509601222' || userRole === '开发者' || userRole === '总指挥官') {
      return '888888';
    }

    if (!phone) return '000001';

    // 2. Filter out developer from squadMembers list
    const nonDevMembers = squadMembers.filter(m => m.phone !== '15509601222' && m.role !== '开发者' && m.role !== '总指挥官');

    // Sort squadMembers by join time ascending
    const sorted = [...nonDevMembers].sort((a, b) => {
      const getTs = (m: any) => {
        const val = m.addedAt || m.joinedAt || m.timestamp || m.createdAt || m.joinTime;
        if (!val) return 0;
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
          const parsed = Date.parse(val);
          return isNaN(parsed) ? 0 : parsed;
        }
        if (val.seconds) return val.seconds * 1000;
        return 0;
      };
      return getTs(a) - getTs(b);
    });

    const index = sorted.findIndex(m => m.phone === phone);
    if (index >= 0) {
      return String(index + 1).padStart(6, '0');
    }

    // Fallback if current user is not yet recorded in squad_members array
    if (nonDevMembers.length > 0) {
      return String(nonDevMembers.length + 1).padStart(6, '0');
    }

    return '000001';
  };

  // Auto-detect driver network IP city location via AMap / IP API
  useEffect(() => {
    let isMounted = true;

    const detectCityByIp = () => {
      const AMap = (window as any).AMap;
      if (AMap && AMap.plugin) {
        AMap.plugin('AMap.CitySearch', () => {
          const citySearch = new AMap.CitySearch();
          citySearch.getLocalCity((status: string, result: any) => {
            if (isMounted && status === 'complete' && result && result.city) {
              setCurrentCity(result.city);
            }
          });
        });
      }
    };

    detectCityByIp();
    const timer = setTimeout(detectCityByIp, 800);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  // GPS Precise Location handler (triggers geolocation and reverse geocodes address name)
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);

  const handleFetchGPSLocation = (silent: boolean = false) => {
    setIsLocatingGPS(true);
    if (!silent) {
      onShowToast('🌐 正在获取手机GPS精准定位...');
    }

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setPassengerCoords({ lat, lng });

          const AMap = (window as any).AMap;
          if (AMap) {
            AMap.plugin(['AMap.Geocoder', 'AMap.convertFrom'], () => {
              AMap.convertFrom([lng, lat], 'gps', (status: string, result: any) => {
                const searchLng = (status === 'complete' && result?.locations?.[0]) ? result.locations[0].lng : lng;
                const searchLat = (status === 'complete' && result?.locations?.[0]) ? result.locations[0].lat : lat;
                
                setPassengerCoords({ lat: searchLat, lng: searchLng });

                const geocoder = new AMap.Geocoder({ city: currentCity || '银川市' });
                geocoder.getAddress([searchLng, searchLat], (geoStatus: string, geoResult: any) => {
                  setIsLocatingGPS(false);
                  if (geoStatus === 'complete' && geoResult?.regeocode?.formattedAddress) {
                    const formatted = geoResult.regeocode.formattedAddress;
                    setPassengerAddress(formatted);
                    onShowToast(`📍 手机GPS精准定位成功：${formatted}`);
                  } else {
                    onShowToast(`📍 手机GPS精准定位成功`);
                  }
                });
              });
            });
          } else {
            setIsLocatingGPS(false);
          }
        },
        (error) => {
          console.warn('GPS location permission denied or failed:', error);
          setIsLocatingGPS(false);
          
          // Fallback to AMap Geolocation plugin
          const AMap = (window as any).AMap;
          if (AMap) {
            AMap.plugin('AMap.Geolocation', () => {
              const geolocation = new AMap.Geolocation({
                enableHighAccuracy: true,
                timeout: 8000
              });
              geolocation.getCurrentPosition((status: string, result: any) => {
                if (status === 'complete' && result?.formattedAddress) {
                  setPassengerAddress(result.formattedAddress);
                  if (result.position) {
                    setPassengerCoords({ lat: result.position.lat, lng: result.position.lng });
                  }
                  onShowToast(`📍 高精度定位成功：${result.formattedAddress}`);
                } else if (!silent) {
                  onShowToast('📍 GPS定位超时，请手动点击商家推荐或搜索起点');
                }
              });
            });
          } else if (!silent) {
            onShowToast('📍 GPS定位超时，请手动点击商家推荐或搜索起点');
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setIsLocatingGPS(false);
      if (!silent) {
        onShowToast('⚠️ 当前设备或浏览器不支持获取手机GPS定位');
      }
    }
  };

  // Trigger GPS positioning automatically on webpage / component load
  useEffect(() => {
    handleFetchGPSLocation(false);
  }, []);

  // Dynamically load AMap JS API for AutoComplete support
  useEffect(() => {
    let script = document.getElementById('amap-js-api-v2') as HTMLScriptElement || document.querySelector('script[src*="webapi.amap.com"]');

    if (!(window as any).AMap && !script) {
      script = document.createElement('script');
      script.id = 'amap-js-api-v2';
      script.src = 'https://webapi.amap.com/maps?v=2.0&key=4143e567d55bbc1855231f9637efd6b0';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
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

  // Suggestions search on originSearchText change for full page modal
  useEffect(() => {
    const AMap = (window as any).AMap;
    if (!AMap || !originSearchText.trim() || !showStartLocationSearch) {
      setOriginSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      AMap.plugin('AMap.AutoComplete', () => {
        const auto = new AMap.AutoComplete({
          city: userTeamCity || '银川市',
          citylimit: false
        });
        auto.search(originSearchText, (status: string, result: any) => {
          if (status === 'complete' && result.tips) {
            setOriginSuggestions(result.tips.filter((t: any) => t.name));
          } else {
            setOriginSuggestions([]);
          }
        });
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [originSearchText, userTeamCity, showStartLocationSearch]);

  // Handle Team Name Change
  const handleSaveTeamName = () => {
    if (!tempTeamName.trim()) return;
    const newName = tempTeamName.trim();
    setTeamName(newName);
    localStorage.setItem('dd_dispatch_team_name', newName);
    localStorage.setItem('dd_team_config_name', newName);

    // Also update city_configs for currentCity
    const norm = (currentCity || '银川市').replace(/市$/, '').trim();
    const saved = localStorage.getItem('dd_city_configs_v2');
    let cityMap: Record<string, any> = {};
    if (saved) {
      try { cityMap = JSON.parse(saved); } catch(e){}
    }
    const currCityCfg = cityMap[norm] || {
      online_app_enabled: false,
      merchant_dispatch_enabled: false,
      squad_management_enabled: false,
      squadNames: []
    };
    const updatedNames = Array.isArray(currCityCfg.squadNames) && currCityCfg.squadNames.length > 0
      ? [newName, ...currCityCfg.squadNames.filter((s: string) => s !== newName)]
      : [newName];
    cityMap[norm] = {
      ...currCityCfg,
      squadNames: updatedNames
    };
    localStorage.setItem('dd_city_configs_v2', JSON.stringify(cityMap));

    window.dispatchEvent(new Event('teamNameUpdated'));
    window.dispatchEvent(new CustomEvent('cityConfigsUpdated', { detail: cityMap }));

    if (db) {
      setDoc(doc(db, 'config', 'team_config'), {
        teamName: newName,
        updatedAt: new Date().toISOString(),
        setBy: userPhone || '管理员'
      }, { merge: true }).catch(() => {});

      setDoc(doc(db, 'config', 'city_configs'), {
        configs: cityMap
      }, { merge: true }).catch(() => {});
    }
    setIsEditingTeamName(false);
    onShowToast('✓ 已更新小队名称');
  };

  // Handle Image Upload for Payment QR with Auto-compression & PNG conversion
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB');
      return;
    }

    try {
      const pngDataUrl = await compressAndConvertToPng(file);
      setWechatQrUrl(pngDataUrl);

      const userKey = userPhone ? `dd_dispatch_wechat_qr_${userPhone}` : 'dd_dispatch_wechat_qr';
      localStorage.setItem(userKey, pngDataUrl);
      localStorage.setItem('dd_dispatch_wechat_qr', pngDataUrl);

      if (db && userPhone) {
        await setDoc(doc(db, 'dispatch_qrs', userPhone), {
          qrCode: pngDataUrl,
          dispatchedByPhone: userPhone,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      onShowToast('✓ 代叫费微信收款码已压缩并存入服务器(PNG)');
    } catch (err) {
      console.error('Failed to compress QR image:', err);
      alert('图片处理失败，请重试');
    }
  };

  // Combine real drivers
  const getCombinedDrivers = () => {
    let onlineRealDrivers = realDrivers.filter(d => d.isOnline === true);

    // Ensure currently logged-in driver is included if online
    const localIsOnline = typeof window !== 'undefined' ? localStorage.getItem('dd_is_online') === 'true' : false;
    if (userPhone && localIsOnline && !onlineRealDrivers.some(d => d.phone === userPhone)) {
      const latStr = typeof window !== 'undefined' ? localStorage.getItem('dd_bg_driver_coords_lat') : null;
      const lngStr = typeof window !== 'undefined' ? localStorage.getItem('dd_bg_driver_coords_lng') : null;
      onlineRealDrivers.push({
        phone: userPhone,
        name: adminProfile.name || '代驾司机',
        lat: latStr ? parseFloat(latStr) : passengerCoords.lat,
        lng: lngStr ? parseFloat(lngStr) : passengerCoords.lng,
        isOnline: true,
        onlineOrdersEnabled: true,
        role: adminProfile.role || '开发者司机'
      });
    }

    let baseList = onlineRealDrivers;

    const listWithDistance = baseList.map(d => ({
      ...d,
      distance: calculateDistance(passengerCoords.lat, passengerCoords.lng, d.lat, d.lng)
    }));

    listWithDistance.sort((a, b) => a.distance - b.distance);
    return listWithDistance;
  };

  const driversList = getCombinedDrivers();
  const closestDriver = driversList[0];

  // One-Key Dispatch Handler (3km Radius & Order Selection Hall logic)
  const handleOneKeyDispatch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passengerAddress.trim() || !passengerPhone.trim()) {
      onShowToast('❌ 请先完整填写代驾商家起点和乘客手机号码！');
      return;
    }

    if (!isDisclaimerAgreed) {
      onShowToast('❌ 请先勾选并同意《代叫代驾服务特别免责条款》！');
      return;
    }

    setIsDispatching(true);
    setButtonState('processing');
    setDispatchResult(null);

    const finalPhone = passengerPhone.trim() || '未填写 (匿名代开单)';
    const ts = Date.now();
    const dt = new Date(ts);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    const hh = String(dt.getHours()).padStart(2, '0');
    const min = String(dt.getMinutes()).padStart(2, '0');

    const dateKey = `${yyyy}${mm}${dd}`;
    const storageKey = `dd_merchant_order_seq_${dateKey}`;
    let seq = 1;
    try {
      const savedSeq = parseInt(localStorage.getItem(storageKey) || '0', 10);
      seq = savedSeq + 1;
      localStorage.setItem(storageKey, String(seq));
    } catch (_) {}

    const seqStr = String(seq).padStart(5, '0');
    const formattedOrderNo = `YC${yyyy}${mm}${dd}${hh}${min}${seqStr}`;
    const orderId = 'MO_' + ts;

    setTimeout(async () => {
      try {
        // Helper to verify driver eligibility for orders
        const isDriverEligible = (d: any) => {
          const phone = d.phone;
          if (phone && phone === userPhone) {
            return true;
          }
          const role = d.role || d.userRole || '普通司机';
          // 管理团队人员（开发者司机、城市老板司机、城市管理司机、城市派单员司机等）可以接收和接代叫订单，不用申请加入小队
          if (['开发者司机', '城市老板司机', '城市管理司机', '城市派单员司机', '总指挥官', '开发者'].includes(role)) {
            return true;
          }
          // 检查是否为已审批通过的小队成员
          if (phone && squadPhones.includes(phone)) {
            const sm = squadMembers.find((m: any) => m.phone === phone);
            if (sm && ['已通过', 'approved', '通过'].includes(sm.status || sm.approvalStatus)) {
              return true;
            }
          }
          try {
            const saved = localStorage.getItem('dd_squad_members_v2');
            if (saved) {
              const members = JSON.parse(saved);
              const m = members.find((mem: any) => mem.phone === phone);
              if (m && ['已通过', 'approved', '通过'].includes(m.status || m.approvalStatus)) {
                return true;
              }
            }
          } catch (_) {}
          return false;
        };

        // Find online free drivers within 3km (3000m) who are eligible
        const allCandidateDrivers = getCombinedDrivers();
        const driversWithin3km = allCandidateDrivers.filter(d => {
          const distMeters = (d.distance || 0) * 1000;
          const isFree = !d.isBusy; // 空闲司机：未在接单或报单状态
          const isEligible = isDriverEligible(d);
          return distMeters <= 3000 && isFree && isEligible;
        });

        let chosenDriver: any = null;

        if (driversWithin3km.length > 0) {
          // Find minimum distance
          const minDist = Math.min(...driversWithin3km.map(d => d.distance || 0));
          // Find all drivers tied for closest distance
          const closestTied = driversWithin3km.filter(d => Math.abs((d.distance || 0) - minDist) < 0.001);
          // Pick one randomly if multiple tied
          chosenDriver = closestTied[Math.floor(Math.random() * closestTied.length)];
        }

        const newOrderData = {
          id: orderId,
          orderNo: formattedOrderNo,
          seqNumber: seq,
          passengerPhone: finalPhone,
          startLocation: passengerAddress,
          passengerLat: passengerCoords.lat,
          passengerLng: passengerCoords.lng,
          approxPrice: '未知',
          calculatedTotalFee: 40.00,
          estimatedPrice: '40.00',
          price: '¥40.00',
          orderRemark: orderRemark.trim() || '商户代叫',
          needScooter: needScooter,
          scheduledTime: scheduledTime,
          paymentQrCode: wechatQrUrl,
          dispatchedByPhone: userPhone || '',
          teamName: teamName,
          timestamp: ts,
          isValetOrder: true,
          isPlatformDispatch: true,
          status: chosenDriver ? 'dispatched' : 'hall',
          in_hall: chosenDriver ? false : true,
          statusCategory: chosenDriver ? '已指派' : '呼叫中',
          dispatchedDriverPhone: chosenDriver ? chosenDriver.phone : ''
        };

        // 1. Always save order to shared merchant_orders collection for global hall sync
        await setDoc(doc(db, 'merchant_orders', orderId), newOrderData);

        // 2. Sync to localStorage for local fallback
        try {
          const savedLocal = JSON.parse(localStorage.getItem('dd_merchant_orders_v2') || '[]');
          savedLocal.unshift(newOrderData);
          localStorage.setItem('dd_merchant_orders_v2', JSON.stringify(savedLocal.slice(0, 50)));
        } catch (_) {}

        if (chosenDriver) {
          // Dispatch directly to closest free driver within 3km
          await setDoc(doc(db, 'passenger_links', chosenDriver.phone), {
            ...newOrderData,
            status: 'submitted',
            orderId: orderId
          });

          setIsDispatching(false);
          setButtonState('success');
          setDispatchResult({
            driver: chosenDriver,
            passengerPhone: finalPhone,
            startLocation: passengerAddress,
            distance: chosenDriver.distance
          });

          onShowToast(`🎉 一键派单成功！已直接委派给方圆3公里内最近司机【${chosenDriver.name}】`);
        } else {
          // No free driver within 3km -> Order enters Order Selection Hall
          setIsDispatching(false);
          setButtonState('success');
          setDispatchResult({
            driver: { name: '选单大厅 (开放抢单)' },
            passengerPhone: finalPhone,
            startLocation: passengerAddress,
            distance: 0
          });

          onShowToast(`📢 方圆3公里内无空闲司机，商户代叫订单已自动发布至【选单大厅】！`);
        }

        setTimeout(() => {
          setButtonState('idle');
        }, 2500);

      } catch (err: any) {
        setIsDispatching(false);
        setButtonState('idle');
        alert("线上派单委派通道异常，原因: " + err.message);
      }
    }, 1200);
  };

  const currentQrUrl = wechatQrUrl;

  return (
    <div className="h-full w-full overflow-y-auto bg-[#f9f9f9] text-[#1a1c1c] font-sans relative flex flex-col select-text">
      
      {/* Hidden File Input for QR Code */}
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* TopAppBar */}
      <header className="sticky top-0 w-full z-40 bg-[#f9f9f9] border-b border-[#e2e2e2] flex items-center justify-between px-3 sm:px-5 h-14 shadow-sm shrink-0 relative">
        <div className="flex items-center gap-1.5 shrink-0">
          <h1 className="font-bold text-sm sm:text-base text-[#984800] tracking-tight">商户代叫派单系统</h1>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onClose && (
            <button 
              type="button"
              onClick={onClose} 
              className="p-1.5 rounded-full hover:bg-black/5 transition-colors text-[#584235] shrink-0 flex items-center gap-1"
              aria-label="关闭页面"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Main Form Content */}
      <main className="max-w-xl mx-auto pt-4 px-5 space-y-5 flex-1 w-full pb-8">
        
        {/* Section: Booking Form (商户代叫下单信息) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-[#1a1c1c] flex items-center gap-1.5">
              <Car className="w-5 h-5 text-[#984800] fill-[#ff7d00]/20" />
              <span>商户代叫下单信息</span>
            </h2>

            {/* Current City display tag */}
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <div 
                onClick={() => onShowToast(`📍 手机网络IP定位城市：${currentCity}\n🔒 派单规则：默认自动派单给【${teamName}】审批成功的同城普通司机及团队管理员`)}
                className="flex items-center gap-1 bg-[#ffdbc8]/90 hover:bg-[#ffdbc8] border border-[#dfc0af] px-2.5 py-1 rounded-full text-xs font-bold text-[#984800] shadow-xs cursor-pointer transition-all active:scale-95"
                title="点击查看城市与派单规则"
              >
                <MapPin className="w-3.5 h-3.5 text-[#ff7d00] shrink-0" />
                <span>当前城市：{currentCity}</span>
              </div>
            </div>
          </div>

          <div className="bg-white/95 border border-[#e0e0e0] rounded-2xl p-4 space-y-3.5 shadow-sm backdrop-blur-md">
            
            {/* Field 1: Pickup Point */}
            <div className="space-y-1 relative">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#584235] block">代驾商家起点</label>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFetchGPSLocation(false);
                  }}
                  disabled={isLocatingGPS}
                  className="text-[11px] font-bold text-[#ff7d00] flex items-center gap-1 hover:underline active:scale-95 transition-all cursor-pointer"
                >
                  <Navigation className={`w-3 h-3 ${isLocatingGPS ? 'animate-spin' : ''}`} />
                  <span>{isLocatingGPS ? 'GPS定位中...' : 'GPS重新定位'}</span>
                </button>
              </div>
              <div 
                onClick={() => {
                  setOriginSearchText(passengerAddress);
                  setShowStartLocationSearch(true);
                }}
                className="relative flex items-center bg-[#f3f3f3] border border-[#dfc0af] hover:border-[#ff7d00] rounded-xl h-11 px-3 cursor-pointer transition-all group select-none"
              >
                <MapPin className="w-4 h-4 text-[#ff7d00] shrink-0 mr-2" />
                <span className={`text-xs font-medium flex-1 truncate ${passengerAddress ? 'text-[#1a1c1c] font-bold' : 'text-[#8b7263]'}`}>
                  {passengerAddress || "点击搜索输入代驾商家起点..."}
                </span>

                {passengerAddress ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPassengerAddress('');
                      setSuggestions([]);
                    }}
                    className="px-2.5 py-1 text-xs font-bold text-[#8b7263] hover:text-[#984800] bg-white hover:bg-white/90 rounded-lg border border-[#dfc0af] shadow-xs transition-colors ml-2 shrink-0"
                  >
                    清空
                  </button>
                ) : (
                  <Search className="w-4 h-4 text-[#8b7263] shrink-0 ml-2 group-hover:text-[#ff7d00] transition-colors" />
                )}
              </div>
            </div>

            {/* Field 2: Passenger Phone */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#584235] block">乘客手机号码</label>
              <div className="relative flex items-center">
                <Phone className="w-4 h-4 absolute left-3 text-[#584235] shrink-0" />
                <input
                  type="tel"
                  value={passengerPhone}
                  onChange={(e) => setPassengerPhone(e.target.value)}
                  placeholder="请输入乘客手机号"
                  className="w-full h-11 pl-9 pr-4 bg-[#f3f3f3] border border-[#dfc0af] rounded-xl focus:ring-2 focus:ring-[#ff7d00]/30 focus:border-[#ff7d00] outline-none transition-all text-xs font-mono text-[#1a1c1c]"
                />
              </div>
            </div>

          </div>
        </section>

        {/* Section 3: Quick Options (预约时间 & 是否需要代步车) */}
        <section className="grid grid-cols-2 gap-3">
          
          {/* Card 1: 预约时间 */}
          <div 
            onClick={() => setShowTimePickerModal(true)}
            className="bg-white/95 border border-[#e0e0e0] rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer active:bg-[#f3f3f3] transition-colors shadow-sm"
          >
            <div className="w-10 h-10 rounded-full bg-[#cce5ff] flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-[#004b72]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#1a1c1c]">预约时间</div>
              <div className="text-[11px] text-[#584235] truncate mt-0.5">{scheduledTime}</div>
            </div>
          </div>

          {/* Card 2: 是否需要代步车 */}
          <div className="bg-white/95 border border-[#e0e0e0] rounded-2xl p-3.5 flex items-center gap-2.5 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-[#e2dfde] flex items-center justify-center shrink-0">
              <Bike className="w-5 h-5 text-[#474746]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-[#1a1c1c] truncate">是否需要代步车</div>
              <div className="flex gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => setNeedScooter(true)}
                  className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all ${
                    needScooter 
                      ? 'bg-[#ffdbc8] text-[#311300]' 
                      : 'bg-[#eeeeee] text-[#584235]'
                  }`}
                >
                  需要
                </button>
                <button
                  type="button"
                  onClick={() => setNeedScooter(false)}
                  className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all ${
                    !needScooter 
                      ? 'bg-[#ffdbc8] text-[#311300]' 
                      : 'bg-[#eeeeee] text-[#584235]'
                  }`}
                >
                  不需要
                </button>
              </div>
            </div>
          </div>

        </section>

        {/* Section 4: Payment QR Code (代叫费收款二维码) */}
        <section className="space-y-3">
          <h2 className="font-bold text-base text-[#1a1c1c] flex items-center gap-1.5">
            <QrCode className="w-5 h-5 text-[#984800]" />
            <span>代叫费收款二维码</span>
          </h2>

          <div className="bg-white border border-[#dfc0af]/60 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col items-center">
            {/* WeChat Payment Badge Header */}
            <div className="flex items-center gap-2 bg-[#f3f3f3] px-4 py-1.5 rounded-full border border-gray-200">
              <svg fill="none" height="18" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.477 2 2 6.015 2 10.97c0 2.81 1.442 5.315 3.69 6.963l-.46 1.72a.5.5 0 0 0 .668.59l2.12-.96c1.233.454 2.585.717 3.982.717 5.523 0 10-4.015 10-10.97C22 6.015 17.523 2 12 2z" fill="#07C160"/>
                <path d="M7.5 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm5 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" fill="white"/>
              </svg>
              <span className="text-xs font-bold text-gray-800">微信代叫费收款码</span>
            </div>

            {/* QR Code Container styled identically to payment confirmation page */}
            <div className="relative w-60 h-60 p-3 bg-white rounded-2xl border border-gray-200 shadow-inner flex items-center justify-center overflow-hidden">
              {wechatQrUrl ? (
                <img 
                  src={wechatQrUrl} 
                  alt="微信代叫费收款码" 
                  className="w-full h-full object-contain rounded-xl"
                />
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative z-10 w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-[#dfc0af] rounded-xl bg-gray-50/80 p-4 cursor-pointer hover:border-[#ff7d00] transition-colors"
                >
                  <QrCode className="w-12 h-12 text-[#ff7d00]/40 mb-2" />
                  <div className="bg-[#ff7d00] p-2 rounded-xl shadow-xs">
                    <Car className="w-5 h-5 text-white" />
                  </div>
                  <p className="mt-2 text-xs text-gray-700 font-bold text-center">
                    点击上传微信代叫费收款码
                  </p>
                  <p className="mt-0.5 text-[10px] text-gray-400 font-normal text-center">
                    图片自动压缩并转换为 PNG 格式
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#f3f3f3] rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-gray-600 shrink-0" />
              <span className="text-[11px] text-gray-600 font-semibold">实名收款 · 派单人员代叫费专属</span>
            </div>

            {wechatQrUrl && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-bold text-[#ff7d00] bg-[#ff7d00]/10 hover:bg-[#ff7d00]/20 px-4 py-1.5 rounded-full transition-all cursor-pointer"
              >
                更换微信代叫费收款码
              </button>
            )}

          </div>
        </section>

        {/* Dispatch Result Card */}
        {dispatchResult && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-left animate-in fade-in duration-300">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div className="space-y-1 flex-1 min-w-0">
                <h4 className="text-xs font-bold text-[#1a1c1c]">✓ 订单已成功同步指派至最邻近代驾司机</h4>
                <div className="text-[11px] text-[#584235] space-y-1 bg-white p-3 rounded-xl border border-[#e0e0e0]">
                  <p className="flex justify-between">
                    <span>承接司机：</span>
                    <span className="font-bold text-[#1a1c1c]">{dispatchResult.driver.name}</span>
                  </p>
                  <p className="flex justify-between">
                    <span>直线距离：</span>
                    <span className="font-bold text-[#ff7d00]">{(dispatchResult.distance * 1000).toFixed(0)} 米</span>
                  </p>
                  <p className="flex justify-between">
                    <span>乘客手机：</span>
                    <span className="font-mono text-[#1a1c1c]">{dispatchResult.passengerPhone}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Bottom Action Bar */}
      <footer className="sticky bottom-0 left-0 right-0 z-40 bg-white border-t border-[#e2e2e2] px-5 py-3 shadow-lg shrink-0 mt-auto">
        <div className="max-w-xl mx-auto space-y-2">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xs text-[#584235]">预估金额</span>
              <span className="text-base font-extrabold text-[#ff7d00]">自行协商价格</span>
            </div>
            <button 
              type="button"
              onClick={() => setShowBillingDetailModal(true)}
              className="text-xs font-bold text-[#584235] flex items-center gap-1 hover:text-[#ff7d00] transition-colors"
            >
              <span>计费详情</span>
              <Info className="w-4 h-4" />
            </button>
          </div>

          {/* 免责声明 Checkbox & Modal Trigger Group */}
          <div className="flex items-center justify-between text-xs py-1 px-1 bg-[#f9f9f9] rounded-lg border border-gray-200/60">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={isDisclaimerAgreed} 
                onChange={(e) => setIsDisclaimerAgreed(e.target.checked)} 
                className="w-4 h-4 text-[#ff7d00] focus:ring-[#ff7d00] rounded border-gray-300 accent-[#ff7d00] cursor-pointer"
              />
              <span className="text-[#584235] font-medium text-[11px]">我已阅读并同意</span>
            </label>
            <button 
              type="button"
              onClick={() => setShowDisclaimerModal(true)}
              className="text-[11px] font-bold text-[#ff7d00] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#ff7d00] shrink-0" />
              <span>《代叫代驾服务特别免责条款》</span>
            </button>
          </div>

          {(() => {
            const isFormValid = passengerAddress.trim().length > 0 && passengerPhone.trim().length > 0 && isDisclaimerAgreed;
            return (
              <button
                type="button"
                onClick={handleOneKeyDispatch}
                disabled={!isFormValid || isDispatching}
                className={`w-full h-13 font-bold text-base rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${
                  isFormValid && !isDispatching
                    ? 'bg-[#ff7d00] active:bg-[#e06d00] text-white cursor-pointer active:scale-[0.98]'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-80'
                }`}
              >
                {buttonState === 'processing' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>正在处理中...</span>
                  </>
                ) : buttonState === 'success' ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>订单发起成功</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 fill-current" />
                    <span>
                      {!passengerAddress.trim() && !passengerPhone.trim()
                        ? '一键发起代叫下单 (请输入起点及手机号)'
                        : !passengerAddress.trim()
                        ? '一键发起代叫下单 (请输入代驾起点)'
                        : !passengerPhone.trim()
                        ? '一键发起代叫下单 (请输入乘客手机号)'
                        : !isDisclaimerAgreed
                        ? '一键发起代叫下单 (请勾选免责声明)'
                        : '一键发起代叫下单'}
                    </span>
                  </>
                )}
              </button>
            );
          })()}

        </div>
      </footer>

      {/* Time Picker Modal */}
      {showTimePickerModal && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
              <h3 className="font-bold text-base text-[#1a1c1c]">选择预约发车时间</h3>
              <button 
                type="button" 
                onClick={() => setShowTimePickerModal(false)}
                className="p-1 rounded-full text-[#584235] hover:bg-[#f3f3f3]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 py-1">
              {['现在出发', '10分钟后', '15分钟后', '20分钟后', '30分钟后', '45分钟后', '1小时后', '2小时后'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setScheduledTime(t);
                    setShowTimePickerModal(false);
                    onShowToast(`已设置预约时间为：${t}`);
                  }}
                  className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all ${
                    scheduledTime === t
                      ? 'bg-[#ffdbc8] border-[#ff7d00] text-[#311300]'
                      : 'bg-[#f3f3f3] border-[#e0e0e0] text-[#1a1c1c] hover:border-[#ff7d00]/50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Billing Detail Modal */}
      {showBillingDetailModal && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-2.5">
              <h3 className="font-bold text-base text-[#1a1c1c] flex items-center gap-1.5">
                <Info className="w-5 h-5 text-[#ff7d00]" />
                <span>代叫服务计费说明</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setShowBillingDetailModal(false)}
                className="p-1 rounded-full text-[#584235] hover:bg-[#f3f3f3]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs text-[#584235] leading-relaxed">
              <div className="bg-[#f3f3f3] p-2.5 rounded-xl border border-[#e0e0e0] space-y-1">
                <p className="font-bold text-[#1a1c1c]">💰 预估金额说明</p>
                <p>商户代叫模式属于线下面对面上门服务，服务起步价及里程计费规则可由商户/商家现场与乘客直接协商确定。</p>
              </div>
              <div className="bg-[#f3f3f3] p-2.5 rounded-xl border border-[#e0e0e0] space-y-1">
                <p className="font-bold text-[#1a1c1c]">🛵 折叠代步车说明</p>
                <p>若勾选“需要代步车”，系统将优先匹配配备便携电动折叠代步车的代驾司机，确保快捷返程。</p>
              </div>
              <div className="bg-[#f3f3f3] p-2.5 rounded-xl border border-[#e0e0e0] space-y-1">
                <p className="font-bold text-[#1a1c1c]">📱 收款码绑定</p>
                <p>商家上传微信/支付宝收款码后，乘客可直接扫码支付，方便高效结算。</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowBillingDetailModal(false)}
              className="w-full py-2.5 bg-[#ff7d00] text-white font-bold text-xs rounded-xl shadow-md active:scale-[0.98] transition-transform mt-1"
            >
              我知道了
            </button>
          </div>
        </div>
      )}

      {/* Disclaimer Modal (代叫代驾服务特别免责条款) */}
      {showDisclaimerModal && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 max-h-[85vh] flex flex-col shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-2.5 shrink-0">
              <h3 className="font-bold text-base text-[#1a1c1c] flex items-center gap-1.5">
                <ShieldCheck className="w-5 h-5 text-[#ff7d00]" />
                <span>代叫代驾服务特别免责条款</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setShowDisclaimerModal(false)}
                className="p-1 rounded-full text-[#584235] hover:bg-[#f3f3f3]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 text-xs text-[#333] space-y-3 leading-relaxed">
              <div className="bg-amber-50 border border-amber-200/80 p-2.5 rounded-xl font-semibold text-[#8a5300]">
                使用本系统 “商户代叫代驾” 功能，您确认已充分知悉并同意如下约定：
              </div>

              <div className="space-y-1">
                <p className="font-bold text-[#1a1c1c] text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#ff7d00] rounded-full inline-block"></span>
                  服务性质说明
                </p>
                <p className="text-gray-600 pl-2.5">
                  商户代叫代驾，是合作商户自愿协助客户发布代驾需求，本系统仅提供信息展示、需求撮合的居间信息服务，本系统不直接提供代驾驾驶服务，不参与实际代驾服务履行。代驾服务的交易价格、结算方式，全部由客户与接单代驾司机自行沟通、自行协商确认；本系统所属主体、法人不参与定价，不对代驾服务的价格合理性承担任何责任。
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-[#1a1c1c] text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#ff7d00] rounded-full inline-block"></span>
                  主体关系界定
                </p>
                <p className="text-gray-600 pl-2.5">
                  本系统运营主体与平台接单代驾司机之间不存在劳动关系、劳务关系，双方仅属于商业合作关系。代驾服务的服务合同关系，直接成立于客户与代驾司机之间。代驾司机不属于本系统员工，不受本系统劳动管理约束。
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-[#1a1c1c] text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#ff7d00] rounded-full inline-block"></span>
                  风险与责任划分
                </p>
                <p className="text-gray-600 pl-2.5">
                  代驾服务过程中，因客户、代驾司机一方或双方行为引发的全部纠纷，包括但不限于言语冲突、打架斗殴、人身伤害、死亡、车辆损毁、交通事故、第三方财产损失等，由相关责任方依照法律规定承担相应法律责任。
                </p>
                <p className="text-gray-600 pl-2.5">
                  除因本系统运营主体自身存在故意、重大过失导致损害发生的情形外，本系统所属经营主体、法定代表人不对客户、代驾司机及第三方遭受的人身、财产损失承担赔偿、连带法律责任。
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-[#1a1c1c] text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#ff7d00] rounded-full inline-block"></span>
                  用户义务
                </p>
                <p className="text-gray-600 pl-2.5">
                  客户应当核验代驾司机驾驶证、从业资质；知悉代驾服务风险，谨慎选择司机；发生事故、纠纷应当优先向直接侵权人追责。本系统仅可提供纠纷调解协助，不承担赔付义务。
                </p>
              </div>

              <div className="space-y-1 border-t border-gray-100 pt-2">
                <p className="font-bold text-[#1a1c1c] text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#ff7d00] rounded-full inline-block"></span>
                  效力确认
                </p>
                <p className="text-gray-600 pl-2.5 font-medium">
                  您点击确认、使用代叫代驾下单功能，视为您已阅读、完全理解并自愿接受本全部免责条款。
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-[#e0e0e0] shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsDisclaimerAgreed(true);
                  setShowDisclaimerModal(false);
                }}
                className="w-full py-2.5 bg-[#ff7d00] active:bg-[#e06d00] text-white font-bold text-xs rounded-xl shadow-md active:scale-[0.98] transition-all cursor-pointer"
              >
                我已完整阅读并同意免责条款
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Management Team Modal (管理团队) - Removed as requested */}
      {false && showTeamManagementModal && (
        <div className="absolute inset-0 z-50 bg-[#f9f9f9] text-[#1a1c1c] flex flex-col overflow-hidden animate-in fade-in duration-200">
          
          {/* TopAppBar Header */}
          <header className="w-full sticky top-0 z-50 flex items-center justify-between px-5 h-16 bg-[#f9f9f9] border-b border-[#dfc0af] shrink-0 relative">
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => setShowTeamManagementModal(false)}
                className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#f3f3f3] active:opacity-80 transition-all text-[#984800]"
                title="返回"
              >
                <ArrowLeft className="w-5 h-5 text-[#984800]" />
              </button>
              <h1 className="text-lg font-bold text-[#984800] shrink-0">管理团队</h1>
            </div>

            {/* Centered Member Application Button */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
              <button 
                type="button"
                onClick={() => setShowApplicantApprovalModal(true)}
                className="relative flex items-center gap-1.5 px-3 py-1.5 bg-[#ffdbc8] text-[#311300] hover:bg-[#ffbfa3] rounded-full text-xs font-bold shadow-xs active:scale-95 transition-all border border-[#ff7d00]/20"
                title="成员申请"
              >
                <UserPlus className="w-4 h-4 text-[#984800]" />
                <span>成员申请</span>
                {pendingApplicantCount > 0 && (
                  <span className="flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#ba1a1a] text-[10px] font-bold text-white leading-none">
                    {pendingApplicantCount}
                  </span>
                )}
              </button>
            </div>

            <div className="w-10"></div>
          </header>

          <main className="flex-1 px-5 py-4 overflow-y-auto space-y-4 pb-28">
            {/* Current Identity Card */}
            <section>
              <div className="bg-white border border-[#dfc0af] rounded-2xl p-4 shadow-xs relative overflow-hidden">
                {/* Decorative element */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#ff7d00]/10 rounded-bl-[100px] -mr-4 -mt-4 pointer-events-none" />
                
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-[#584235]">我的身份（管理员级别）</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-[#ff7d00] text-white text-xs font-bold rounded-md">
                        {userRole || '开发者司机'}
                      </span>
                      {isEditingAdminName ? (
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="text"
                            maxLength={8}
                            value={tempAdminName}
                            onChange={(e) => setTempAdminName(e.target.value)}
                            className="text-xs font-bold px-2 py-0.5 border border-[#ff7d00] rounded bg-white outline-none w-28 text-[#1a1c1c]"
                            placeholder="最多8字"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleSaveAdminName}
                            className="text-xs bg-[#ff7d00] text-white px-2 py-0.5 rounded font-bold shrink-0 shadow-xs active:scale-95 transition-transform"
                          >
                            保存
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingAdminName(false)}
                            className="text-xs bg-[#e0e0e0] text-[#584235] px-1.5 py-0.5 rounded font-bold shrink-0"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg font-bold text-[#1a1c1c]">{adminProfile.name || '李扬'}</span>
                          {isManagementRole && (
                            <button
                              type="button"
                              onClick={() => {
                                setTempAdminName(adminProfile.name);
                                setIsEditingAdminName(true);
                              }}
                              className="flex items-center gap-0.5 text-[#ff7d00] hover:text-[#984800] text-xs font-bold transition-colors"
                              title="修改名字"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>修改名字</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#584235] block">小队总人数</span>
                    <span className="text-2xl font-bold text-[#ff7d00]">
                      {squadMembers.length > 0 ? squadMembers.length : 1}
                      <span className="text-sm font-normal text-[#584235] ml-1">人</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-[#dfc0af]/30">
                  <span className="text-sm text-[#584235] italic">团队规模持续增长中...</span>
                </div>
              </div>
            </section>

            {/* Search Bar */}
            <section>
              <div className="relative flex items-center">
                <Search className="w-5 h-5 absolute left-3.5 text-[#584235]/70 pointer-events-none" />
                <input 
                  type="tel"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="输入手机号码查找小队成员"
                  className="w-full h-12 pl-11 pr-4 bg-white border border-[#dfc0af] rounded-2xl focus:ring-2 focus:ring-[#ff7d00] focus:border-[#ff7d00] transition-all text-sm placeholder:text-[#584235]/50 outline-none"
                />
                {memberSearchQuery && (
                  <button 
                    type="button"
                    onClick={() => setMemberSearchQuery('')}
                    className="absolute right-3.5 text-[#8b7263] hover:text-[#1a1c1c]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </section>

            {/* Member List */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-bold text-[#584235]">成员列表</h2>
                <div className="flex gap-4 text-xs font-bold">
                  {(['全部', '管理层', '司机'] as const).map((tab) => {
                    const isActive = memberCategoryTab === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setMemberCategoryTab(tab)}
                        className={`relative transition-colors ${
                          isActive ? 'text-[#984800]' : 'text-[#584235]'
                        }`}
                      >
                        {tab}
                        {isActive && (
                          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#984800]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Members Data List */}
              {(() => {
                const currentAdminRole = userRole || '开发者司机';
                const currentAdminName = adminProfile.name || '李扬';

                const adminMember = {
                  id: userPhone || '15509601222',
                  name: currentAdminName,
                  role: currentAdminRole,
                  phone: userPhone || '15509601222',
                  status: '已通过',
                  approvedBy: '系统分配',
                  approvedRole: '超级管理员',
                  avatarBg: 'bg-[#ffdbc8] text-[#311300]',
                };

                const defaultMembers = [
                  adminMember,
                  {
                    id: 'm-1',
                    name: '王心凌',
                    role: '城市管理司机',
                    phone: '13912345678',
                    status: '已通过',
                    approvedBy: currentAdminName,
                    approvedRole: currentAdminRole,
                    avatarBg: 'bg-[#cce5ff] text-[#001e31]',
                  },
                  {
                    id: 'm-2',
                    name: '张一山',
                    role: '城市老板司机',
                    phone: '15509601223',
                    status: '已通过',
                    approvedBy: currentAdminName,
                    approvedRole: currentAdminRole,
                    avatarBg: 'bg-[#ffdbc8] text-[#311300]',
                  },
                  {
                    id: 'm-3',
                    name: '李小龙',
                    role: '普通司机',
                    phone: '15555556666',
                    status: '已通过',
                    approvedBy: currentAdminName,
                    approvedRole: currentAdminRole,
                    avatarBg: 'bg-[#e2e2e2] text-[#584235]',
                  }
                ];

                const isRemovedItem = (item: any) => {
                  if (!item) return true;
                  return Boolean(
                    (item.phone && removedMemberPhones.includes(item.phone)) ||
                    (item.id && removedMemberPhones.includes(item.id)) ||
                    (item.name && removedMemberPhones.includes(item.name))
                  );
                };

                const membersMap = new Map<string, any>();

                // 1. Fill default members (skip if removed)
                defaultMembers.forEach(m => {
                  if (!isRemovedItem(m)) {
                    membersMap.set(m.phone, m);
                  }
                });

                // 2. Fill/Override with real Firestore squad members
                squadMembers.forEach((m, idx) => {
                  if (!isRemovedItem(m)) {
                    const isMe = m.phone === userPhone || m.phone === '15509601222';
                    const memberName = isMe ? currentAdminName : (m.name || `司机${m.phone.slice(-4)}`);
                    const memberRole = isMe ? currentAdminRole : (m.role || '普通司机');
                    const status = m.status || '已通过';

                    membersMap.set(m.phone, {
                      id: m.id || m.phone || `real-${idx}`,
                      name: memberName,
                      role: memberRole,
                      phone: m.phone,
                      status,
                      approvedBy: m.approvedBy || currentAdminName,
                      approvedRole: m.approvedRole || currentAdminRole,
                      avatarBg: isMe ? 'bg-[#ffdbc8] text-[#311300]' : 'bg-[#e2e2e2] text-[#584235]',
                    });
                  }
                });

                // 3. Fill/Override with applicants (sync '已通过', '待审核', '已拒绝')
                applicants.forEach(app => {
                  if (!isRemovedItem(app)) {
                    const existing = membersMap.get(app.phone);
                    const memberName = app.name || existing?.name || `司机${app.phone.slice(-4)}`;
                    const memberRole = app.role || existing?.role || '普通司机';
                    const status = app.status || '待审核';
                    const approvedBy = app.approvedBy || (app.status !== '待审核' ? (existing?.approvedBy || currentAdminName) : (existing?.approvedRole || ''));
                    const approvedRole = app.approvedRole || (app.status !== '待审核' ? (existing?.approvedRole || currentAdminRole) : (existing?.approvedRole || ''));

                    membersMap.set(app.phone, {
                      id: app.id || app.phone,
                      name: memberName,
                      role: memberRole,
                      phone: app.phone,
                      status,
                      approvedBy,
                      approvedRole,
                      avatarBg: status === '已通过' 
                        ? 'bg-[#e2e2e2] text-[#584235]' 
                        : status === '已拒绝' 
                        ? 'bg-rose-100 text-rose-800' 
                        : 'bg-amber-100 text-amber-800',
                    });
                  }
                });

                // Always ensure current admin is set
                membersMap.set(userPhone || '15509601222', adminMember);

                const allMembersList = Array.from(membersMap.values())
                  .filter(m => !isRemovedItem(m) || m.phone === userPhone || m.phone === '15509601222')
                  .map(m => {
                  const isMe = m.phone === userPhone || m.phone === '15509601222';
                  const roleTagClass = m.role.includes('开发者') ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                                        m.role.includes('老板') ? 'bg-[#ff7d00]/10 text-[#ff7d00] border-[#ff7d00]/20' :
                                        m.role.includes('管理') ? 'bg-[#00aafc]/10 text-[#006496] border-[#00aafc]/20' :
                                        'bg-[#e2e2e2] text-[#584235] border-[#dfc0af]';

                  const statusTagClass = m.status === '已通过' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                         m.status === '已拒绝' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                                         'bg-amber-100 text-amber-800 border-amber-200';

                  const footprint = isMe
                    ? '超级管理员（实时同步派单与调度日志）'
                    : m.status === '已通过'
                    ? `由${m.approvedBy || currentAdminName} (${m.approvedRole || currentAdminRole}) 审批通过加入小队`
                    : m.status === '已拒绝'
                    ? `由${m.approvedBy || currentAdminName} (${m.approvedRole || currentAdminRole}) 审批拒绝`
                    : `待${currentAdminName} (${currentAdminRole}) 审核批复中`;

                  return {
                    ...m,
                    roleTagClass,
                    statusTagClass,
                    footprint
                  };
                });

                // Filter by search query & category tab
                const filteredMembers = allMembersList.filter(item => {
                  if (memberSearchQuery.trim()) {
                    const q = memberSearchQuery.trim().toLowerCase();
                    const matchPhone = item.phone?.toLowerCase().includes(q);
                    const matchName = item.name?.toLowerCase().includes(q);
                    if (!matchPhone && !matchName) return false;
                  }

                  if (memberCategoryTab === '管理层') {
                    return item.role.includes('管理') || item.role.includes('老板') || item.role.includes('开发者');
                  }
                  if (memberCategoryTab === '司机') {
                    return item.role.includes('普通') || item.role === '司机';
                  }
                  return true;
                });

                if (filteredMembers.length === 0) {
                  return (
                    <div className="py-12 text-center text-[#584235] space-y-2 bg-white rounded-2xl border border-[#dfc0af]">
                      <Users className="w-8 h-8 text-[#8b7263] mx-auto" />
                      <p className="text-sm font-bold">未找到匹配的小队成员</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {filteredMembers.map((member) => {
                      const assignableRoles = getAllowedAssignRoles(member);
                      const canChangeRole = assignableRoles.length > 0;

                      return (
                        <div 
                          key={member.id}
                          className="flex items-center justify-between bg-white p-4 rounded-2xl border border-[#dfc0af] shadow-2xs hover:border-[#ff7d00]/40 transition-all"
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${member.avatarBg}`}>
                              {member.name ? member.name.charAt(0) : '司'}
                            </div>
                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                {/* Name rendering and inline edit (max 8 chars) */}
                                {editingMemberPhone === member.phone ? (
                                  <div className="inline-flex items-center gap-1 my-0.5">
                                    <input
                                      type="text"
                                      maxLength={8}
                                      value={editingMemberNameTemp}
                                      onChange={(e) => setEditingMemberNameTemp(e.target.value)}
                                      className="text-xs font-bold px-2 py-1 border border-[#ff7d00] rounded-lg bg-white outline-none w-28 text-[#1a1c1c]"
                                      placeholder="最多8字"
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveMemberName(member.phone, editingMemberNameTemp)}
                                      className="text-xs bg-[#ff7d00] text-white px-2 py-1 rounded-lg font-bold shrink-0 shadow-xs active:scale-95 transition-transform"
                                    >
                                      保存
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingMemberPhone(null)}
                                      className="text-xs bg-[#e0e0e0] text-[#584235] px-1.5 py-1 rounded-lg font-bold shrink-0"
                                    >
                                      取消
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-bold text-base text-[#1a1c1c] truncate max-w-[120px]" title={member.name}>
                                      {member.name}
                                    </span>
                                    {isManagementRole && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingMemberPhone(member.phone);
                                          setEditingMemberNameTemp(member.name || '');
                                        }}
                                        className="flex items-center gap-0.5 text-[#ff7d00] hover:text-[#984800] text-xs font-bold transition-colors shrink-0"
                                        title="修改成员名字（最多8字）"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                        <span className="text-[10px]">改名</span>
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Role tag with dropdown selector if user has role assignment permission */}
                                {canChangeRole ? (
                                  <div className="relative inline-block shrink-0">
                                    <select
                                      value={member.role}
                                      onChange={(e) => handleUpdateMemberRole(member, e.target.value)}
                                      className={`px-2 py-0.5 font-bold text-[10px] rounded border appearance-none pr-5 cursor-pointer outline-none ${member.roleTagClass}`}
                                      title="点击更改角色"
                                    >
                                      {!assignableRoles.includes(member.role) && (
                                        <option value={member.role}>{member.role}</option>
                                      )}
                                      {assignableRoles.map((r) => (
                                        <option key={r} value={r} className="text-xs text-[#1a1c1c] bg-white">
                                          {r}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown className="w-2.5 h-2.5 absolute right-1 top-1.5 pointer-events-none opacity-70" />
                                  </div>
                                ) : (
                                  <span className={`px-2 py-0.5 font-bold text-[10px] rounded border shrink-0 ${member.roleTagClass}`}>
                                    {member.role}
                                  </span>
                                )}

                                {/* Status Tag (已通过 / 待审核 / 已拒绝) */}
                                {member.status && (
                                  <span className={`px-2 py-0.5 font-bold text-[10px] rounded border shrink-0 ${member.statusTagClass}`}>
                                    {member.status}
                                  </span>
                                )}
                              </div>

                              <span className="text-sm text-[#584235] font-mono">{member.phone}</span>
                              <span className="text-[10px] text-[#584235]/70 block truncate">
                                {member.footprint}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2 shrink-0 ml-2">
                            <a 
                              href={`tel:${member.phone}`}
                              className="w-10 h-10 flex items-center justify-center rounded-full bg-[#ff7d00]/10 text-[#ff7d00] hover:bg-[#ff7d00] hover:text-white transition-all active:scale-95"
                              title="拨打电话"
                            >
                              <Phone className="w-4 h-4 fill-current" />
                            </a>
                            {isManagementRole && (
                              <button 
                                type="button"
                                onClick={async () => {
                                  const targetPhone = member.phone;
                                  const targetId = member.id;
                                  const targetName = member.name;

                                  // 1. Mark as removed locally in state & localStorage
                                  setRemovedMemberPhones(prev => {
                                    const updated = Array.from(new Set([...prev, targetPhone, targetId, targetName].filter(Boolean)));
                                    try {
                                      localStorage.setItem('dd_removed_squad_phones_v2', JSON.stringify(updated));
                                    } catch (_) {}
                                    return updated;
                                  });

                                  // 2. Directly update React states so UI removes member instantly
                                  setSquadMembers(prev => {
                                    const updated = prev.filter((m: any) => 
                                      m.phone !== targetPhone && m.id !== targetId && m.name !== targetName && m.phone !== targetId
                                    );
                                    try {
                                      localStorage.setItem('dd_squad_members_v2', JSON.stringify(updated));
                                    } catch (_) {}
                                    return updated;
                                  });

                                  setApplicants(prev => {
                                    const updated = prev.filter((a: any) => 
                                      a.phone !== targetPhone && a.id !== targetId && a.name !== targetName && a.phone !== targetId
                                    );
                                    try {
                                      localStorage.setItem('dd_applicants_v2', JSON.stringify(updated));
                                    } catch (_) {}
                                    return updated;
                                  });

                                  // 3. Delete from Firestore database
                                  if (targetPhone) {
                                    try {
                                      await deleteDoc(doc(db, 'squad_members', targetPhone));
                                    } catch (e) {
                                      console.error(e);
                                    }
                                  }
                                  if (targetId && targetId !== targetPhone) {
                                    try {
                                      await deleteDoc(doc(db, 'squad_members', targetId));
                                    } catch (e) {
                                      console.error(e);
                                    }
                                  }

                                  onShowToast(`已成功彻底删除成员: ${targetName || '司机'}`);
                                }}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-[#ffdad6] text-[#ba1a1a] hover:bg-[#ba1a1a] hover:text-white transition-all active:scale-95 cursor-pointer shrink-0"
                                title="移除成员"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </section>
          </main>
        </div>
      )}

      {/* Order Detail View Modal */}
      {selectedOrderDetail && (
        <div className="absolute inset-0 z-50 bg-[#f9f9f9] text-[#1a1c1c] flex flex-col overflow-hidden animate-in fade-in duration-200">
          {/* TopAppBar */}
          <header className="bg-[#f9f9f9] sticky top-0 z-50 border-b border-[#e2e2e2] flex items-center justify-between px-5 h-14 shrink-0">
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => setSelectedOrderDetail(null)}
                className="p-1.5 rounded-full hover:bg-black/5 transition-colors flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5 text-[#984800]" />
              </button>
              <h1 className="text-lg font-bold text-[#984800]">订单详情</h1>
            </div>
            <button 
              type="button" 
              onClick={() => onShowToast('更多操作选项')}
              className="p-1.5 rounded-full hover:bg-black/5 transition-colors flex items-center justify-center"
            >
              <MoreVertical className="w-5 h-5 text-[#984800]" />
            </button>
          </header>

          <main className="flex-1 p-5 overflow-y-auto space-y-4 pb-28">
            {/* Order Status Header Card */}
            <div className="bg-white border border-[#e2e2e2] rounded-xl p-4 shadow-sm space-y-5">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-[#ff7d00]">{selectedOrderDetail.statusCategory}</span>
                <span className="text-xs text-[#584235] font-semibold">
                  订单编号: {selectedOrderDetail.orderNo || formatMerchantOrderNo(selectedOrderDetail)}
                </span>
              </div>

              {/* Step Tracker */}
              <div className="relative flex justify-between items-start pt-1">
                {/* Tracker Line Background */}
                <div className="absolute top-3 left-0 w-full h-[2px] bg-[#e2e2e2]" />
                {/* Tracker Line Progress */}
                <div 
                  className="absolute top-3 left-0 h-[2px] bg-[#ff7d00] transition-all duration-300" 
                  style={{
                    width: selectedOrderDetail.statusCategory === '已完成' ? '100%' :
                           selectedOrderDetail.statusCategory === '服务中' ? '75%' : '15%'
                  }}
                />

                {[
                  { step: '呼叫中', index: 1 },
                  { step: '司机接单', index: 2 },
                  { step: '司机到达', index: 3 },
                  { step: '服务中', index: 4 },
                  { step: '已完成', index: 5 },
                ].map((s) => {
                  const activeIndex = selectedOrderDetail.statusCategory === '已完成' ? 5 :
                                      selectedOrderDetail.statusCategory === '服务中' ? 4 : 1;
                  const isPassedOrCurrent = s.index <= activeIndex;
                  const isCurrent = s.index === activeIndex;

                  return (
                    <div key={s.step} className="relative z-10 flex flex-col items-center gap-1.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        isCurrent 
                          ? 'bg-[#ff7d00] text-white shadow-[0_0_0_4px_rgba(255,125,0,0.25)]' 
                          : isPassedOrCurrent 
                          ? 'bg-[#ff7d00] text-white' 
                          : 'bg-[#e2e2e2] text-transparent'
                      }`}>
                        {isPassedOrCurrent && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span className={`text-[10px] font-bold ${
                        isPassedOrCurrent ? 'text-[#984800]' : 'text-[#584235]'
                      }`}>
                        {s.step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Admin/Dispatcher Card */}
            <div className="bg-white border border-[#e2e2e2] rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#cce5ff] flex items-center justify-center text-[#006496]">
                  <Headphones className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-base text-[#1a1c1c]">{selectedOrderDetail.adminName || selectedOrderDetail.dispatchedByName || adminProfile.name || '系统派单'}</p>
                    <span className="px-2 py-0.5 bg-[#00aafc] text-white rounded text-[10px] font-bold">
                      {selectedOrderDetail.adminRole || userRole || '开发者司机'}
                    </span>
                  </div>
                  <p className="text-xs text-[#584235]">派单管理员信息</p>
                </div>
              </div>
              <a 
                href="tel:13800000000"
                className="w-9 h-9 rounded-full bg-[#ff7d00] flex items-center justify-center text-white shadow-sm active:scale-95 transition-transform"
              >
                <Phone className="w-4 h-4 fill-current" />
              </a>
            </div>

            {/* Order Core Info Card */}
            <div className="bg-white border border-[#e2e2e2] rounded-xl p-4 space-y-3.5 shadow-sm">
              <div className="flex justify-between items-center pb-2 border-b border-[#eeeeee]">
                <p className="text-xs text-[#584235] font-semibold">订单详情</p>
                <div className="flex items-center gap-1 text-[#ff7d00] font-bold text-sm">
                  <span>订单金额:</span>
                  <span className="text-base font-bold">{getOrderSyncPrice(selectedOrderDetail)}</span>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#984800] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-[#584235] font-semibold">订单起点</p>
                    <p className="font-bold text-sm text-[#1a1c1c]">{selectedOrderDetail.startLocation || selectedOrderDetail.originName || '未填写起点'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-[#584235] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-[#584235] font-semibold">预约出发时间</p>
                    <p className="font-bold text-sm text-[#1a1c1c]">{selectedOrderDetail.scheduledTime || '立即出发'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-[#584235] mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] text-[#584235] font-semibold">备注</p>
                    <p className="text-xs text-[#1a1c1c] bg-[#f3f3f3] p-2 rounded-lg mt-0.5">
                      {selectedOrderDetail.orderRemark || selectedOrderDetail.rawOrder?.orderRemark || '商户代叫'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-[#f3f3f3] rounded-lg">
                  <span className="text-xs text-[#584235]">需要折叠代步车</span>
                  <span className="px-2.5 py-0.5 bg-[#ff7d00] text-white rounded-full text-[10px] font-bold">
                    {selectedOrderDetail.needScooter !== false && selectedOrderDetail.rawOrder?.needScooter !== false ? '需要' : '不需要'}
                  </span>
                </div>
              </div>
            </div>

            {/* Passenger & Driver Info Card */}
            {(() => {
              const rawDriverPhone = (
                selectedOrderDetail.dispatchedDriverPhone ||
                selectedOrderDetail.rawOrder?.driverPhone || 
                selectedOrderDetail.driverPhone || 
                ''
              ).toString().replace(/[-\s]/g, '');

              let resolvedDriverName = '';

              // 1. Look up in active squadMembers state
              const matchedMember = squadMembers.find(
                (m: any) => (m.phone && m.phone.replace(/[-\s]/g, '') === rawDriverPhone) || m.id === rawDriverPhone
              );
              if (matchedMember && matchedMember.name) {
                resolvedDriverName = matchedMember.name;
              }

              // 2. Look up in localStorage dd_squad_members_v2 or dd_applicants_v2
              if (!resolvedDriverName) {
                try {
                  const savedM = JSON.parse(localStorage.getItem('dd_squad_members_v2') || '[]');
                  const m = savedM.find((item: any) => (item.phone && item.phone.replace(/[-\s]/g, '') === rawDriverPhone) || item.id === rawDriverPhone);
                  if (m && m.name) resolvedDriverName = m.name;
                } catch (_) {}
              }

              if (!resolvedDriverName) {
                try {
                  const savedA = JSON.parse(localStorage.getItem('dd_applicants_v2') || '[]');
                  const a = savedA.find((item: any) => (item.phone && item.phone.replace(/[-\s]/g, '') === rawDriverPhone) || item.id === rawDriverPhone);
                  if (a && a.name) resolvedDriverName = a.name;
                } catch (_) {}
              }

              // 3. Look up in order properties if not placeholder
              if (!resolvedDriverName) {
                const candidate = selectedOrderDetail.driverDisplayName || selectedOrderDetail.driverName || selectedOrderDetail.rawOrder?.driverName || selectedOrderDetail.rawOrder?.driverDisplayName;
                if (candidate) {
                  resolvedDriverName = candidate;
                }
              }

              // 4. Fallback
              if (!resolvedDriverName) {
                resolvedDriverName = rawDriverPhone ? '在线接单司机' : '等待接单中';
              }

              const cleanDriverPhone = rawDriverPhone || '暂无';

              return (
                <div className="bg-white border border-[#e2e2e2] rounded-xl shadow-sm overflow-hidden text-xs">
                  <div className="p-3.5 border-b border-[#eeeeee]">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5 text-[#584235]">
                        <User className="w-4 h-4 text-[#584235]" />
                        <span className="font-bold text-sm text-[#1a1c1c]">乘客电话</span>
                      </div>
                      <span className="font-bold text-sm tracking-wider text-[#1a1c1c]">
                        {selectedOrderDetail.passengerPhone || selectedOrderDetail.rawOrder?.passengerPhone || '真实乘客电话'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#ff7d00]/10 border border-[#ff7d00]/30 flex items-center justify-center text-[#ff7d00] font-bold text-sm">
                        {resolvedDriverName?.[0] || '司'}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[#1a1c1c]">
                          接单司机：{resolvedDriverName}
                        </p>
                        <p className="text-xs text-[#584235] font-mono">
                          {cleanDriverPhone}
                        </p>
                      </div>
                    </div>

                    {rawDriverPhone && (
                      <a 
                        href={`tel:${cleanDriverPhone}`}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#e8e8e8] rounded-full hover:bg-[#e2e2e2] transition-colors text-[#984800] font-bold text-xs"
                      >
                        <Phone className="w-3.5 h-3.5 fill-current" />
                        <span>一键拨打</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })()}
          </main>

          {/* Footer Action */}
          <footer className="sticky bottom-0 left-0 right-0 bg-white border-t border-[#e2e2e2] p-4 z-50 shrink-0">
            <div className="max-w-md mx-auto flex gap-3">
              <button
                type="button"
                onClick={() => {
                  onShowToast('📩 订单申诉已提交，客服人员将在10分钟内联系您');
                }}
                className="flex-1 py-2.5 bg-[#e8e8e8] text-[#584235] font-bold text-xs rounded-lg hover:bg-[#e2e2e2] active:scale-95 transition-all"
              >
                订单申诉
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetOrderNo = selectedOrderDetail.orderNo || selectedOrderDetail.id || '此订单';
                  if (confirm(`确定要取消订单【${targetOrderNo}】吗？`)) {
                    const orderId = selectedOrderDetail.id || selectedOrderDetail.orderId || selectedOrderDetail.rawOrder?.id || selectedOrderDetail.rawOrder?.orderId;
                    const driverPhone = selectedOrderDetail.dispatchedDriverPhone || selectedOrderDetail.driverPhone || selectedOrderDetail.rawOrder?.driverPhone || selectedOrderDetail.rawOrder?.dispatchedDriverPhone;
                    const passengerPhone = selectedOrderDetail.passengerPhone || selectedOrderDetail.rawOrder?.passengerPhone;

                    // 1. Delete from Firestore merchant_orders
                    if (orderId) {
                      try {
                        await deleteDoc(doc(db, 'merchant_orders', orderId));
                      } catch (err) {
                        console.error("Error deleting from merchant_orders:", err);
                      }
                    }

                    // 2. Also search merchant_orders by passengerPhone if orderId missing
                    if (!orderId && passengerPhone) {
                      try {
                        await deleteDoc(doc(db, 'merchant_orders', passengerPhone));
                      } catch (_) {}
                    }

                    // 3. Clear from passenger_links (if dispatched to a specific driver phone)
                    if (driverPhone) {
                      try {
                        await deleteDoc(doc(db, 'passenger_links', driverPhone));
                      } catch (err) {}
                    }

                    // 4. Clear from active_orders if present
                    if (driverPhone) {
                      try {
                        await deleteDoc(doc(db, 'active_orders', driverPhone));
                      } catch (err) {}
                    }
                    if (orderId) {
                      try {
                        await deleteDoc(doc(db, 'active_orders', orderId));
                      } catch (err) {}
                    }

                    // 5. Clean local storage dd_merchant_orders_v2
                    try {
                      const saved = JSON.parse(localStorage.getItem('dd_merchant_orders_v2') || '[]');
                      const updated = saved.filter((o: any) => {
                        if (orderId && (o.id === orderId || o.orderId === orderId)) return false;
                        if (passengerPhone && o.passengerPhone === passengerPhone) return false;
                        if (targetOrderNo && o.orderNo === targetOrderNo) return false;
                        return true;
                      });
                      localStorage.setItem('dd_merchant_orders_v2', JSON.stringify(updated));
                    } catch (_) {}

                    // 6. Update local state and trigger global event for immediate UI update
                    setAllDispatchedOrders((prev) => prev.filter((o: any) => {
                      if (orderId && (o.id === orderId || o.orderId === orderId)) return false;
                      if (passengerPhone && o.passengerPhone === passengerPhone) return false;
                      if (targetOrderNo && o.orderNo === targetOrderNo) return false;
                      return true;
                    }));
                    window.dispatchEvent(new CustomEvent('merchant_orders_updated'));

                    onShowToast(`❌ 订单【${targetOrderNo}】已取消，已同步从选单大厅及系统清理`);
                    setSelectedOrderDetail(null);

                    if (onClose) {
                      onClose();
                    }
                  }
                }}
                className="flex-[2] py-2.5 border-2 border-[#ba1a1a] text-[#ba1a1a] font-bold text-xs rounded-lg hover:bg-rose-50 active:scale-95 transition-all text-center cursor-pointer"
              >
                取消订单
              </button>
            </div>
          </footer>
        </div>
      )}

      {/* Full-Screen Start Location Search Page Modal */}
      {showStartLocationSearch && (
        <div className="absolute inset-0 z-50 bg-[#f9f9f9] text-[#1a1c1c] flex flex-col overflow-hidden animate-in fade-in duration-200">
          {/* TopAppBar Header */}
          <header className="bg-[#f9f9f9] sticky top-0 z-50 border-b border-[#e2e2e2] flex items-center justify-between px-4 h-14 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowStartLocationSearch(false)}
                className="p-1.5 rounded-lg hover:bg-black/5 transition-colors flex items-center gap-1 text-[#584235]"
              >
                <ArrowLeft className="w-5 h-5 text-[#984800]" />
                <span className="text-xs font-bold text-[#984800]">返回</span>
              </button>
              <h1 className="text-base font-bold text-[#1a1c1c] ml-1">搜索输入起点</h1>
            </div>

            <button
              type="button"
              onClick={() => {
                if (originSearchText.trim()) {
                  setPassengerAddress(originSearchText.trim());
                }
                setShowStartLocationSearch(false);
              }}
              className="bg-[#984800] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition-all"
            >
              确定起点
            </button>
          </header>

          {/* Search Bar */}
          <div className="p-4 bg-white border-b border-[#e2e2e2] shrink-0">
            <div className="relative flex items-center bg-[#f3f3f3] border border-[#dfc0af] focus-within:border-[#ff7d00] focus-within:ring-2 focus-within:ring-[#ff7d00]/20 rounded-xl px-3 py-2.5 transition-all">
              <MapPin className="w-4 h-4 text-[#ff7d00] shrink-0 mr-2.5" />
              <input
                type="text"
                value={originSearchText}
                onChange={(e) => setOriginSearchText(e.target.value)}
                placeholder="搜索商家名称 / 酒楼 / KTV / 详细起点地址"
                className="w-full bg-transparent border-none outline-none text-xs font-bold text-[#1a1c1c] placeholder:text-[#8b7263] placeholder:font-normal p-0"
                autoFocus
              />
              {originSearchText && (
                <button
                  type="button"
                  onClick={() => setOriginSearchText('')}
                  className="p-1 rounded-full hover:bg-black/10 text-[#8b7263] hover:text-[#1a1c1c] transition-colors ml-1 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Search Content / Suggestions / Popular Merchants */}
          <main className="flex-1 overflow-y-auto p-4 space-y-4">
            {originSuggestions.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-[#8b7263] px-1 uppercase tracking-wider">
                  匹配起点搜索建议
                </p>
                <div className="bg-white border border-[#e2e2e2] rounded-xl overflow-hidden shadow-xs divide-y divide-[#f0f0f0]">
                  {originSuggestions.map((tip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPassengerAddress(tip.name);
                        if (tip.location) {
                          setPassengerCoords({
                            lat: tip.location.lat,
                            lng: tip.location.lng
                          });
                        }
                        setShowStartLocationSearch(false);
                      }}
                      className="w-full text-left p-3.5 hover:bg-[#f3f3f3] flex items-center gap-3 transition-colors cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-full bg-[#ff7d00]/10 flex items-center justify-center text-[#ff7d00] shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-[#1a1c1c] truncate">{tip.name}</h4>
                        <p className="text-[10px] text-[#8b7263] truncate mt-0.5">{tip.address || tip.district || '详细地址'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {originSearchText.trim() && (
                  <div className="p-3.5 bg-[#ffdbc8]/50 border border-[#dfc0af] rounded-xl space-y-2">
                    <p className="text-xs text-[#311300] font-bold">
                      当前输入的起点：<span className="text-[#984800]">{originSearchText}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setPassengerAddress(originSearchText.trim());
                        setShowStartLocationSearch(false);
                      }}
                      className="w-full py-2 bg-[#984800] text-white text-xs font-bold rounded-lg hover:opacity-90 active:scale-95 transition-all shadow-sm"
                    >
                      使用当前输入的文本作为代驾起点
                    </button>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between px-1 mb-2">
                    <p className="text-[11px] font-bold text-[#8b7263]">
                      常用代驾商家 / 酒楼热门起点推荐
                    </p>
                    <span className="text-[10px] font-bold text-[#984800] bg-[#ffdbc8] px-2 py-0.5 rounded-md">
                      📍 {userTeamCity || currentCity || '银川市'}本地推荐
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {getCityMerchantRecommendations(userTeamCity || currentCity || '银川市').map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setPassengerAddress(item.name);
                          setShowStartLocationSearch(false);
                        }}
                        className="text-left p-3 bg-white border border-[#e2e2e2] hover:border-[#ff7d00] hover:bg-[#ffdbc8]/20 rounded-xl transition-all cursor-pointer shadow-xs group"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#ff7d00] shrink-0 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold text-[#1a1c1c] truncate">{item.name}</span>
                        </div>
                        <p className="text-[10px] text-[#8b7263] mt-1 pl-5 truncate">{item.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Applicant Approval Modal (团队审核 - 申请审批) - Removed as requested */}
      {false && showApplicantApprovalModal && (
        <div className="absolute inset-0 z-50 bg-[#f9f9f9] text-[#1a1c1c] flex flex-col overflow-hidden animate-in fade-in duration-200">
          {/* TopAppBar */}
          <header className="bg-[#f9f9f9] w-full sticky top-0 z-50 border-b border-[#e2e2e2] flex justify-between items-center px-4 sm:px-5 h-14 shrink-0">
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => setShowApplicantApprovalModal(false)}
                className="active:scale-95 transition-transform hover:bg-[#f3f3f3] p-2 rounded-full flex items-center justify-center text-[#984800]"
                title="返回"
              >
                <ArrowLeft className="w-5 h-5 text-[#984800]" />
              </button>
              <h1 className="text-base sm:text-lg font-bold text-[#1a1c1c]">申请审批</h1>
            </div>
            <button 
              type="button"
              onClick={() => onShowToast('🔍 已自动筛选显示待处理成员申请')}
              className="active:scale-95 transition-transform hover:bg-[#f3f3f3] p-2 rounded-full flex items-center justify-center text-[#584235]"
              title="筛选"
            >
              <SlidersHorizontal className="w-5 h-5 text-[#584235]" />
            </button>
          </header>

          {/* Main Content Canvas */}
          <main className="flex-1 px-4 sm:px-5 py-4 space-y-4 overflow-y-auto pb-24">
            {/* Permission Banner */}
            <div className="bg-[#fff2e6] border border-[#ff7d00]/30 rounded-xl p-3 flex items-start gap-2.5 shadow-xs">
              <ShieldCheck className="w-5 h-5 text-[#ff7d00] shrink-0 mt-0.5" />
              <div className="text-xs text-[#584235] space-y-0.5">
                <p className="font-bold text-[#311300]">审核审批权限说明：</p>
                <p>【开发者司机】、【城市老板司机】、【城市管理司机】、【城市派单员司机】均拥有全权对申请人进行<strong>审批通过</strong>或<strong>审批不通过</strong>的判定。</p>
              </div>
            </div>

            {applicants.map((applicant) => (
              <div 
                key={applicant.id}
                className="bg-white rounded-xl border border-[#e2e2e2] p-4 flex flex-col gap-3 shadow-xs"
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="font-bold text-base text-[#1a1c1c]">{applicant.name}</span>
                    <span className="text-sm text-[#584235] font-mono">{applicant.phone}</span>
                  </div>
                  <div className={`px-2.5 py-1 rounded text-xs font-bold ${
                    applicant.status === '已通过' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : applicant.status === '已拒绝'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-[#eeeeee] text-[#584235]'
                  }`}>
                    {applicant.status}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-[#584235] uppercase tracking-wider">
                    申请备注
                  </label>
                  <div className={`bg-white border border-[#e2e2e2] rounded-lg p-3 text-sm text-[#1a1c1c] ${!applicant.note ? 'italic opacity-60' : ''}`}>
                    {applicant.note || '该申请人未填写具体备注。'}
                  </div>
                  <p className="text-[#584235]/70 text-[11px] px-1 flex items-center gap-1 mt-0.5">
                    <Info className="w-3.5 h-3.5 shrink-0 text-[#584235]" />
                    <span>备注越详细越能增加审核通过的概率</span>
                  </p>
                </div>

                {applicant.status !== '待审核' && applicant.approvedBy && (
                  <div className="bg-[#f9f9f9] border border-[#e2e2e2] rounded-lg p-2.5 text-xs text-[#584235] flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 font-bold text-[#1a1c1c]">
                      <span>审批记录：</span>
                      <span className="text-[#ff7d00]">{applicant.approvedBy}</span>
                      <span className="text-[10px] bg-[#ff7d00]/10 text-[#ff7d00] px-1.5 py-0.2 rounded border border-[#ff7d00]/20">{applicant.approvedRole}</span>
                    </div>
                    {applicant.approvalTime && (
                      <span className="text-[11px] text-[#584235]/70">处理时间: {applicant.approvalTime}</span>
                    )}
                    {applicant.status === '已拒绝' && applicant.selectedReasons && applicant.selectedReasons.length > 0 && (
                      <span className="text-rose-700 font-medium mt-0.5">不通过原因: {applicant.selectedReasons.join('，')}</span>
                    )}
                  </div>
                )}

                {applicant.status === '待审核' && (
                  <div className="flex flex-col gap-2 pt-2">
                    <button 
                      type="button"
                      onClick={() => handleApproveApplicant(applicant.id, applicant.name)}
                      className="w-full bg-[#ff7d00] hover:bg-[#984800] text-white font-bold text-sm py-3 rounded-lg active:scale-95 transition-transform shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>审批通过</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        if (!canReviewApplicants) {
                          onShowToast('⚠️ 您暂无审批权限，仅【开发者司机、城市老板司机、城市管理司机、城市派单员司机】可以审核');
                          return;
                        }
                        setApplicants(prev => prev.map(a => a.id === applicant.id ? { ...a, showReasons: !a.showReasons } : a));
                      }}
                      className="w-full bg-white border border-[#ff7d00] text-[#ff7d00] font-bold text-sm py-3 rounded-lg active:scale-95 transition-transform cursor-pointer"
                    >
                      审批不通过
                    </button>
                  </div>
                )}

                {/* Rejection Reasons Panel */}
                {applicant.status === '待审核' && applicant.showReasons && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-[#e2e2e2] mt-1 animate-in fade-in duration-200">
                    <p className="text-xs font-bold text-[#584235]">选择不通过原因：</p>
                    <div className="flex flex-wrap gap-2">
                      {['备注填写不详细', '无法核实您的身份准确性'].map((reason) => {
                        const isSelected = applicant.selectedReasons.includes(reason);
                        return (
                          <div 
                            key={reason}
                            onClick={() => {
                              setApplicants(prev => prev.map(a => {
                                if (a.id !== applicant.id) return a;
                                const reasons = isSelected 
                                  ? a.selectedReasons.filter(r => r !== reason)
                                  : [...a.selectedReasons, reason];
                                return { ...a, selectedReasons: reasons };
                              }));
                            }}
                            className={`cursor-pointer px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                              isSelected 
                                ? 'border-[#ff7d00] bg-[#fff2e6] text-[#ff7d00] font-bold'
                                : 'border-[#e2e2e2] bg-[#f3f3f3] text-[#584235] hover:border-[#ff7d00]'
                            }`}
                          >
                            {reason}
                          </div>
                        );
                      })}
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleRejectApplicant(applicant.id, applicant.name)}
                      className="mt-2 bg-[#ba1a1a] hover:bg-[#93000a] text-white font-bold text-sm py-2.5 rounded-lg active:opacity-80 transition-all shadow-xs cursor-pointer"
                    >
                      确认拒绝
                    </button>
                  </div>
                )}
              </div>
            ))}
          </main>
        </div>
      )}

      {/* Custom Confirmation Modal for Clearing Orders - Removed as requested */}
      {false && showConfirmClearOrdersModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-rose-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#1a1c1c]">彻底清空订单列表</h3>
                <p className="text-xs text-[#584235] mt-0.5">此操作不可撤销</p>
              </div>
            </div>

            <p className="text-xs text-[#584235] bg-rose-50/80 p-3 rounded-xl border border-rose-100 leading-relaxed">
              确定要一键彻底清空【商户代叫订单中心】里的全部 <span className="font-bold text-rose-600">{allDispatchedOrders.length}</span> 笔订单（包含真实与虚拟订单）吗？
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmClearOrdersModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#f3f3f3] text-[#584235] hover:bg-[#e8e8e8] active:scale-95 transition-all cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleExecuteClearAllOrders}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 active:scale-95 transition-all shadow-md cursor-pointer"
              >
                确认彻底清空
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
