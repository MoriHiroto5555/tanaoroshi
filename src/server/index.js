require('dotenv').config();
// src/server/index.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const proxyHandler = require('./proxy');

const app = express();
const PORT = process.env.PORT || 3000;

// （.env を使うなら）require('dotenv').config();

app.use(cors());
app.use(express.json());

// 静的ファイル配信
app.use('/', express.static(path.join(__dirname, '../public')));

// kintone 転送（単体/複数の両方をこの1ハンドラで）
app.post('/kintone/record', proxyHandler);
app.post('/kintone/records', proxyHandler);

app.listen(PORT, () => {
  console.log(`サーバー起動: http://localhost:${PORT}`);
});


