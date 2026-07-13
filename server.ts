import 'dotenv/config';
import express from 'express';
import path from 'path';
import mysql from 'mysql2/promise';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';

import Dypnsapi20170525, * as $Dypnsapi20170525 from '@alicloud/dypnsapi20170525';
import * as $OpenApi from '@alicloud/openapi-client';

// Helper to safely instantiate Alibaba Cloud dypnsapi client with ESM/CJS interop support
function getDypnsClient() {
  const accessKeyId = process.env.ALIBABA_CLOUD_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET;
  
  if (!accessKeyId || !accessKeySecret) {
    return null;
  }
  
  let OpenApiConfigClass = ($OpenApi as any).Config;
  if (typeof OpenApiConfigClass !== 'function') {
    OpenApiConfigClass = ($OpenApi as any).default?.Config;
  }
  
  let DypnsClientClass = Dypnsapi20170525;
  if (typeof DypnsClientClass !== 'function') {
    if (DypnsClientClass && typeof (DypnsClientClass as any).default === 'function') {
      DypnsClientClass = (DypnsClientClass as any).default;
    } else if ($Dypnsapi20170525 && typeof ($Dypnsapi20170525 as any).default === 'function') {
      DypnsClientClass = ($Dypnsapi20170525 as any).default;
    } else if ($Dypnsapi20170525 && typeof ($Dypnsapi20170525 as any).Client === 'function') {
      DypnsClientClass = ($Dypnsapi20170525 as any).Client;
    }
  }

  if (typeof OpenApiConfigClass !== 'function') {
    throw new Error('Alibaba Cloud OpenAPI Config class constructor could not be resolved');
  }
  if (typeof DypnsClientClass !== 'function') {
    throw new Error('Alibaba Cloud Dypns Client class constructor could not be resolved');
  }

  const config = new OpenApiConfigClass({
    accessKeyId,
    accessKeySecret,
    endpoint: 'dypnsapi.aliyuncs.com',
  });
  
  return new DypnsClientClass(config);
}

// In-memory store for phone verification codes
const verificationCodes = new Map<string, { code: string; expiresAt: number }>();

// In-memory store for WeChat scan login sessions
const wechatSessions = new Map<string, { authorized: boolean; phone: string | null; expiresAt: number }>();

// Configure self-hosted MySQL option
let mysqlPool: mysql.Pool | null = null;
const isMySQLEnabled = !!process.env.MYSQL_HOST;

