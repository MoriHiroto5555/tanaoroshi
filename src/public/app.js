// src/public/app.js

// ---- kintone のフィールドコード（あなたの環境に合わせて変更可）----
const TABLE_CODE = 'subtable'; // サブテーブルのフィールドコード
const JAN_CODE   = 'jan';  // サブテーブル内: 文字列(1行)
const QTY_CODE   = 'qty'; // サブテーブル内: 数値
// -------------------------------------------------------------------------

const form  = document.getElementById('form');
const tbody = document.querySelector('#table tbody');
const janEl = document.getElementById('jan');
const qtyEl = document.getElementById('qty');
const sendBtn = document.getElementById('sendBtn');

// 行追加：フォーム submit（Enterでも追加できる）
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const jan = janEl.value.trim();
  const qty = Number(qtyEl.value);

  // 簡易バリデーション
  const janOk = /^\d{8,13}$/.test(jan); // JAN: 8〜13桁数字想定
  const qtyOk = Number.isInteger(qty) && qty > 0;

  if (!janOk || !qtyOk) {
    alert('JANは8〜13桁の数字、数量は1以上の整数で入力してください。');
    return;
  }

  // DOMを安全に組み立て（innerHTML直書きは避ける）
  const tr = document.createElement('tr');

  const tdJan = document.createElement('td');
  tdJan.textContent = jan;

  const tdQty = document.createElement('td');
  tdQty.textContent = String(qty);

  const tdDel = document.createElement('td');
  const btnDel = document.createElement('button');
  btnDel.type = 'button';
  btnDel.className = 'delete';
  btnDel.textContent = '削除';
  tdDel.appendChild(btnDel);

  tr.append(tdJan, tdQty, tdDel);
  tbody.prepend(tr); 

  // 入力欄クリア & フォーカス戻し
  janEl.value = '';
  qtyEl.value = '';
  janEl.focus();
});

// 行削除：イベントデリゲーション
tbody.addEventListener('click', (e) => {
  if (e.target.matches('button.delete')) {
    e.target.closest('tr')?.remove();
  }
});

// 送信：テーブル全行をサブテーブルとして1レコードに詰めてPOST
sendBtn.addEventListener('click', async () => {
  const rows = Array.from(tbody.querySelectorAll('tr'));
  if (rows.length === 0) {
    alert('送信する行がありません。');
    return;
  }

  // サブテーブル value[] を作成
  const tableRows = rows.map((tr) => {
    const [janCell, qtyCell] = tr.querySelectorAll('td');
    const jan = (janCell?.textContent || '').trim();
    const qty = Number((qtyCell?.textContent || '').trim());
    return {
      value: {
        [JAN_CODE]: { value: String(jan) },
        [QTY_CODE]: { value: String(qty) }
      }
    };
  });

  const payload = {
    // app はサーバ側(proxy)で .env の KINTONE_APP_ID を使って補完する想定
    record: {
      [TABLE_CODE]: { value: tableRows }
      // 親レコード側に他の項目を保存したい場合はここに追記:
      // 例) "実施日": { value: "2025-08-25" },
      //     "担当者": { value: "山田太郎" }
    }
  };

  // 二重送信防止
  sendBtn.disabled = true;

  try {
    console.log('payload', JSON.stringify(payload, null, 2));
    const res = await fetch('/kintone/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      // kintoneのエラーは code/message/properties を含むことがある
      const msg = data?.message || data?.code || JSON.stringify(data);
      throw new Error(msg);
    }

    alert('送信成功');
    tbody.innerHTML = ''; // テーブルクリア
    janEl.focus();
  } catch (err) {
    console.error(err);
    alert('送信失敗: ' + err.message);
  } finally {
    sendBtn.disabled = false;
  }
});

// ====== ページ内テンキー（数量欄 #qty 用） ======
(() => {
  const numpad = document.getElementById('numpad');
  const sheet  = numpad?.querySelector('.numpad__sheet');
  const qty    = document.getElementById('qty');
  if (!numpad || !qty) return;

  let activeInput = null;

  function openPad(input){
    activeInput = input;
    numpad.classList.add('is-open');
    numpad.setAttribute('aria-hidden','false');
  }
  function closePad(){
    numpad.classList.remove('is-open');
    numpad.setAttribute('aria-hidden','true');
    activeInput = null;
  }
  function insertText(t){
    if (!activeInput) return;
    const el = activeInput;
    const v = el.value;
    const start = el.selectionStart ?? v.length;
    const end   = el.selectionEnd ?? v.length;
    el.value = v.slice(0, start) + t + v.slice(end);
    const pos = start + t.length;
    el.setSelectionRange(pos, pos);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function backspace(){
    if (!activeInput) return;
    const el = activeInput;
    const v = el.value;
    const start = el.selectionStart ?? v.length;
    const end   = el.selectionEnd ?? v.length;
    if (start === end && start > 0){
      el.value = v.slice(0, start - 1) + v.slice(end);
      const pos = start - 1;
      el.setSelectionRange(pos, pos);
    } else {
      el.value = v.slice(0, start) + v.slice(end);
      el.setSelectionRange(start, start);
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // 数量欄にフォーカス/クリックでテンキー表示
  qty.addEventListener('focus', () => openPad(qty));
  qty.addEventListener('click', () => openPad(qty));

  // テンキー操作
  numpad.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const key = btn.dataset.key;
    const act = btn.dataset.action;
    if (key) insertText(key);
    else if (act === 'backspace') backspace();
    else if (act === 'clear') { if (activeInput) { activeInput.value=''; activeInput.dispatchEvent(new Event('input',{bubbles:true})); } }
    else if (act === 'done') closePad();
  });

  // テンキー外クリックで閉じる（必要なら無効化可）
  document.addEventListener('click', (e) => {
    if (!numpad.classList.contains('is-open')) return;
    if (sheet.contains(e.target) || e.target === qty) return;
    closePad();
  });

  // Escキーで閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && numpad.classList.contains('is-open')) closePad();
  });
})();

function syncActionBarSpace() {
  const bar = document.querySelector('.action-bar');
  const h = bar ? bar.offsetHeight : 0;
  document.documentElement.style.setProperty('--action-bar-space', `${h}px`);
}
window.addEventListener('load', syncActionBarSpace);
window.addEventListener('resize', syncActionBarSpace);
