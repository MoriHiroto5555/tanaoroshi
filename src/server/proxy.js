// src/server/proxy.js
const fetch = require('node-fetch');

module.exports = async function proxyHandler(req, res) {
  try {
    const { app, record, records } = req.body;

    const domainRaw = process.env.KINTONE_DOMAIN;       // 例: "example" or "example.kintone.com" or "https://example.kintone.com"
    const token     = process.env.KINTONE_API_TOKEN;
    const appId     = Number(app || process.env.KINTONE_APP_ID);

    if (!domainRaw || !token || !appId) {
      return res.status(400).json({ error: 'KINTONE_DOMAIN / KINTONE_API_TOKEN / KINTONE_APP_ID の設定を確認してください。' });
    }

    // フル/サブドメイン両対応
    const base = domainRaw.startsWith('http')
      ? domainRaw.replace(/\/$/, '')
      : `https://${domainRaw.includes('.') ? domainRaw : `${domainRaw}.cybozu.com`}`;

    const isBatch = Array.isArray(records);
    const endpoint = isBatch ? '/k/v1/records.json' : '/k/v1/record.json';
    const payload  = isBatch ? { app: appId, records } : { app: appId, record };

    const r = await fetch(`${base}${endpoint}`, {
      method: 'POST',
      headers: {
        'X-Cybozu-API-Token': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const json = await r.json();
    return res.status(r.status).json(json);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }

};