if (isMySQLEnabled) {
  console.log(`[Database] MySQL configuration detected. Connecting to ${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT || 3306}, Database: ${process.env.MYSQL_DATABASE}`);
  mysqlPool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    charset: 'utf8mb4'
  });

  // Automatically execute schema verification on boot
  (async () => {
    try {
      const conn = await mysqlPool!.getConnection();
      console.log('✓ [Database] Connected to local/ECS MySQL database successfully!');
      
      // Ensure the documents storage table exists
      await conn.query(`
        CREATE TABLE IF NOT EXISTS \`daijia_documents\` (
          \`collection\` VARCHAR(64) NOT NULL,
          \`doc_id\` VARCHAR(128) NOT NULL,
          \`data\` LONGTEXT NOT NULL,
          \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`collection\`, \`doc_id\`),
          INDEX \`idx_collection\` (\`collection\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      
      conn.release();
      console.log('✓ [Database] MySQL table structures "daijia_documents" verified successfully.');
    } catch (err: any) {
      console.error('❌ [Database] Failed to verify or connect to MySQL database:', err.message || err);
    }
  })();
} else {
  console.log('[Database] Running in Firebase Cloud Database mode (To switch to your self-hosted MySQL, configure MYSQL_HOST in your .env file).');
}

// Initialize server-side Firestore instance to bypass GFW firewalls inside emulator/mobile clients
const firebaseConfig = {
  projectId: "autonomous-abbey-nnzsc",
  appId: "1:270773766200:web:7b3caa1df6822ed079fecd",
  apiKey: "AIzaSyD1VHQ2AL0NklJCJCjy4EFqIs2HrqMy4RQ",
  authDomain: "autonomous-abbey-nnzsc.firebaseapp.com",
  storageBucket: "autonomous-abbey-nnzsc.firebasestorage.app",
  messagingSenderId: "270773766200"
};

const fbApp = initializeApp(firebaseConfig);
const db = initializeFirestore(fbApp, {
  experimentalForceLongPolling: true
}, "ai-studio-8c2c2304-5251-4eae-b3b7-9bbf375467a5");

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload size thresholds to avoid issues with large QR code images
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // CORS headers
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: Date.now() });
  });

  // WeChat domain verification route
  app.get('/9fe449b6d3069a0e1d9157132374017a.txt', (req, res) => {
    res.type('text/plain').send('9496c3005dc6f9c8dcab74dca7ad82028a77e765');
  });

  // Direct download endpoint for dist.zip to bypass IDE iframe download limitations
  app.get('/api/download-dist', (req, res) => {
    const filePath = path.join(process.cwd(), 'dist.zip');
    res.download(filePath, 'dist.zip', (err) => {
      if (err) {
        console.error('[Download Error] dist.zip serving failed:', err);
        if (!res.headersSent) {
          // Fall back to dist.tar.gz if zip fails
          const tarPath = path.join(process.cwd(), 'dist.tar.gz');
          res.download(tarPath, 'dist.tar.gz', (err2) => {
            if (err2) {
              res.status(404).send('Neither dist.zip nor dist.tar.gz was found on server. Please build first.');
            }
          });
        }
      }
    });
  });

  // Direct download endpoint for dist.tar.gz
  app.get('/api/download-dist-tar', (req, res) => {
    const filePath = path.join(process.cwd(), 'dist.tar.gz');
    res.download(filePath, 'dist.tar.gz', (err) => {
      if (err) {
        console.error('[Download Error] dist.tar.gz serving failed:', err);
        if (!res.headersSent) {
          res.status(404).send('dist.tar.gz not found on server. Please build first.');
        }
      }
    });
  });

  // --- WECHAT SCAN LOGIN ENDPOINTS ---

  // 1. Initialize a WeChat scan login session
  app.get('/api/wechat/session', (req, res) => {
    const sessionId = 'wechat_' + Math.random().toString(36).substring(2, 15);
    const expiresAt = Date.now() + 5 * 60 * 1000; // valid for 5 mins
    wechatSessions.set(sessionId, {
      authorized: false,
      phone: null,
      expiresAt
    });
    res.json({ success: true, sessionId, expiresAt });
  });

  // 2. Query WeChat session status (polling)
  app.get('/api/wechat/status', (req, res) => {
    const { session } = req.query;
    if (!session) {
      return res.status(400).json({ success: false, error: '缺少会话标识参数' });
    }
    const sessId = String(session);
    const record = wechatSessions.get(sessId);
    if (!record) {
      return res.json({ success: false, error: '会话不存在或已过期', code: 'EXPIRED' });
    }
    if (Date.now() > record.expiresAt) {
      wechatSessions.delete(sessId);
      return res.json({ success: false, error: '会话已过期，请刷新二维码', code: 'EXPIRED' });
    }
    res.json({
      success: true,
      authorized: record.authorized,
      phone: record.phone
    });
  });

  // 3. Authorize WeChat scan login session from mobile phone
  app.post('/api/wechat/authorize', (req, res) => {
    const { session, phone } = req.body;
    if (!session || !phone) {
      return res.status(400).json({ success: false, error: '缺少会话参数或手机号码' });
    }
    const sessId = String(session);
    const record = wechatSessions.get(sessId);
    if (!record) {
      return res.status(400).json({ success: false, error: '该登录二维码已过期，请在电脑端刷新重试' });
    }
    if (Date.now() > record.expiresAt) {
      wechatSessions.delete(sessId);
      return res.status(400).json({ success: false, error: '该登录二维码已过期，请在电脑端刷新重试' });
    }

    // Set authorized and link phone number
    record.authorized = true;
    record.phone = String(phone).trim();
    wechatSessions.set(sessId, record);

    console.log(`[WeChat Auth] Session ${sessId} authorized successfully for phone ${phone}`);
    res.json({ success: true, message: '微信授权登录成功！您的电脑端将自动登录。' });
  });

  // 1. Send SMS Code via Alibaba Cloud SMS or Simulated Sandbox
  app.post('/api/sms/send', async (req, res) => {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: '手机号码不能为空' });
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, error: '请输入正确的11位手机号码' });
    }

    const accessKeyId = process.env.ALIBABA_CLOUD_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET;

    const isSimulated = !accessKeyId || !accessKeySecret;

    if (isSimulated) {
      // Generate 4-digit code (since Aliyun SMS template uses 4 digits)
      const code = String(Math.floor(1000 + Math.random() * 9000));
      const expiresAt = Date.now() + 5 * 60 * 1000; // valid for 5 mins
      verificationCodes.set(phone, { code, expiresAt });

      console.log(`[SMS Server] [SIMULATION] (Alibaba Cloud SMS credentials missing) Code for ${phone} is: ${code}`);
      return res.json({
        success: true,
        mode: 'simulated',
        code: code,
        message: '💡 提示：验证码测试模拟已在浮窗中推送，请直接输入。'
      });
    }

    // Real Mode - Alibaba Cloud SMS
    try {
      console.log(`[Alibaba Cloud SMS] Requesting SendSmsVerifyCode for: ${phone}`);
      const client = getDypnsClient();
      if (!client) {
        throw new Error('Alibaba Cloud client initialization failed');
      }

      const sendRequestClass = ($Dypnsapi20170525 as any).SendSmsVerifyCodeRequest || ($Dypnsapi20170525 as any).default?.SendSmsVerifyCodeRequest || (Dypnsapi20170525 as any)?.SendSmsVerifyCodeRequest;
      const requestParams = {
        phoneNumber: String(phone),
        signName: '恒创联众',
        templateCode: '100001',
        templateParam: JSON.stringify({ code: '##code##', min: '5' }),
        schemeName: '默认方案',
        codeLength: 4,
        validTime: 300,
        duplicatePolicy: 1,
        interval: 60,
        codeType: 1,
        returnVerifyCode: true,
      };

      const sendRequest = sendRequestClass ? new sendRequestClass(requestParams) : requestParams;
      const response = await client.sendSmsVerifyCode(sendRequest);

      console.log('[Alibaba Cloud SMS] Response received:', JSON.stringify(response));

      // Check if send is successful
      if (response && response.body && (response.body.code === 'OK' || response.body.success === true)) {
        // Retrieve code if returned, otherwise store placeholder 'ALIYUN_EXTERNAL' for CheckSmsVerifyCode check
        const returnedCode = response.body.model?.verifyCode || 'ALIYUN_EXTERNAL';
        const expiresAt = Date.now() + 5 * 60 * 1000;
        verificationCodes.set(phone, { code: returnedCode, expiresAt });

        return res.json({
          success: true,
          mode: 'real',
          message: '✓ 验证码短信已成功发送至您的手机，请注意查收。'
        });
      } else {
        const errorMsg = response?.body?.message || '阿里云短信发送接口返回失败';
        console.error('[Alibaba Cloud SMS] API error details:', response);
        return res.status(500).json({
          success: false,
          error: `阿里云短信发送失败: ${errorMsg}`
        });
      }
    } catch (error: any) {
      console.error('[Alibaba Cloud SMS] Send exception:', error);
      return res.status(500).json({
        success: false,
        error: `阿里云短信通道异常: ${error.message || '网络连接超时'}`
      });
    }
  });

  // 2. Verify SMS Code via Alibaba Cloud SMS or Simulated Sandbox
  app.post('/api/sms/verify', async (req, res) => {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ success: false, error: '手机号或验证码不能为空' });
    }

    const record = verificationCodes.get(phone);
    if (!record) {
      return res.status(400).json({ success: false, error: '请先获取验证码' });
    }

    if (Date.now() > record.expiresAt) {
      verificationCodes.delete(phone);
      return res.status(400).json({ success: false, error: '验证码已过期，请重新获取' });
    }

    const accessKeyId = process.env.ALIBABA_CLOUD_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET;
    const isSimulated = !accessKeyId || !accessKeySecret;

    // If simulated or code matches what was returned from send
    if (isSimulated || (record.code && record.code !== 'ALIYUN_EXTERNAL' && record.code === String(code).trim())) {
      if (record.code !== 'ALIYUN_EXTERNAL' && record.code !== String(code).trim()) {
        return res.status(400).json({ success: false, error: '验证码错误，请输入正确的验证码' });
      }
      // Verification success
      verificationCodes.delete(phone);
      return res.json({ success: true, message: '验证码校验成功' });
    }

    // Real Mode - Call Alibaba Cloud CheckSmsVerifyCode
    try {
      console.log(`[Alibaba Cloud SMS] Requesting CheckSmsVerifyCode for: ${phone} with code: ${code}`);
      const client = getDypnsClient();
      if (!client) {
        throw new Error('Alibaba Cloud client initialization failed');
      }

      const checkRequestClass = ($Dypnsapi20170525 as any).CheckSmsVerifyCodeRequest || ($Dypnsapi20170525 as any).default?.CheckSmsVerifyCodeRequest || (Dypnsapi20170525 as any)?.CheckSmsVerifyCodeRequest;
      const requestParams = {
        phoneNumber: String(phone),
        verifyCode: String(code).trim(),
        schemeName: '默认方案',
      };

      const checkRequest = checkRequestClass ? new checkRequestClass(requestParams) : requestParams;
      const response = await client.checkSmsVerifyCode(checkRequest);

      console.log('[Alibaba Cloud SMS] Check response received:', JSON.stringify(response));

      const resultVal = response?.body?.model?.verifyResult as any;
      const isSuccess = (resultVal === true || String(resultVal).toUpperCase() === 'PASS' || String(resultVal).toUpperCase() === 'SUCCESS');

      if (isSuccess) {
        verificationCodes.delete(phone);
        return res.json({ success: true, message: '验证码校验成功' });
      } else {
        return res.status(400).json({
          success: false,
          error: '验证码输入错误或核验失效，请重新输入或获取'
        });
      }
    } catch (error: any) {
      console.error('[Alibaba Cloud SMS] Check exception:', error);
      return res.status(500).json({
        success: false,
        error: `阿里云验证校验异常: ${error.message || '网络连接超时'}`
      });
    }
  });

  // 1. GET DOCUMENT PROXY
  app.get('/api/db/get', async (req, res) => {
    const { col, id } = req.query;
    if (!col || !id) {
      return res.status(400).json({ error: 'Missing col or id parameters' });
    }

    if (isMySQLEnabled && mysqlPool) {
      try {
        const [rows]: any = await mysqlPool.query(
          'SELECT `data` FROM `daijia_documents` WHERE `collection` = ? AND `doc_id` = ?',
          [String(col), String(id)]
        );
        if (rows.length > 0) {
          const parsedData = JSON.parse(rows[0].data);
          res.json({ exists: true, data: parsedData });
        } else {
          res.json({ exists: false, data: null });
        }
      } catch (err: any) {
        console.error(`[MySQL Database] Failed to get doc ${col}/${id}:`, err);
        res.status(500).json({ error: err.message || 'MySQL database error' });
      }
      return;
    }

    try {
      const docRef = doc(db, String(col), String(id));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        res.json({ exists: true, data: docSnap.data() });
      } else {
        res.json({ exists: false, data: null });
      }
    } catch (err: any) {
      console.error(`[Server Proxy] Failed to get doc ${col}/${id}:`, err);
      res.status(500).json({ error: err.message || 'Server database proxy error' });
    }
  });

  // 2. SET DOCUMENT PROXY
  app.post('/api/db/set', async (req, res) => {
    const { col, id, data, merge } = req.body;
    if (!col || !id || !data) {
      return res.status(400).json({ error: 'Missing col, id or data in body' });
    }

    if (isMySQLEnabled && mysqlPool) {
      try {
        let finalData = data;
        if (merge) {
          const [rows]: any = await mysqlPool.query(
            'SELECT `data` FROM `daijia_documents` WHERE `collection` = ? AND `doc_id` = ?',
            [String(col), String(id)]
          );
          if (rows.length > 0) {
            const existing = JSON.parse(rows[0].data);
            finalData = { ...existing, ...data };
          }
        }
        const dataStr = JSON.stringify(finalData);
        await mysqlPool.query(
          'INSERT INTO `daijia_documents` (`collection`, `doc_id`, `data`) VALUES (?, ?, ?) ' +
          'ON DUPLICATE KEY UPDATE `data` = VALUES(`data`)',
          [String(col), String(id), dataStr]
        );
        res.json({ success: true });
      } catch (err: any) {
        console.error(`[MySQL Database] Failed to set doc ${col}/${id}:`, err);
        res.status(500).json({ error: err.message || 'MySQL database error' });
      }
      return;
    }

    try {
      const docRef = doc(db, String(col), String(id));
      await setDoc(docRef, data, { merge: !!merge });
      res.json({ success: true });
    } catch (err: any) {
      console.error(`[Server Proxy] Failed to set doc ${col}/${id}:`, err);
      res.status(500).json({ error: err.message || 'Server database proxy error' });
    }
  });

  // 3. UPDATE DOCUMENT PROXY
  app.post('/api/db/update', async (req, res) => {
    const { col, id, data } = req.body;
    if (!col || !id || !data) {
      return res.status(400).json({ error: 'Missing col, id or data in body' });
    }

    if (isMySQLEnabled && mysqlPool) {
      try {
        const [rows]: any = await mysqlPool.query(
          'SELECT \`data\` FROM \`daijia_documents\` WHERE \`collection\` = ? AND \`doc_id\` = ?',
          [String(col), String(id)]
        );
        let existing = {};
        if (rows.length > 0) {
          try {
            existing = JSON.parse(rows[0].data);
          } catch (_) {}
        }
        const finalData = { ...existing, ...data };
        const dataStr = JSON.stringify(finalData);
        await mysqlPool.query(
          'INSERT INTO \`daijia_documents\` (\`collection\`, \`doc_id\`, \`data\`) VALUES (?, ?, ?) ' +
          'ON DUPLICATE KEY UPDATE \`data\` = VALUES(\`data\`)',
          [String(col), String(id), dataStr]
        );
        res.json({ success: true });
      } catch (err: any) {
        console.error(`[MySQL Database] Failed to update doc ${col}/${id}:`, err);
        res.status(500).json({ error: err.message || 'MySQL database error' });
      }
      return;
    }

    try {
      const docRef = doc(db, String(col), String(id));
      await updateDoc(docRef, data);
      res.json({ success: true });
    } catch (err: any) {
      console.error(`[Server Proxy] Failed to update doc ${col}/${id}:`, err);
      res.status(500).json({ error: err.message || 'Server database proxy error' });
    }
  });

  // 4. DELETE DOCUMENT PROXY
  app.post('/api/db/delete', async (req, res) => {
    const { col, id } = req.body;
    if (!col || !id) {
      return res.status(400).json({ error: 'Missing col or id in body' });
    }

    if (isMySQLEnabled && mysqlPool) {
      try {
        await mysqlPool.query(
          'DELETE FROM `daijia_documents` WHERE `collection` = ? AND `doc_id` = ?',
          [String(col), String(id)]
        );
        res.json({ success: true });
      } catch (err: any) {
        console.error(`[MySQL Database] Failed to delete doc ${col}/${id}:`, err);
        res.status(500).json({ error: err.message || 'MySQL database error' });
      }
      return;
    }

    try {
      const docRef = doc(db, String(col), String(id));
      await deleteDoc(docRef);
      res.json({ success: true });
    } catch (err: any) {
      console.error(`[Server Proxy] Failed to delete doc ${col}/${id}:`, err);
      res.status(500).json({ error: err.message || 'Server database proxy error' });
    }
  });

  // 5. ADD DOCUMENT (AUTO GENERATE ID) PROXY
  app.post('/api/db/add', async (req, res) => {
    const { col, data } = req.body;
    if (!col || !data) {
      return res.status(400).json({ error: 'Missing col or data in body' });
    }

    if (isMySQLEnabled && mysqlPool) {
      try {
        const autoId = 'mysql_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        const dataStr = JSON.stringify(data);
        await mysqlPool.query(
          'INSERT INTO `daijia_documents` (`collection`, `doc_id`, `data`) VALUES (?, ?, ?)',
          [String(col), autoId, dataStr]
        );
        res.json({ success: true, id: autoId });
      } catch (err: any) {
        console.error(`[MySQL Database] Failed to add doc to col ${col}:`, err);
        res.status(500).json({ error: err.message || 'MySQL database error' });
      }
      return;
    }

    try {
      const colRef = collection(db, String(col));
      const addedRef = await addDoc(colRef, data);
      res.json({ success: true, id: addedRef.id });
    } catch (err: any) {
      console.error(`[Server Proxy] Failed to add doc to col ${col}:`, err);
      res.status(500).json({ error: err.message || 'Server database proxy error' });
    }
  });

  // 6. QUERY COLLECTION PROXY (SUPPORT FILTER CONSTRAINTS)
  app.get('/api/db/list', async (req, res) => {
    const { col, constraints } = req.query;
    if (!col) {
      return res.status(400).json({ error: 'Missing col identifier' });
    }

    if (isMySQLEnabled && mysqlPool) {
      try {
        const [rows]: any = await mysqlPool.query(
          'SELECT `doc_id`, `data` FROM `daijia_documents` WHERE `collection` = ?',
          [String(col)]
        );
        
        let docsList = rows.map((r: any) => ({
          id: r.doc_id,
          data: JSON.parse(r.data)
        }));

        if (constraints) {
          try {
            const parsed = JSON.parse(String(constraints));
            for (const c of parsed) {
              if (c.type === 'where') {
                const { field, operator, value } = c;
                docsList = docsList.filter((docObj: any) => {
                  const val = docObj.data[field];
                  // Simple operator evaluator helper
                  if (operator === '==' || operator === '===') {
                    return val === value;
                  }
                  if (operator === '!=') {
                    return val !== value;
                  }
                  if (operator === '>') {
                    return val > value;
                  }
                  if (operator === '<') {
                    return val < value;
                  }
                  if (operator === '>=') {
                    return val >= value;
                  }
                  if (operator === '<=') {
                    return val <= value;
                  }
                  if (operator === 'array-contains') {
                    return Array.isArray(val) && val.includes(value);
                  }
                  return true;
                });
              }
            }
          } catch (e) {
            console.warn('[MySQL Query] Failed to parse constraints:', e);
          }
        }

        res.json({ docs: docsList });
      } catch (err: any) {
        console.error(`[MySQL Database] Failed to list collection ${col}:`, err);
        res.status(500).json({ error: err.message || 'MySQL database error' });
      }
      return;
    }

    try {
      const colRef = collection(db, String(col));
      let q = query(colRef);
      
      if (constraints) {
        try {
          const parsed = JSON.parse(String(constraints));
          const actualParams: any[] = [];
          for (const c of parsed) {
            if (c.type === 'where') {
              actualParams.push(where(c.field, c.operator, c.value));
            }
          }
          if (actualParams.length > 0) {
            q = query(colRef, ...actualParams);
          }
        } catch (_) {
          console.warn("[Server Proxy] Failed to parse constraints JSON, returning default collection query list.");
        }
      }

      const querySnap = await getDocs(q);
      const docsList: any[] = [];
      querySnap.forEach((docSnap) => {
        docsList.push({
          id: docSnap.id,
          data: docSnap.data()
        });
      });
      res.json({ docs: docsList });
    } catch (err: any) {
      console.error(`[Server Proxy] Failed to list collection ${col}:`, err);
      res.status(500).json({ error: err.message || 'Server database proxy error' });
    }
  });

  // Passenger Order submission redirect (from older config files and direct Cloudflare support endpoint)
  app.post('/api/submit', async (req, res) => {
    try {
      const { driverPhone, passengerPhone, startLocation, destination } = req.body;
      if (!driverPhone || !passengerPhone || !startLocation) {
        return res.status(400).json({ success: false, error: '缺少必填参数' });
      }

      if (isMySQLEnabled && mysqlPool) {
        const data = {
          passengerPhone: String(passengerPhone).trim(),
          startLocation: String(startLocation).trim(),
          destination: String(destination || '').trim(),
          status: "submitted",
          timestamp: Date.now()
        };
        const dataStr = JSON.stringify(data);
        await mysqlPool.query(
          'INSERT INTO `daijia_documents` (`collection`, `doc_id`, `data`) VALUES (?, ?, ?) ' +
          'ON DUPLICATE KEY UPDATE `data` = VALUES(`data`)',
          ['passenger_links', String(driverPhone), dataStr]
        );
        return res.json({ success: true, timestamp: Date.now() });
      }

      const colRef = doc(db, 'passenger_links', String(driverPhone));
      await setDoc(colRef, {
        passengerPhone: String(passengerPhone).trim(),
        startLocation: String(startLocation).trim(),
        destination: String(destination || '').trim(),
        status: "submitted",
        timestamp: Date.now()
      });

      res.json({ success: true, timestamp: Date.now() });
    } catch (err: any) {
      console.error('[Server Proxy] submit proxy error:', err);
      res.status(500).json({ success: false, error: err.message || 'Submit Proxy Error' });
    }
  });

  // Integration with Vite development server middleware OR static assets serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware loaded.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Static production build files loaded from:", distPath);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Dedicated Full-Stack proxy server boot successfully on port: http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("FATAL: Failed to boot Express Server:", err);
});
