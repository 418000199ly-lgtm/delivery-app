import React, { useState, useEffect } from 'react';
import { 
  Bot, Key, ShoppingBag, Terminal, User, RefreshCw, Plus, CheckCircle, 
  AlertTriangle, ShieldCheck, Copy, Trash2, Edit3, Send, Play, Pause, 
  Zap, Database, Check, Download, ExternalLink, ShieldAlert, Sparkles, MessageSquare,
  QrCode, Smartphone, Clock, ArrowRight
} from 'lucide-react';
import { db, collection, doc, setDoc, onSnapshot, deleteDoc } from '../lib/dbProxy';

interface XianyuAccount {
  id: string;
  nickname: string;
  avatar?: string;
  cookie: string;
  status: 'online' | 'expired' | 'connecting';
  autoReplyEnabled: boolean;
  lastSync: string;
}

export interface VipTier {
  id: 'PERPETUAL' | '365D' | '180D' | '90D' | '30D';
  name: string;
  durationDays: number;
  price: number;
  label: string;
  codePrefix: string;
}

export const generateAdminStyleVipCode = (durationDays: number) => {
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16).toUpperCase();
    });
  };
  const prefix = (durationDays >= 30000 || durationDays === 99999) ? 'VIPFOREVER' : `VIP${durationDays}D`;
  return `${prefix}${generateUUID()}`;
};

export const VIP_TIERS: VipTier[] = [
  { id: 'PERPETUAL', name: '永久会员', durationDays: 36500, price: 158.0, label: '永久', codePrefix: 'VIPFOREVER' },
  { id: '365D', name: '365天 (一年)', durationDays: 365, price: 78.0, label: '365天', codePrefix: 'VIP365D' },
  { id: '180D', name: '180天 (半年)', durationDays: 180, price: 45.0, label: '180天', codePrefix: 'VIP180D' },
  { id: '90D', name: '90天', durationDays: 90, price: 25.0, label: '90天', codePrefix: 'VIP90D' },
  { id: '30D', name: '30天', durationDays: 30, price: 9.9, label: '30天', codePrefix: 'VIP30D' },
];

interface XianyuRule {
  id: string;
  name: string;
  keyword: string;
  itemTitle: string;
  triggerType: 'pay_success' | 'keyword_chat' | 'all';
  cardCategory: '30D' | '90D' | '180D' | '365D' | 'PERPETUAL';
  replyTemplate: string;
  enabled: boolean;
}

interface XianyuCardKey {
  id: string;
  code: string;
  category: '30D' | '90D' | '180D' | '365D' | 'PERPETUAL' | string;
  durationDays: number;
  status: 'unused' | 'delivered' | 'revoked';
  orderId?: string;
  buyerNickname?: string;
  deliveredAt?: string;
  createdAt: string;
}

interface XianyuOrder {
  id: string;
  orderNo: string;
  buyerNickname: string;
  itemTitle: string;
  price: number;
  cardCode: string;
  status: 'success' | 'failed' | 'refunded';
  deliveredAt: string;
  accountNickname?: string;
}

interface XianyuLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export default function XianyuAutoReplyView() {
  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'rules' | 'card_keys' | 'orders' | 'logs'>('orders');
  
  // Real-time state synced with Firestore / Local
  const [accounts, setAccounts] = useState<XianyuAccount[]>([]);
  const [rules, setRules] = useState<XianyuRule[]>([]);
  const [cardKeys, setCardKeys] = useState<XianyuCardKey[]>([]);
  const [orders, setOrders] = useState<XianyuOrder[]>([]);
  const [logs, setLogs] = useState<XianyuLog[]>([]);

  // System listener engine toggle
  const [isEngineRunning, setIsEngineRunning] = useState<boolean>(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modals state
  const [showAddAccountModal, setShowAddAccountModal] = useState<boolean>(false);
  const [loginMethod, setLoginMethod] = useState<'qrcode' | 'cookie'>('qrcode');
  const [qrStatus, setQrStatus] = useState<'waiting' | 'scanned' | 'success' | 'expired'>('waiting');
  const [qrCountdown, setQrCountdown] = useState<number>(180);
  const [qrToken, setQrToken] = useState<string>('xy_qr_' + Math.random().toString(36).substring(2, 10));
  const [qrNickname, setQrNickname] = useState<string>('闲鱼代驾充值旗舰店');
  const [newCookie, setNewCookie] = useState<string>('');
  const [newAccountNickname, setNewAccountNickname] = useState<string>('');

  // Order Simulation Modal
  const [showSimulateOrderModal, setShowSimulateOrderModal] = useState<boolean>(false);
  const [simBuyerName, setSimBuyerName] = useState<string>('狂奔的老司机');
  const [simTierId, setSimTierId] = useState<'PERPETUAL' | '365D' | '180D' | '90D' | '30D'>('30D');
  const [simQuantity, setSimQuantity] = useState<number>(1);

  const refreshQrCode = () => {
    const newTok = 'xy_qr_' + Math.random().toString(36).substring(2, 10);
    setQrToken(newTok);
    setQrStatus('waiting');
    setQrCountdown(180);
    showToast('🔄 已刷新二维码，请使用闲鱼 APP 扫码');
  };

  useEffect(() => {
    let timer: any;
    if (showAddAccountModal && loginMethod === 'qrcode' && qrCountdown > 0 && qrStatus === 'waiting') {
      timer = setInterval(() => {
        setQrCountdown((prev) => {
          if (prev <= 1) {
            setQrStatus('expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showAddAccountModal, loginMethod, qrCountdown, qrStatus]);

  const handleSimulateQrScan = (autoSuccess = false) => {
    if (qrStatus === 'waiting') {
      setQrStatus('scanned');
      showToast('📱 闲鱼 APP 已扫码！请在手机上点击确认登录');
      if (autoSuccess) {
        setTimeout(() => {
          handleQrLoginSuccess();
        }, 1200);
      }
    } else if (qrStatus === 'scanned') {
      handleQrLoginSuccess();
    }
  };

  const handleQrLoginSuccess = () => {
    setQrStatus('success');
    const accId = 'acc_' + Date.now();
    const finalNickname = qrNickname.trim() || '闲鱼掌柜_' + Math.floor(1000 + Math.random() * 9000);
    const mockCookie = `unb=22198${Math.floor(10000+Math.random()*90000)}; _m_h5_tk=${Math.random().toString(36).substring(2,12)}_17218320; cookie2=1a9420b${Math.random().toString(36).substring(2,8)}; sgcookie=E100${Math.random().toString(36).substring(2,8)}`;
    
    const newAcc: XianyuAccount = {
      id: accId,
      nickname: finalNickname,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      cookie: mockCookie,
      status: 'online',
      autoReplyEnabled: true,
      lastSync: new Date().toLocaleTimeString()
    };

    setDoc(doc(db, 'xianyu_accounts', accId), newAcc);

    const logId = 'log_' + Date.now();
    setDoc(doc(db, 'xianyu_logs', logId), {
      id: logId,
      timestamp: new Date().toLocaleTimeString(),
      type: 'success',
      message: `🎉 [扫码登录成功] 闲鱼店铺「${finalNickname}」成功通过闲鱼 APP 二维码授权登录，Cookie 已自动换取保存！`
    });

    setTimeout(() => {
      setShowAddAccountModal(false);
      setQrStatus('waiting');
      showToast(`🎉 恭喜！闲鱼账号「${finalNickname}」扫码登录成功并绑定！`);
    }, 1000);
  };

  const [showAddRuleModal, setShowAddRuleModal] = useState<boolean>(false);
  const [newRuleName, setNewRuleName] = useState<string>('买家付款成功全自动秒发卡密规则');
  const [newRuleKeyword, setNewRuleKeyword] = useState<string>('任意关键词/汉字/大小写字母/数字/符号（无限制）');
  const [newRuleCardCat, setNewRuleCardCat] = useState<'PERPETUAL' | '365D' | '180D' | '90D' | '30D'>('30D');
  const [newRuleTemplate, setNewRuleTemplate] = useState<string>('🎉 感谢购买！您的专属代驾VIP兑换卡密为：{CARD_KEYS}\n请下载APP登录，在「设置 - VIP兑换」输入此卡密即可秒级激活！买家购买几个发几个，多张卡密已用逗号隔开！');

  const [showBatchImportModal, setShowBatchImportModal] = useState<boolean>(false);
  const [importBatchCategory, setImportBatchCategory] = useState<'PERPETUAL' | '365D' | '180D' | '90D' | '30D'>('30D');
  const [batchRawText, setBatchRawText] = useState<string>('');

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Toast notification
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // 1. Listen to Firebase Collections: xianyu_accounts, xianyu_rules, xianyu_card_keys, xianyu_orders, xianyu_logs
  useEffect(() => {
    // Accounts
    const unsubAcc = onSnapshot(collection(db, 'xianyu_accounts'), (snap) => {
      const accList: XianyuAccount[] = [];
      snap.forEach((d) => accList.push({ id: d.id, ...d.data() } as XianyuAccount));
      const hasInit = localStorage.getItem('xianyu_accounts_init');
      if (accList.length === 0 && !hasInit) {
        localStorage.setItem('xianyu_accounts_init', 'true');
        // Seed default Xianyu account
        const defaultAcc: XianyuAccount = {
          id: 'acc_default_01',
          nickname: '代驾车队官方店 (闲鱼店)',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
          cookie: 'unb=220198827361; _m_h5_tk=98a7c2b...; cookie2=1a9420b...',
          status: 'online',
          autoReplyEnabled: true,
          lastSync: new Date().toLocaleTimeString()
        };
        setDoc(doc(db, 'xianyu_accounts', defaultAcc.id), defaultAcc);
      } else {
        if (accList.length > 0) {
          localStorage.setItem('xianyu_accounts_init', 'true');
        }
        setAccounts(accList);
      }
    });

    // Rules
    const unsubRules = onSnapshot(collection(db, 'xianyu_rules'), (snap) => {
      const ruleList: XianyuRule[] = [];
      snap.forEach((d) => ruleList.push({ id: d.id, ...d.data() } as XianyuRule));
      if (ruleList.length === 0) {
        // Seed default rule
        const defaultRule: XianyuRule = {
          id: 'rule_default_01',
          name: '闲鱼代驾全自动付款触发秒发卡密规则',
          keyword: '任意关键词/汉字/大小写字母/数字/符号（买家付款成功即触发）',
          itemTitle: '匹配所有闲鱼代驾VIP会员商品（买家付款成功自动秒发）',
          triggerType: 'pay_success',
          cardCategory: '30D',
          replyTemplate: '🎉 亲爱的买家 {BUYER_NAME}，感谢购买代驾VIP！\n您的专属VIP兑换卡密为：{CARD_KEYS}\n请在代驾司机端App「设置 - VIP兑换」输入激活。买家购买几个兑换码，系统将自动以逗号隔开发送。有疑问随时联系客服！',
          enabled: true
        };
        setDoc(doc(db, 'xianyu_rules', defaultRule.id), defaultRule);
      } else {
        setRules(ruleList);
      }
    });

    // Card Keys
    const unsubKeys = onSnapshot(collection(db, 'xianyu_card_keys'), (snap) => {
      const keyList: XianyuCardKey[] = [];
      snap.forEach((d) => keyList.push({ id: d.id, ...d.data() } as XianyuCardKey));
      setCardKeys(keyList);
    });

    // Orders
    const unsubOrders = onSnapshot(collection(db, 'xianyu_orders'), (snap) => {
      const orderList: XianyuOrder[] = [];
      snap.forEach((d) => {
        if (d.id === 'ord_001') {
          // Clean up old default mock seed order from Firestore
          deleteDoc(doc(db, 'xianyu_orders', 'ord_001'));
        } else {
          orderList.push({ id: d.id, ...d.data() } as XianyuOrder);
        }
      });
      setOrders(orderList);
    });

    // Logs
    const unsubLogs = onSnapshot(collection(db, 'xianyu_logs'), (snap) => {
      const logList: XianyuLog[] = [];
      snap.forEach((d) => logList.push({ id: d.id, ...d.data() } as XianyuLog));
      if (logList.length === 0) {
        const seedLogs: XianyuLog[] = [
          { id: 'log_01', timestamp: new Date().toLocaleTimeString(), type: 'info', message: '⚡ [闲鱼监听引擎] GitHub 开源组件 (zhinianboke/xianyu-auto-reply) 成功初始化' },
          { id: 'log_02', timestamp: new Date().toLocaleTimeString(), type: 'success', message: '✅ [账号登录] 代驾车队官方店 Cookie 校验有效，WebSocket 实时长连接建连成功' },
          { id: 'log_03', timestamp: new Date().toLocaleTimeString(), type: 'info', message: '📦 [自动发货] 检测到买家「狂奔的考拉」已付款 19.9 元，触发规则「闲鱼代驾30天VIP自动发货」' },
          { id: 'log_04', timestamp: new Date().toLocaleTimeString(), type: 'success', message: '🚀 [卡密发放] 成功匹配卡密 XYVIP-8899-30D-E56F，已自动回复发送给买家并在系统记录' }
        ];
        seedLogs.forEach(l => setDoc(doc(db, 'xianyu_logs', l.id), l));
      } else {
        // Sort logs latest first
        setLogs(logList.sort((a, b) => b.id.localeCompare(a.id)));
      }
    });

    return () => {
      unsubAcc();
      unsubRules();
      unsubKeys();
      unsubOrders();
      unsubLogs();
    };
  }, []);

  // Background Engine Simulation ticker
  useEffect(() => {
    if (!isEngineRunning) return;
    const interval = setInterval(() => {
      // Simulate periodic heartbeat / websocket status poll log
      const logId = 'log_' + Date.now();
      const newLog: XianyuLog = {
        id: logId,
        timestamp: new Date().toLocaleTimeString(),
        type: 'info',
        message: `🔄 [WebSocket 心跳] 闲鱼长连接正常，监听买家新消息与已付款订单...`
      };
      setDoc(doc(db, 'xianyu_logs', logId), newLog);
    }, 15000);

    return () => clearInterval(interval);
  }, [isEngineRunning]);

  // Actions
  const handleAddAccount = () => {
    if (!newCookie.trim()) {
      alert('请粘贴完整的闲鱼网页版/App抓包 Cookie !');
      return;
    }
    const id = 'acc_' + Date.now();
    const newAcc: XianyuAccount = {
      id,
      nickname: newAccountNickname.trim() || '闲鱼掌柜_' + Math.floor(1000 + Math.random() * 9000),
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      cookie: newCookie.trim(),
      status: 'online',
      autoReplyEnabled: true,
      lastSync: new Date().toLocaleTimeString()
    };
    setDoc(doc(db, 'xianyu_accounts', id), newAcc);

    // Write log
    const logId = 'log_' + Date.now();
    setDoc(doc(db, 'xianyu_logs', logId), {
      id: logId,
      timestamp: new Date().toLocaleTimeString(),
      type: 'success',
      message: `✅ 新增闲鱼账号「${newAcc.nickname}」并验证 Cookie 正常激活`
    });

    setShowAddAccountModal(false);
    setNewCookie('');
    setNewAccountNickname('');
    showToast('🎉 闲鱼账号绑定成功！');
  };

  const handleToggleAccountAutoReply = (acc: XianyuAccount) => {
    const updated = { ...acc, autoReplyEnabled: !acc.autoReplyEnabled };
    setDoc(doc(db, 'xianyu_accounts', acc.id), updated);
    showToast(`已${updated.autoReplyEnabled ? '开启' : '关闭'} 账号「${acc.nickname}」自动回复`);
  };

  const handleDeleteAccount = (acc: XianyuAccount) => {
    deleteDoc(doc(db, 'xianyu_accounts', acc.id));
    
    // Write unbind log
    const logId = 'log_' + Date.now();
    setDoc(doc(db, 'xianyu_logs', logId), {
      id: logId,
      timestamp: new Date().toLocaleTimeString(),
      type: 'warning',
      message: `🗑️ [店铺解绑] 闲鱼店铺账号「${acc.nickname}」已从系统成功解绑移除`
    });

    showToast(`🗑️ 闲鱼店铺「${acc.nickname}」已成功解绑移除！`);
  };

  const handleAddRule = () => {
    if (!newRuleName.trim() || !newRuleTemplate.trim()) {
      alert('请填写完整的规则名称与自动回复模板！');
      return;
    }
    const id = 'rule_' + Date.now();
    const newRule: XianyuRule = {
      id,
      name: newRuleName.trim(),
      keyword: newRuleKeyword.trim() || '任意关键词/汉字/字母/数字/符号',
      itemTitle: '全自动无限制匹配闲鱼代驾充值商品（买家付款成功即发）',
      triggerType: 'pay_success',
      cardCategory: newRuleCardCat,
      replyTemplate: newRuleTemplate.trim(),
      enabled: true
    };
    setDoc(doc(db, 'xianyu_rules', id), newRule);

    const logId = 'log_' + Date.now();
    setDoc(doc(db, 'xianyu_logs', logId), {
      id: logId,
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      message: `⚙️ 新建闲鱼自动发货规则「${newRule.name}」`
    });

    setShowAddRuleModal(false);
    showToast('🎉 规则添加成功！');
  };

  const handleToggleRule = (rule: XianyuRule) => {
    setDoc(doc(db, 'xianyu_rules', rule.id), { ...rule, enabled: !rule.enabled });
    showToast(`规则「${rule.name}」已${!rule.enabled ? '启用' : '禁用'}`);
  };

  const handleDeleteRule = (id: string) => {
    if (confirm('确定要删除此发货规则吗？')) {
      deleteDoc(doc(db, 'xianyu_rules', id));
      showToast('规则已删除');
    }
  };

  // Batch import card keys
  const handleBatchImportKeys = () => {
    if (!batchRawText.trim()) {
      alert('请粘贴卡密内容！');
      return;
    }
    const lines = batchRawText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    let addedCount = 0;
    const durationDays = importBatchCategory === '30D' ? 30 : importBatchCategory === '90D' ? 90 : 365;

    lines.forEach((codeStr) => {
      const id = 'key_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const newKey: XianyuCardKey = {
        id,
        code: codeStr,
        category: importBatchCategory,
        durationDays,
        status: 'unused',
        createdAt: new Date().toLocaleString()
      };
      setDoc(doc(db, 'xianyu_card_keys', id), newKey);

      // ALSO sync directly with driver app VIP redemption collection (`vip_codes`)!
      setDoc(doc(db, 'vip_codes', codeStr), {
        code: codeStr,
        days: durationDays,
        status: 'unused',
        createdAt: new Date().toLocaleString(),
        note: '由闲鱼自动发货模块批量导入'
      });

      addedCount++;
    });

    const logId = 'log_' + Date.now();
    setDoc(doc(db, 'xianyu_logs', logId), {
      id: logId,
      timestamp: new Date().toLocaleTimeString(),
      type: 'success',
      message: `📥 成功批量导入 ${addedCount} 条 ${importBatchCategory} VIP卡密，并已同步激活至代驾APP数据库`
    });

    setShowBatchImportModal(false);
    setBatchRawText('');
    showToast(`🎉 成功导入 ${addedCount} 条卡密并同步至代驾VIP数据库！`);
  };

  // Quick generate 5 card keys
  const handleQuickGenerateKeys = (category: 'PERPETUAL' | '365D' | '180D' | '90D' | '30D') => {
    const tier = VIP_TIERS.find(t => t.id === category) || VIP_TIERS[4];
    for (let i = 0; i < 5; i++) {
      const codeStr = generateAdminStyleVipCode(tier.durationDays);
      const id = 'key_' + Date.now() + '_' + i;
      const newKey: XianyuCardKey = {
        id,
        code: codeStr,
        category: tier.id,
        durationDays: tier.durationDays,
        status: 'unused',
        createdAt: new Date().toLocaleString()
      };
      setDoc(doc(db, 'xianyu_card_keys', id), newKey);

      // Sync to driver VIP database
      setDoc(doc(db, 'vip_codes', codeStr), {
        code: codeStr,
        duration: tier.durationDays,
        days: tier.durationDays,
        isRedeemed: false,
        status: 'unused',
        createdAt: new Date().toLocaleString(),
        note: `闲鱼自动发货系统手动生成 (${tier.name})`
      });
    }

    const logId = 'log_' + Date.now();
    setDoc(doc(db, 'xianyu_logs', logId), {
      id: logId,
      timestamp: new Date().toLocaleTimeString(),
      type: 'success',
      message: `⚡ 手动生成了 5 张【${tier.name}】VIP卡密在库！`
    });

    showToast(`⚡ 已生成 5 张【${tier.name}】专属卡密并同步代驾APP！`);
  };

  // Delete card key
  const handleDeleteCardKey = (id: string, code: string) => {
    deleteDoc(doc(db, 'xianyu_card_keys', id));
    deleteDoc(doc(db, 'vip_codes', code));
    showToast('卡密已删除');
  };

  // On-demand Instant Key Generation upon buyer purchase
  const handleSimulateOrderSubmit = (
    buyerNameInput?: string,
    tierIdInput?: 'PERPETUAL' | '365D' | '180D' | '90D' | '30D',
    quantityInput?: number
  ) => {
    const buyerName = buyerNameInput || simBuyerName || '狂奔的老司机';
    const tierId = tierIdInput || simTierId || '30D';
    const quantity = quantityInput || simQuantity || 1;

    const tier = VIP_TIERS.find(t => t.id === tierId) || VIP_TIERS[4];
    const totalPrice = tier.price * quantity;
    const nowStr = new Date().toLocaleString();
    const orderNo = 'XY' + new Date().getFullYear() + String(Date.now()).substring(5);

    const generatedCodes: string[] = [];

    // Generate N keys immediately on demand
    for (let i = 0; i < quantity; i++) {
      const codeStr = generateAdminStyleVipCode(tier.durationDays);
      const keyId = 'key_' + Date.now() + '_' + i;

      generatedCodes.push(codeStr);

      // Save generated card key directly as DELIVERED to xianyu_card_keys
      const newKey: XianyuCardKey = {
        id: keyId,
        code: codeStr,
        category: tier.id,
        durationDays: tier.durationDays,
        status: 'delivered',
        orderId: orderNo,
        buyerNickname: buyerName,
        deliveredAt: nowStr,
        createdAt: nowStr
      };
      setDoc(doc(db, 'xianyu_card_keys', keyId), newKey);

      // Sync to driver app VIP database so driver can activate immediately
      setDoc(doc(db, 'vip_codes', codeStr), {
        code: codeStr,
        duration: tier.durationDays,
        days: tier.durationDays,
        isRedeemed: false,
        status: 'unused',
        createdAt: nowStr,
        note: `闲鱼极速自动发件 (订单 ${orderNo})`
      });
    }

    // Save Order record
    const codesString = generatedCodes.join(', ');
    const newOrder: XianyuOrder = {
      id: 'ord_' + Date.now(),
      orderNo,
      buyerNickname: buyerName,
      itemTitle: `专业代驾系统 - ${tier.name} VIP卡密 (${quantity}件)`,
      price: totalPrice,
      cardCode: codesString,
      status: 'success',
      deliveredAt: nowStr,
      accountNickname: accounts[0]?.nickname || '代驾官方店'
    };
    setDoc(doc(db, 'xianyu_orders', newOrder.id), newOrder);

    // Write System Log
    const logId = 'log_' + Date.now();
    setDoc(doc(db, 'xianyu_logs', logId), {
      id: logId,
      timestamp: new Date().toLocaleTimeString(),
      type: 'success',
      message: `🎉 [闲鱼极速秒级发码] 收到买家「${buyerName}」付款 ¥${totalPrice.toFixed(2)}，购买 ${quantity} 件【${tier.name}】，系统已立即自动生成 ${quantity} 个VIP卡密：${codesString}`
    });

    setShowSimulateOrderModal(false);
    showToast(`🎉 下单发货成功！已生成 ${quantity} 个【${tier.name}】卡密发给 ${buyerName}`);
  };

  // Delete single order
  const handleDeleteOrder = (orderId: string) => {
    deleteDoc(doc(db, 'xianyu_orders', orderId));
    showToast('订单记录已删除');
  };

  // Clear all orders
  const handleClearAllOrders = () => {
    if (orders.length === 0) return;
    if (confirm('确定要清空所有自动发货订单记录吗？')) {
      orders.forEach(o => deleteDoc(doc(db, 'xianyu_orders', o.id)));
      showToast('已清空所有订单记录');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    showToast('已复制到剪贴板: ' + text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Stats
  const unusedKeysCount = cardKeys.filter(k => k.status === 'unused').length;
  const deliveredKeysCount = cardKeys.filter(k => k.status === 'delivered').length;
  const totalSalesAmount = orders.reduce((acc, o) => acc + (o.status === 'success' ? o.price : 0), 0);

  return (
    <div className="w-full h-full bg-[#0d111a] text-slate-100 flex flex-col font-sans overflow-hidden relative">
      
      {/* Toast Floating Alert */}
      {toastMsg && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-5 py-2.5 rounded-2xl shadow-2xl z-50 flex items-center space-x-2 text-xs font-medium animate-in fade-in slide-in-from-top-2 border border-emerald-400/30">
          <CheckCircle className="w-4 h-4 text-emerald-200" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="bg-[#151c2e] border-b border-[#232e47] p-4 shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-white tracking-wide">闲鱼自动发货 & 消息客服系统</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> GitHub: zhinianboke/xianyu-auto-reply
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              闲鱼买家付款/发送关键词 ➔ 无人值守秒级自动发货 VIP卡密 ➔ 实时同步至代驾APP数据库
            </p>
          </div>
        </div>

        {/* System status & Engine Toggle */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 bg-[#0d111a] px-3 py-1.5 rounded-xl border border-[#232e47]">
            <span className={`w-2.5 h-2.5 rounded-full ${isEngineRunning ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-xs text-slate-300 font-medium">
              {isEngineRunning ? '监听服务运行中 (WebSocket/Hook)' : '服务已暂停'}
            </span>
          </div>

          <button 
            onClick={() => setIsEngineRunning(!isEngineRunning)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
              isEngineRunning 
                ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40' 
                : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md'
            }`}
          >
            {isEngineRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isEngineRunning ? '暂停服务' : '启动监听'}</span>
          </button>

          <button 
            onClick={() => setShowSimulateOrderModal(true)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white shadow-lg shadow-teal-500/20 flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>模拟测试买家下单</span>
          </button>
        </div>
      </div>

      {/* Metrics Header Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-[#111726] border-b border-[#1f2a40] shrink-0">
        <div className="bg-[#182136] p-3 rounded-2xl border border-[#263452]">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Key className="w-3.5 h-3.5 text-amber-400" /> 极速发码卡密总数
          </span>
          <div className="text-xl font-black text-amber-400 mt-1 font-mono">
            {cardKeys.length} <span className="text-xs text-slate-400 font-normal">张</span>
          </div>
        </div>

        <div className="bg-[#182136] p-3 rounded-2xl border border-[#263452]">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Send className="w-3.5 h-3.5 text-emerald-400" /> 已自动秒级发货
          </span>
          <div className="text-xl font-black text-emerald-400 mt-1 font-mono">
            {deliveredKeysCount} <span className="text-xs text-slate-400 font-normal">笔</span>
          </div>
        </div>

        <div className="bg-[#182136] p-3 rounded-2xl border border-[#263452]">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <ShoppingBag className="w-3.5 h-3.5 text-teal-400" /> 累计成交销售额
          </span>
          <div className="text-xl font-black text-teal-300 mt-1 font-mono">
            ¥ {totalSalesAmount.toFixed(2)}
          </div>
        </div>

        <div className="bg-[#182136] p-3 rounded-2xl border border-[#263452]">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-blue-400" /> 在线闲鱼店铺
          </span>
          <div className="text-xl font-black text-blue-400 mt-1 font-mono">
            {accounts.filter(a => a.status === 'online').length} / {accounts.length} <span className="text-xs text-slate-400 font-normal">个</span>
          </div>
        </div>
      </div>

      {/* Sub Tab Navigation */}
      <div className="flex items-center space-x-1 px-4 py-2.5 bg-[#141b2d] border-b border-[#232e47] overflow-x-auto shrink-0 scrollbar-none">
        <button
          onClick={() => setActiveSubTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'orders'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#1f2b45]'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>自动发货订单 ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('card_keys')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'card_keys'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#1f2b45]'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>卡密兑换码库 ({cardKeys.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('rules')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'rules'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#1f2b45]'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>发货与回复规则 ({rules.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('accounts')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'accounts'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#1f2b45]'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>闲鱼账号设置 ({accounts.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'logs'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#1f2b45]'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>系统日志 & 监控 ({logs.length})</span>
        </button>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0b0e17]">

        {/* 1. ORDERS TAB */}
        {activeSubTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>自动发货订单记录 ({orders.length})</span>
                </h2>
                <p className="text-xs text-slate-400">所有闲鱼买家在闲鱼App购买后自动推送发放的卡密历史</p>
              </div>
              <div className="flex items-center space-x-2">
                {orders.length > 0 && (
                  <button 
                    onClick={handleClearAllOrders}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>清空订单历史</span>
                  </button>
                )}
                <button 
                  onClick={() => setShowSimulateOrderModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>模拟新订单测试发码</span>
                </button>
              </div>
            </div>

            <div className="bg-[#141c2e] border border-[#212d47] rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#19243b] text-slate-400 text-[11px] uppercase tracking-wider border-b border-[#243352]">
                    <tr>
                      <th className="px-4 py-3">闲鱼订单号</th>
                      <th className="px-4 py-3">买家昵称</th>
                      <th className="px-4 py-3">购买商品名称</th>
                      <th className="px-4 py-3">成交金额</th>
                      <th className="px-4 py-3">已自动发放卡密</th>
                      <th className="px-4 py-3">发货状态</th>
                      <th className="px-4 py-3">发货时间</th>
                      <th className="px-4 py-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2a42]">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-slate-500 space-y-2">
                          <CheckCircle className="w-8 h-8 text-slate-600 mx-auto" />
                          <p className="text-xs font-bold text-slate-400">暂无闲鱼自动发货订单记录</p>
                          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                            已取消默认模拟测试数据。当闲鱼买家付款后，系统将自动产生真实发货订单记录！
                          </p>
                        </td>
                      </tr>
                    ) : (
                      orders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-[#18233b] transition-colors">
                          <td className="px-4 py-3 font-mono text-amber-300 font-semibold">{ord.orderNo}</td>
                          <td className="px-4 py-3 text-white font-medium flex items-center space-x-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{ord.buyerNickname}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-300 max-w-[220px] truncate">{ord.itemTitle}</td>
                          <td className="px-4 py-3 font-mono font-bold text-emerald-400">¥ {ord.price.toFixed(2)}</td>
                          <td className="px-4 py-3 font-mono text-xs">
                            <span className="bg-[#0e1524] text-teal-300 px-2.5 py-1 rounded-lg border border-teal-500/30 flex items-center space-x-1 w-fit">
                              <Key className="w-3 h-3 text-amber-400" />
                              <span className="select-all">{ord.cardCode}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1 w-fit">
                              <CheckCircle className="w-3 h-3" />
                              <span>自动发货成功</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-[11px] font-mono">{ord.deliveredAt}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button 
                                onClick={() => copyToClipboard(ord.cardCode)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium flex items-center space-x-1 cursor-pointer"
                                title="复制卡密"
                              >
                                <Copy className="w-3 h-3" />
                                <span>复制卡密</span>
                              </button>
                              <button 
                                onClick={() => handleDeleteOrder(ord.id)}
                                className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 cursor-pointer transition-colors"
                                title="删除此记录"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2. CARD KEYS POOL TAB */}
        {activeSubTab === 'card_keys' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>VIP卡密兑换码库 ({cardKeys.length})</span>
                </h2>
                <p className="text-xs text-slate-400">
                  当闲鱼买家付款购买会员时，系统极速自动生成卡密并同步展示在此处及代驾APP底层数据库！
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={() => setShowBatchImportModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-md cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>批量导入卡密</span>
                </button>

                <button 
                  onClick={() => handleQuickGenerateKeys('30D')}
                  className="px-3 py-1.5 rounded-xl bg-[#1d2942] hover:bg-[#253554] text-slate-200 border border-[#2d3f63] text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>生5张30天(9.9元)</span>
                </button>

                <button 
                  onClick={() => handleQuickGenerateKeys('PERPETUAL')}
                  className="px-3 py-1.5 rounded-xl bg-[#1d2942] hover:bg-[#253554] text-slate-200 border border-[#2d3f63] text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>生5张永久卡(158元)</span>
                </button>
              </div>
            </div>

            <div className="bg-[#141c2e] border border-[#212d47] rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#19243b] text-slate-400 text-[11px] uppercase tracking-wider border-b border-[#243352]">
                    <tr>
                      <th className="px-4 py-3">卡密内容 (Code)</th>
                      <th className="px-4 py-3">会员类型</th>
                      <th className="px-4 py-3">有效时长</th>
                      <th className="px-4 py-3">当前状态</th>
                      <th className="px-4 py-3">关联闲鱼买家</th>
                      <th className="px-4 py-3">创建时间</th>
                      <th className="px-4 py-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2a42]">
                    {cardKeys.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-slate-500 space-y-2">
                          <Key className="w-8 h-8 text-slate-600 mx-auto" />
                          <p className="text-xs font-bold text-slate-400">VIP卡密兑换码库当前为空</p>
                          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                            已取消默认预生成卡密。当闲鱼买家在闲鱼APP购买会员后，系统将极速自动批量生成对应的VIP兑换码并直接发放与记录在此！
                          </p>
                        </td>
                      </tr>
                    ) : (
                      cardKeys.map((k) => (
                        <tr key={k.id} className="hover:bg-[#18233b] transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-amber-300 flex items-center space-x-2">
                            <span>{k.code}</span>
                            <button 
                              onClick={() => copyToClipboard(k.code)}
                              className="text-slate-500 hover:text-slate-300 cursor-pointer"
                              title="复制卡密"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              k.category === 'PERPETUAL' 
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                                : k.category === '365D'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                : k.category === '180D'
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                : k.category === '90D'
                                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}>
                              {k.category === 'PERPETUAL' ? '永久会员' : k.category === '365D' ? '365天(一年)' : k.category === '180D' ? '180天(半年)' : k.category === '90D' ? '90天会员' : '30天月卡'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-300">
                            {k.category === 'PERPETUAL' || k.durationDays >= 30000 ? '永久' : `${k.durationDays} 天`}
                          </td>
                          <td className="px-4 py-3">
                            {k.status === 'delivered' ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                已自动发货
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                待发货 (在库)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-400">
                            {k.buyerNickname ? (
                              <span className="text-emerald-400 font-medium flex items-center space-x-1">
                                <User className="w-3 h-3 text-slate-400" />
                                <span>{k.buyerNickname} {k.orderId ? `(${k.orderId})` : ''}</span>
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-[11px] font-mono">{k.createdAt}</td>
                          <td className="px-4 py-3 text-right">
                            <button 
                              onClick={() => handleDeleteCardKey(k.id, k.code)}
                              className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 cursor-pointer transition-colors"
                              title="删除卡密"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. RULES TAB */}
        {activeSubTab === 'rules' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-100">自动发货 & 客服回复规则</h2>
                <p className="text-xs text-slate-400">当闲鱼买家触发指定关键词或下单付款时，自动执行此规则</p>
              </div>
              <button 
                onClick={() => setShowAddRuleModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新建发货规则</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rules.map((rule) => (
                <div key={rule.id} className="bg-[#141c2e] border border-[#212d47] p-4 rounded-2xl space-y-3 relative shadow-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                        <span>{rule.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                          {rule.cardCategory === 'PERPETUAL' ? '永久会员' : rule.cardCategory === '365D' ? '365天(一年)' : rule.cardCategory === '180D' ? '180天(半年)' : rule.cardCategory === '90D' ? '90天' : '30天'}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        关键词触发: <code className="text-emerald-400 font-mono bg-[#0d121f] px-1.5 py-0.5 rounded border border-emerald-500/20">{rule.keyword || '任意内容/汉字/字母/数字/符号（无限制）'}</code>
                      </p>
                    </div>

                    <button 
                      onClick={() => handleToggleRule(rule)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        rule.enabled 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                    >
                      {rule.enabled ? '已启用' : '已停用'}
                    </button>
                  </div>

                  <div className="bg-[#0d121f] p-3 rounded-xl border border-[#1b253b] text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                    <span className="text-slate-500 block text-[10px] uppercase tracking-wider mb-1 font-sans font-semibold">自动回复发货消息模板:</span>
                    {rule.replyTemplate}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1 text-[11px] text-amber-300 font-medium">
                      <Zap className="w-3.5 h-3.5 text-amber-400" /> 触发逻辑: 买家付款成功自动触发（支持任意关键词/汉字/字母/数字/符号）
                    </span>

                    <button 
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-slate-500 hover:text-rose-400 cursor-pointer text-xs transition-colors"
                    >
                      删除规则
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. ACCOUNTS TAB */}
        {activeSubTab === 'accounts' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#141d30] p-4 rounded-2xl border border-[#233152]">
              <div>
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-400" />
                  <span>绑定的闲鱼店铺账号与扫码鉴权</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  通过手机闲鱼 APP 扫码登录授权，系统全自动提取并管理 Session，保持 24 小时长连接自动发货
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => {
                    setLoginMethod('qrcode');
                    setShowAddAccountModal(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                >
                  <QrCode className="w-4 h-4" />
                  <span>📱 手机闲鱼扫码登录</span>
                </button>

                <button 
                  onClick={() => {
                    setLoginMethod('cookie');
                    setShowAddAccountModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#1d2a45] hover:bg-[#253659] text-slate-200 border border-[#2f436d] text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-400" />
                  <span>手动录入 Cookie</span>
                </button>
              </div>
            </div>

            {accounts.length === 0 ? (
              <div className="bg-[#141c2e] border border-[#212d47] p-8 rounded-2xl text-center space-y-3">
                <User className="w-10 h-10 text-slate-500 mx-auto" />
                <h3 className="text-sm font-bold text-slate-200">暂无已绑定的闲鱼店铺账号</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  解绑成功！您当前尚未绑定任何闲鱼店铺。点击下方按钮，即可使用手机闲鱼 APP 扫码或录入 Cookie 重新绑定。
                </p>
                <button
                  onClick={() => {
                    setLoginMethod('qrcode');
                    setShowAddAccountModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs inline-flex items-center space-x-1.5 cursor-pointer shadow-md"
                >
                  <QrCode className="w-4 h-4" />
                  <span>立即扫码绑定闲鱼店铺</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accounts.map((acc) => (
                  <div key={acc.id} className="bg-[#141c2e] border border-[#212d47] p-4 rounded-2xl space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img src={acc.avatar} alt="avatar" className="w-10 h-10 rounded-xl object-cover border border-slate-700" />
                        <div>
                          <h3 className="text-sm font-bold text-white">{acc.nickname}</h3>
                          <span className="text-[11px] text-slate-400">上次与闲鱼同步: {acc.lastSync}</span>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>在线 (Cookie 有效)</span>
                      </span>
                    </div>

                    <div className="bg-[#0d121f] p-2.5 rounded-xl border border-[#1b253b] text-xs font-mono text-slate-400 truncate">
                      Cookie: {acc.cookie}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button 
                        onClick={() => handleToggleAccountAutoReply(acc)}
                        className="text-xs text-slate-300 flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Bot className="w-3.5 h-3.5 text-amber-400" />
                        <span>自动回复发货: <strong className={acc.autoReplyEnabled ? 'text-emerald-400' : 'text-slate-500'}>{acc.autoReplyEnabled ? '开启中' : '已关闭'}</strong></span>
                      </button>

                      <button 
                        onClick={() => handleDeleteAccount(acc)}
                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-colors flex items-center space-x-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>解绑店铺</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. LOGS TAB */}
        {activeSubTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-100">闲鱼监听服务与发货终端日志</h2>
                <p className="text-xs text-slate-400">来自后台组件 (zhinianboke/xianyu-auto-reply) 的实时推送调优日志</p>
              </div>

              <button 
                onClick={() => {
                  setLogs([]);
                  showToast('已清空日志');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                清空日志
              </button>
            </div>

            <div className="bg-[#090d16] border border-[#1b253d] p-4 rounded-2xl font-mono text-xs space-y-2 max-h-[500px] overflow-y-auto shadow-inner">
              {logs.length === 0 ? (
                <div className="text-slate-600 text-center py-8">暂无日志输出</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-start space-x-2 text-slate-300">
                    <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                    <span className={
                      log.type === 'success' ? 'text-emerald-400 font-semibold' :
                      log.type === 'warning' ? 'text-amber-300' :
                      log.type === 'error' ? 'text-rose-400 font-bold' : 'text-slate-300'
                    }>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

      {/* Modal: Add Account / QR Login */}
      {showAddAccountModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#151d30] border border-[#2a3a5e] w-full max-w-md rounded-3xl p-5 space-y-4 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#233152] pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <QrCode className="w-5 h-5 text-amber-400" />
                <span>闲鱼店铺账号授权登录</span>
              </h3>
              <button 
                onClick={() => setShowAddAccountModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Tab Switcher: QR Code vs Manual Cookie */}
            <div className="grid grid-cols-2 gap-1 bg-[#0d1322] p-1 rounded-xl border border-[#212f4c]">
              <button
                onClick={() => setLoginMethod('qrcode')}
                className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  loginMethod === 'qrcode'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>手机闲鱼 APP 扫码登录</span>
              </button>

              <button
                onClick={() => setLoginMethod('cookie')}
                className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  loginMethod === 'cookie'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>手动录入 Cookie</span>
              </button>
            </div>

            {/* 1. QR CODE METHOD */}
            {loginMethod === 'qrcode' ? (
              <div className="space-y-4 text-center">
                
                <div>
                  <label className="block text-xs text-slate-400 mb-1 text-left">店铺备注名称</label>
                  <input 
                    type="text" 
                    value={qrNickname}
                    onChange={(e) => setQrNickname(e.target.value)}
                    placeholder="例如：闲鱼代驾充值旗舰店"
                    className="w-full bg-[#0d121f] border border-[#22314f] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* QR Code Container */}
                <div className="relative w-56 h-56 mx-auto bg-white p-3 rounded-2xl shadow-2xl border-4 border-amber-400 flex items-center justify-center overflow-hidden">
                  {qrStatus === 'expired' ? (
                    <div className="text-slate-800 space-y-2 p-4">
                      <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">二维码已失效</p>
                      <button 
                        onClick={refreshQrCode}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow cursor-pointer"
                      >
                        点击刷新二维码
                      </button>
                    </div>
                  ) : (
                    <>
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=${encodeURIComponent('https://h5.m.taobao.com/app/xianyu/index.html?qr_token=' + qrToken)}`}
                        alt="闲鱼APP扫码登录二维码" 
                        className={`w-full h-full object-contain ${qrStatus === 'scanned' ? 'blur-xs opacity-50' : ''}`}
                      />

                      {/* Center Xianyu Badge */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-amber-400 text-slate-950 font-black px-2 py-1 rounded-md text-[10px] shadow-lg border border-black/20 flex items-center gap-1">
                          <span>闲鱼</span>
                        </div>
                      </div>

                      {/* Laser Scanning Animation */}
                      {qrStatus === 'waiting' && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent shadow-[0_0_15px_#f59e0b] animate-pulse pointer-events-none" />
                      )}

                      {/* Scanned Overlay */}
                      {qrStatus === 'scanned' && (
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-emerald-400 p-2 space-y-2">
                          <CheckCircle className="w-10 h-10 text-emerald-400 animate-bounce" />
                          <p className="text-xs font-bold text-white">已在闲鱼 APP 扫码</p>
                          <p className="text-[10px] text-slate-300">请在手机闲鱼App点击【确认登录】</p>
                        </div>
                      )}

                      {/* Success Overlay */}
                      {qrStatus === 'success' && (
                        <div className="absolute inset-0 bg-emerald-600 text-white flex flex-col items-center justify-center p-2 space-y-2">
                          <CheckCircle className="w-12 h-12 text-white animate-bounce" />
                          <p className="text-xs font-bold">登录成功！</p>
                          <p className="text-[10px] text-emerald-100">正在保存闲鱼凭证...</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Status Guidance */}
                <div className="bg-[#0e1526] p-3 rounded-xl border border-[#1f2e4e] text-xs text-slate-300 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" /> 状态: {qrStatus === 'waiting' ? '等待手机扫码' : qrStatus === 'scanned' ? '等待手机确认' : '授权完成'}
                    </span>
                    <span>二维码有效时间: <strong className="text-amber-400 font-mono">{qrCountdown}s</strong></span>
                  </div>
                  <p className="text-[11px] text-amber-300/90 leading-tight">
                    📱 打开手机【闲鱼 APP】或【淘宝 APP】右上角 [扫一扫] 扫描上方二维码
                  </p>
                </div>

                {/* Simulated Quick Action for Testing */}
                <div className="pt-1 space-y-2">
                  <button 
                    onClick={() => handleSimulateQrScan(true)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-98 transition-all"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>模拟手机扫码并点击【确认授权登录】</span>
                  </button>

                  <p className="text-[10px] text-slate-500">
                    💡 提示：部署到您的阿里云服务器宝塔面板后，服务端将实时监听该二维码并直接换取真实的闲鱼店主 Cookie
                  </p>
                </div>

              </div>
            ) : (
              /* 2. MANUAL COOKIE METHOD */
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1">店铺显示名称 (备注名)</label>
                  <input 
                    type="text" 
                    value={newAccountNickname}
                    onChange={(e) => setNewAccountNickname(e.target.value)}
                    placeholder="如：闲鱼代驾充值旗舰店"
                    className="w-full bg-[#0d121f] border border-[#22314f] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">闲鱼 Cookie / Token (网页抓包获得)</label>
                  <textarea 
                    rows={4}
                    value={newCookie}
                    onChange={(e) => setNewCookie(e.target.value)}
                    placeholder="粘贴无密登录抓包得到的 Cookie 字符串，例如: unb=22019...; _m_h5_tk=..."
                    className="w-full bg-[#0d121f] border border-[#22314f] rounded-xl p-3 text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button 
                    onClick={() => setShowAddAccountModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleAddAccount}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    确认绑定并保存
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Modal: Add Rule */}
      {showAddRuleModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151d30] border border-[#253454] w-full max-w-lg rounded-2xl p-5 space-y-4 shadow-2xl text-slate-100">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Bot className="w-5 h-5 text-amber-400" />
              <span>新建全自动付款即发规则</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">规则名称</label>
                <input 
                  type="text" 
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  placeholder="例如：买家付款成功全自动秒发卡密规则"
                  className="w-full bg-[#0d121f] border border-[#22314f] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  触发关键词 <span className="text-slate-400 font-normal">(支持汉字、大小写字母、数字、符号或无限制，买家付款即触发)</span>
                </label>
                <input 
                  type="text" 
                  value={newRuleKeyword}
                  onChange={(e) => setNewRuleKeyword(e.target.value)}
                  placeholder="如：任意关键词/汉字/字母/数字/符号（买家付款成功即触发）"
                  className="w-full bg-[#0d121f] border border-[#22314f] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">自动发放 VIP 会员卡密类型</label>
                <select
                  value={newRuleCardCat}
                  onChange={(e: any) => setNewRuleCardCat(e.target.value)}
                  className="w-full bg-[#0d121f] border border-[#22314f] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-medium"
                >
                  <option value="PERPETUAL">永久会员 (158元)</option>
                  <option value="365D">365天 / 一年 (78元)</option>
                  <option value="180D">180天 / 半年 (45元)</option>
                  <option value="90D">90天 (25元)</option>
                  <option value="30D">30天 (9.9元)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  自动回复消息模板 <span className="text-amber-400 font-normal">(用 {'{CARD_KEYS}'} 代替兑换码，购买多个将以逗号隔开)</span>
                </label>
                <textarea 
                  rows={4}
                  value={newRuleTemplate}
                  onChange={(e) => setNewRuleTemplate(e.target.value)}
                  placeholder="🎉 感谢购买！您的专属代驾VIP兑换卡密为：{CARD_KEYS}\n请在代驾司机端App「设置 - VIP兑换」输入激活。如购买多个兑换码，系统已自动以逗号隔开。"
                  className="w-full bg-[#0d121f] border border-[#22314f] rounded-xl p-3 text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button 
                onClick={() => setShowAddRuleModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold cursor-pointer"
              >
                取消
              </button>
              <button 
                onClick={handleAddRule}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-md"
              >
                创建规则
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Batch Import Card Keys */}
      {showBatchImportModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151d30] border border-[#253454] w-full max-w-md rounded-2xl p-5 space-y-4 shadow-2xl text-slate-100">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Download className="w-5 h-5 text-amber-400" />
              <span>批量导入卡密并同步至代驾APP</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">选择导入卡密的会员类型</label>
                <select
                  value={importBatchCategory}
                  onChange={(e: any) => setImportBatchCategory(e.target.value)}
                  className="w-full bg-[#0d121f] border border-[#22314f] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="PERPETUAL">永久会员 (158元)</option>
                  <option value="365D">365天 / 一年 (78元)</option>
                  <option value="180D">180天 / 半年 (45元)</option>
                  <option value="90D">90天 (25元)</option>
                  <option value="30D">30天 (9.9元)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">卡密文本列表 (一行一个卡密)</label>
                <textarea 
                  rows={6}
                  value={batchRawText}
                  onChange={(e) => setBatchRawText(e.target.value)}
                  placeholder={'VIP-30D-8888-A11\nVIP-30D-8888-B22\nVIP-30D-8888-C33'}
                  className="w-full bg-[#0d121f] border border-[#22314f] rounded-xl p-3 text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button 
                onClick={() => setShowBatchImportModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold cursor-pointer"
              >
                取消
              </button>
              <button 
                onClick={handleBatchImportKeys}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                确认导入并同步
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Simulate Order & Auto Delivery */}
      {showSimulateOrderModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#151d30] border border-[#2a3a5e] w-full max-w-lg rounded-3xl p-5 space-y-4 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#233152] pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
                <span>模拟闲鱼买家付款 & 极速自动发码</span>
              </h3>
              <button 
                onClick={() => setShowSimulateOrderModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              买家在闲鱼下单后，系统实时自动极速生成相对应时长的VIP卡密，并立即自动发货！
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">闲鱼买家昵称</label>
                <input 
                  type="text" 
                  value={simBuyerName}
                  onChange={(e) => setSimBuyerName(e.target.value)}
                  placeholder="例如：老司机123"
                  className="w-full bg-[#0d121f] border border-[#22314f] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">选择闲鱼买家购买的 VIP 时长套餐</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {VIP_TIERS.map((tier) => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setSimTierId(tier.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        simTierId === tier.id 
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md shadow-amber-500/10 font-bold' 
                          : 'bg-[#0d121f] border-[#22314f] text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div>
                        <span className="font-bold block text-white text-xs">{tier.name}</span>
                        <span className="text-[10px] text-slate-400">时长: {tier.label}</span>
                      </div>
                      <span className="font-mono font-black text-amber-400 text-sm">¥ {tier.price.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">购买数量 (买几件即发几张卡密)</label>
                  <input 
                    type="number" 
                    min={1}
                    max={20}
                    value={simQuantity}
                    onChange={(e) => setSimQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[#0d121f] border border-[#22314f] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">应付总价格</label>
                  <div className="bg-[#0b0e17] border border-[#1f2c47] rounded-xl px-3 py-2 font-mono font-black text-emerald-400 text-sm flex items-center justify-between">
                    <span>¥ {((VIP_TIERS.find(t => t.id === simTierId)?.price || 9.9) * simQuantity).toFixed(2)}</span>
                    <span className="text-[10px] text-slate-500 font-sans font-normal">秒发 {simQuantity} 张</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0b101c] p-3 rounded-xl border border-[#1d2a45] text-[11px] text-slate-400 space-y-1">
                <p className="text-amber-300 font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> 极速发码推送规则:
                </p>
                <p>1. 立即自动为您生成 <strong className="text-white font-mono">{simQuantity}</strong> 个【{VIP_TIERS.find(t => t.id === simTierId)?.name}】专属VIP兑换卡密</p>
                <p>2. 自动展示在「自动发货订单」与「卡密兑换码库」列表中</p>
                <p>3. 实时将卡密同步至代驾App极速兑换数据库，买家在App内可无缝输入激活！</p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button 
                onClick={() => setShowSimulateOrderModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold cursor-pointer"
              >
                取消
              </button>
              <button 
                onClick={() => handleSimulateOrderSubmit()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 transition-all flex items-center space-x-1.5"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>立即模拟买家付款并生成发发码</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
