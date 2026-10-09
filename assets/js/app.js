/* ============================================================
   Ledger — 全站交互
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 顶部滚动进度 ---------- */
  function initProgress() {
    var bar = document.querySelector('.progress');
    if (!bar) return;
    var raf = false;
    function upd() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
      raf = false;
    }
    addEventListener('scroll', function () { if (!raf) { raf = true; requestAnimationFrame(upd); } }, { passive: true });
    upd();
  }

  /* ---------- 移动端菜单 ---------- */
  function initNav() {
    var b = document.querySelector('.nav-burger');
    var l = document.querySelector('.nav-links');
    if (!b || !l) return;
    b.addEventListener('click', function () { l.classList.toggle('open'); });
    l.addEventListener('click', function (e) { if (e.target.tagName === 'A') l.classList.remove('open'); });
  }

  /* ---------- 滚动入场 ---------- */
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- 侧边目录高亮 ---------- */
  function initToc() {
    var links = document.querySelectorAll('.toc a[href^="#"]');
    if (!links.length) return;
    var targets = [];
    links.forEach(function (a) {
      var el = document.getElementById(a.getAttribute('href').slice(1));
      if (el) targets.push({ el: el, a: a });
    });
    if (!targets.length) return;
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (en.isIntersecting) {
          links.forEach(function (x) { x.classList.remove('on'); });
          var hit = targets.find(function (t) { return t.el === en.target; });
          if (hit) hit.a.classList.add('on');
        }
      });
    }, { rootMargin: '-18% 0px -70% 0px' });
    targets.forEach(function (t) { io.observe(t.el); });
  }

  /* ============================================================
     简易同步哈希（演示用，非密码学安全）
     ============================================================ */
  function djb2hex(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    var out = (h >>> 0).toString(16).padStart(8, '0');
    var h2 = 2166136261;
    for (var j = 0; j < str.length; j++) { h2 ^= str.charCodeAt(j); h2 = Math.imul(h2, 16777619); }
    out += (h2 >>> 0).toString(16).padStart(8, '0');
    var h3 = 0;
    for (var k = 0; k < str.length; k++) h3 = (Math.imul(31, h3) + str.charCodeAt(k)) | 0;
    out += (h3 >>> 0).toString(16).padStart(8, '0');
    out += ((str.length * 2654435761) >>> 0).toString(16).padStart(8, '0');
    return out.slice(0, 32);
  }

  function shortHash(h, n) { n = n || 10; return h.slice(0, n) + '…' + h.slice(-4); }

  /* ---------- 哈希链可视化 ---------- */
  function initChain() {
    var root = document.getElementById('chainLab');
    if (!root) return;

    var genesis = {
      idx: 0,
      txs: 'Coinbase → 创世地址 50 BTC',
      prev: '00000000000000000000000000000000'
    };

    var state = {
      blocks: [
        { idx: 1, txs: 'Alice → Bob 1.50 BTC', nonce: 42871 },
        { idx: 2, txs: 'Bob → Carol 0.75 BTC', nonce: 91340 },
        { idx: 3, txs: 'Carol → Dave 2.10 BTC', nonce: 20556 }
      ],
      tampered: -1
    };

    var body = root.querySelector('.chain-body');
    var status = root.querySelector('.chain-status');

    function computeChain() {
      var prev = djb2hex(genesis.idx + genesis.txs + genesis.prev);
      var out = [{ idx: genesis.idx, txs: genesis.txs, prev: genesis.prev, hash: prev, valid: true, genesis: true }];
      for (var i = 0; i < state.blocks.length; i++) {
        var b = state.blocks[i];
        var content = b.idx + '|' + b.txs + '|' + prev + '|' + b.nonce;
        var hash = djb2hex(content);
        // 校验：重算 prev 是否等于声明值
        out.push({ idx: b.idx, txs: b.txs, nonce: b.nonce, prev: prev, hash: hash, valid: !b.broken });
        prev = hash;
      }
      return out;
    }

    function render() {
      var chain = computeChain();
      var html = '<div class="blockchain">';
      chain.forEach(function (b, i) {
        var isTampered = state.tampered === i && i > 0;
        var cls = 'blk' + (isTampered ? ' tampered' : (i > 0 ? ' valid' : ''));

        // 篡改后，本块 hash 与下块记录的 prev 不一致
        var mismatch = false;
        if (isTampered && i > 0) {
          var recomputed = djb2hex(b.idx + '|' + b.txs + '|' + b.prev + '|' + b.nonce);
          mismatch = recomputed !== b.hash ? true : false;
        }
        // 检查链断裂：下一块记录的 prev 是否等于本块 hash
        var brokenNext = false;
        if (i < chain.length - 1) {
          brokenNext = chain[i + 1].prev !== b.hash;
        }

        html += '<div class="' + cls + '">';
        html += '<div class="blk-h"><span>' + (b.genesis ? 'GENESIS' : 'BLOCK #' + b.idx) + '</span>';
        html += '<span>' + (isTampered ? '被篡改' : (brokenNext || mismatch ? '链断裂' : '有效')) + '</span></div>';
        html += '<div class="blk-body">';

        html += '<div class="blk-field"><div class="blk-label">' + (b.genesis ? '创世交易' : '交易数据') + '</div>';
        if (b.genesis) {
          html += '<div class="blk-val">' + b.txs + '</div>';
        } else {
          html += '<div class="blk-val"><input data-tx="' + i + '" value="' + b.txs.replace(/"/g, '&quot;') + '"></div>';
        }
        html += '</div>';

        html += '<div class="blk-field"><div class="blk-label">上一区块哈希 prev</div>';
        var pv = brokenNext && i < chain.length - 1 ? 'bad' : '';
        html += '<div class="blk-val ' + pv + '">' + shortHash(b.prev, 12) + '</div></div>';

        html += '<div class="blk-field"><div class="blk-label">本块哈希</div>';
        var hv = mismatch ? 'bad' : (isTampered ? '' : 'hash');
        html += '<div class="blk-val ' + hv + '">' + shortHash(b.hash, 12) + '</div></div>';

        if (!b.genesis) {
          html += '<div class="blk-field"><div class="blk-label">Nonce</div><div class="blk-val">' + b.nonce + '</div></div>';
        }
        html += '</div></div>';

        if (i < chain.length - 1) {
          var brk = chain[i + 1].prev !== b.hash;
          html += '<div class="link-arrow' + (brk ? ' broken' : '') + '">' + (brk ? '✕' : '→') + '</div>';
        }
      });
      html += '</div>';
      body.innerHTML = html;

      // 状态
      var anyBroken = false;
      for (var i = 0; i < chain.length - 1; i++) if (chain[i + 1].prev !== chain[i].hash) anyBroken = true;
      if (status) {
        status.className = 'chain-status ' + (anyBroken ? 'down' : 'ok');
        status.textContent = anyBroken
          ? '链已断裂 —— 任何一处改动都会让后续所有区块失效，全网节点将拒绝这条链'
          : '链完整 —— 每个区块都嵌着前一块的指纹，改动一处即暴露';
      }

      // 输入绑定
      body.querySelectorAll('input[data-tx]').forEach(function (inp) {
        inp.addEventListener('input', function () {
          var i = parseInt(inp.getAttribute('data-tx'), 10);
          state.blocks[i - 1].txs = inp.value;
          state.tampered = i;
        });
        inp.addEventListener('blur', function () { render(); keepFocus(i); });
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') render(); });
      });
    }

    function keepFocus(i) {
      var el = body.querySelector('input[data-tx="' + i + '"]');
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }

    render();

    // 按钮
    root.querySelectorAll('[data-chain-act]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var act = btn.getAttribute('data-chain-act');
        if (act === 'tamper') {
          state.blocks[1].txs = 'Alice → 攻击者 99.00 BTC';
          state.tampered = 2;
          render();
        } else {
          state.blocks[1].txs = 'Alice → Bob 1.50 BTC';
          state.tampered = -1;
          render();
        }
      });
    });
  }

  /* ============================================================
     订单簿 + 撮合动画
     ============================================================ */
  function initOrderBook() {
    var root = document.getElementById('obLab');
    if (!root) return;

    var mid = 67420;
    var asks = [], bids = [];
    for (var i = 0; i < 7; i++) {
      asks.push({ p: mid + 8 * (i + 1), q: (Math.random() * 2.8 + 0.18) });
      bids.push({ p: mid - 8 * (i + 1), q: (Math.random() * 2.8 + 0.18) });
    }
    asks.reverse();

    function fmt(n, d) { return n.toFixed(d === undefined ? 2 : d); }

    function renderBook() {
      var maxQ = 3;
      var h = '';
      h += '<div class="ob-col"><div class="ob-title"><span>卖盘 ASK</span><span>价格 / 数量</span></div>';
      asks.forEach(function (a) {
        h += '<div class="ob-row ask"><div class="depth" style="width:' + (a.q / maxQ * 100) + '%"></div>';
        h += '<span>' + fmt(a.p) + '</span><span>' + fmt(a.q, 3) + '</span><span>' + fmt(a.p * a.q / 1000, 1) + 'K</span></div>';
      });
      h += '</div>';

      h += '<div class="ob-col"><div class="ob-title"><span>撮合引擎</span><span>价格优先 / 时间优先</span></div>';
      h += '<div class="ob-spread"><div class="l">最新成交价</div><div class="p" id="obLast">' + fmt(mid) + '</div>';
      h += '<div class="l" style="margin-top:5px">价差 ' + fmt(asks[asks.length - 1].p - bids[0].p) + ' USDT · 0.01%</div></div>';
      h += '<div class="match-vis" id="matchVis"></div>';
      h += '<div style="margin-top:16px"><button class="btn ghost" style="width:100%;justify-content:center;padding:10px" data-ob-run>推送一笔买单，观察撮合</button></div>';
      h += '</div>';

      h += '<div class="ob-col"><div class="ob-title"><span>买盘 BID</span><span>价格 / 数量</span></div>';
      bids.forEach(function (b) {
        h += '<div class="ob-row bid"><div class="depth" style="width:' + (b.q / maxQ * 100) + '%"></div>';
        h += '<span>' + fmt(b.p) + '</span><span>' + fmt(b.q, 3) + '</span><span>' + fmt(b.p * b.q / 1000, 1) + 'K</span></div>';
      });
      h += '</div>';

      root.innerHTML = h;

      var runBtn = root.querySelector('[data-ob-run]');
      if (runBtn) runBtn.addEventListener('click', runMatch);
    }

    var seq = 0;
    function runMatch() {
      var vis = document.getElementById('matchVis');
      if (!vis) return;
      var need = Math.random() * 2.4 + 0.5;   // 买单数量
      var filled = 0;
      var lines = [];
      var remaining = need;

      // 从最优卖价开始吃单
      var avail = asks.slice().sort(function (a, b) { return a.p - b.p; });
      for (var i = 0; i < avail.length && remaining > 0.0001; i++) {
        var take = Math.min(avail[i].q, remaining);
        lines.push({ p: avail[i].p, q: take, done: true });
        remaining -= take;
        filled += take;
      }
      if (remaining > 0.0001) lines.push({ p: avail[avail.length - 1] ? avail[avail.length - 1].p : mid, q: remaining, done: false });

      vis.innerHTML = '';
      lines.forEach(function (l, i) {
        setTimeout(function () {
          var d = document.createElement('div');
          d.className = 'match-line hit';
          d.innerHTML = '<span class="who b">BUY</span>' +
            '<span class="qty">' + fmt(l.q, 4) + ' BTC @ ' + fmt(l.p) + '</span>' +
            '<span class="arrow">' + (l.done ? '已成交' : '挂单入簿') + '</span>';
          vis.appendChild(d);
          if (vis.children.length > 5) vis.removeChild(vis.firstChild);
        }, i * 320);
      });

      // 成交后价格微动
      setTimeout(function () {
        var drift = (Math.random() - 0.45) * 14;
        mid = +(mid + drift).toFixed(2);
        var last = document.getElementById('obLast');
        if (last) {
          last.textContent = fmt(mid);
          last.style.color = drift >= 0 ? 'var(--up)' : 'var(--down)';
          setTimeout(function () { last.style.color = ''; }, 900);
        }
        // 更新簿
        asks = asks.map(function (a) { return { p: +(a.p + drift * 0.7).toFixed(2), q: Math.random() * 2.8 + 0.18 }; });
        bids = bids.map(function (b) { return { p: +(b.p + drift * 0.7).toFixed(2), q: Math.random() * 2.8 + 0.18 }; });
        asks.sort(function (a, b) { return a.p - b.p; });
        bids.sort(function (a, b) { return b.p - a.p; });
        var saved = vis ? vis.innerHTML : '';
        renderBook();
        var nv = document.getElementById('matchVis');
        if (nv) nv.innerHTML = saved;
        var rb = root.querySelector('[data-ob-run]');
        if (rb) rb.addEventListener('click', runMatch);
      }, lines.length * 320 + 220);
    }

    renderBook();
    runMatch();
  }

  /* ============================================================
     杠杆 / 爆仓计算器
     ============================================================ */
  function initLeverage() {
    var root = document.getElementById('levLab');
    if (!root) return;

    var S = { side: 'long', entry: 67420, lev: 10, move: -7.4, bal: 10000, alloc: 20 };

    function calc() {
      var pos = S.bal * (S.alloc / 100) * S.lev;        // 名义仓位
      var margin = S.bal * (S.alloc / 100);              // 占用保证金
      var dir = S.side === 'long' ? 1 : -1;
      var pnl = pos * (S.move / 100) * dir;              // 盈亏
      var pnlPct = (pnl / margin) * 100;                 // 保证金收益率
      var liqMove = (100 / S.lev) * dir;                 // 爆仓所需反向幅度
      var liqPrice = S.entry * (1 - (100 / S.lev) / 100 * dir);
      var liqPct = Math.min(100, Math.abs(S.move / (100 / S.lev)) * 100);
      var equity = S.bal - margin + margin + pnl;
      return { pos: pos, margin: margin, pnl: pnl, pnlPct: pnlPct, liqMove: liqMove, liqPrice: liqPrice, liqPct: liqPct, equity: equity, blown: Math.abs(S.move) >= 100 / S.lev && (S.move * dir < 0) };
    }

    function money(n, d) {
      d = d === undefined ? 2 : d;
      var s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
      return (n < 0 ? '-' : '') + s;
    }

    function setOut(key, txt, color) {
      var el = root.querySelector('[data-out="' + key + '"]');
      if (!el) return;
      el.textContent = txt;
      if (color) el.style.color = color;
    }

    function render() {
      var r = calc();
      var upCol = 'var(--up)', downCol = 'var(--down)';

      setOut('pnl', (r.pnl >= 0 ? '+' : '') + money(r.pnl), r.pnl >= 0 ? upCol : downCol);
      setOut('pnl2', (r.pnlPct >= 0 ? '+' : '') + r.pnlPct.toFixed(1) + '%', r.pnlPct >= 0 ? upCol : downCol);
      setOut('pos', money(r.pos, 0) + ' USDT');
      setOut('margin', money(r.margin, 0) + ' USDT');
      setOut('liq', money(r.liqPrice) + ' USDT');
      setOut('liqmove', (r.liqMove > 0 ? '+' : '') + r.liqMove.toFixed(2) + '%');
      setOut('equity', money(r.equity, 0) + ' USDT');
      setOut('liqlev', S.lev + 'x');

      var fill = root.querySelector('.liq-fill');
      if (fill) fill.style.width = Math.min(100, r.liqPct) + '%';

      var w = root.querySelector('.blow-warn');
      if (w) {
        w.style.display = r.blown ? 'block' : 'none';
        if (r.blown) w.textContent = '已触发强制平仓 —— ' + S.lev + ' 倍杠杆下，反向 ' + (100 / S.lev).toFixed(2) + '% 即亏光全部保证金。仓位归零，保证金被清算引擎没收。';
      }

      // 标签值
      root.querySelectorAll('[data-val]').forEach(function (el) {
        var k = el.getAttribute('data-val');
        el.textContent = k === 'entry' ? '$' + money(S.entry, 0)
          : k === 'lev' ? S.lev + 'x'
            : k === 'move' ? (S.move > 0 ? '+' : '') + S.move.toFixed(1) + '%'
              : k === 'alloc' ? S.alloc + '%'
                : k === 'bal' ? '$' + money(S.bal, 0) : '';
      });
    }

    function bind() {
      root.querySelectorAll('input[data-in]').forEach(function (inp) {
        inp.addEventListener('input', function () {
          S[inp.getAttribute('data-in')] = parseFloat(inp.value);
          render();
        });
      });
      root.querySelectorAll('button[data-side]').forEach(function (b) {
        b.addEventListener('click', function () {
          S.side = b.getAttribute('data-side');
          root.querySelectorAll('button[data-side]').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on');
          render();
        });
      });
      root.querySelectorAll('button[data-lev]').forEach(function (b) {
        b.addEventListener('click', function () {
          S.lev = parseFloat(b.getAttribute('data-lev'));
          var r = root.querySelector('input[data-in="lev"]');
          if (r) r.value = S.lev;
          root.querySelectorAll('button[data-lev]').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on');
          render();
        });
      });
    }

    bind();
    render();
  }

  /* ============================================================
     蜡烛图（Canvas 手绘，零依赖）
     ============================================================ */
  function initChart() {
    document.querySelectorAll('canvas.candles').forEach(function (cv) {
      var spec = cv.getAttribute('data-spec') || 'mixed';
      drawCandles(cv, spec);
      var box = cv.closest('.chart-box');
      if (box) {
        box.querySelectorAll('[data-regen]').forEach(function (b) {
          b.addEventListener('click', function () {
            box.querySelectorAll('[data-regen]').forEach(function (x) { x.classList.remove('on'); });
            b.classList.add('on');
            drawCandles(cv, b.getAttribute('data-regen'));
          });
        });
      }
      addEventListener('resize', debounce(function () { drawCandles(cv, cv._spec || spec); }, 220));
    });
  }

  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  function rng(seed) { var s = seed; return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

  function drawCandles(cv, spec) {
    cv._spec = spec;
    var wrap = cv.parentElement;
    var dpr = Math.min(devicePixelRatio || 1, 2);
    var W = wrap.clientWidth - 32;
    var H = 320;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    var g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    var cfg = {
      mixed: { n: 62, base: 67420, vol: 0.021, drift: 0.0007, seed: 77 },
      bull: { n: 62, base: 42800, vol: 0.014, drift: 0.0026, seed: 21 },
      bear: { n: 62, base: 69200, vol: 0.019, drift: -0.0024, seed: 55 },
      chop: { n: 62, base: 31500, vol: 0.009, drift: 0.0002, seed: 9 }
    }[spec] || { n: 62, base: 67420, vol: 0.021, drift: 0.0007, seed: 77 };

    var r = rng(cfg.seed);
    var data = [];
    var p = cfg.base;
    for (var i = 0; i < cfg.n; i++) {
      var o = p;
      var chg = (r() - 0.5) * 2 * cfg.vol + cfg.drift;
      var c = o * (1 + chg);
      var hi = Math.max(o, c) * (1 + r() * cfg.vol * 0.55);
      var lo = Math.min(o, c) * (1 - r() * cfg.vol * 0.55);
      data.push({ o: o, h: hi, l: lo, c: c, v: 0.35 + r() * 0.65 });
      p = c;
    }

    var hi = Math.max.apply(null, data.map(function (d) { return d.h; }));
    var lo = Math.min.apply(null, data.map(function (d) { return d.l; }));
    var pad = (hi - lo) * 0.1; hi += pad; lo -= pad;

    var padL = 62, padR = 14, padT = 16, padB = 46;
    var cw = W - padL - padR, chh = H - padT - padB;
    var bw = cw / data.length;

    function Y(v) { return padT + chh - ((v - lo) / (hi - lo)) * chh; }

    // 网格
    g.font = '10px "JetBrains Mono", monospace';
    g.textAlign = 'right'; g.textBaseline = 'middle';
    for (var k = 0; k <= 5; k++) {
      var v = lo + (hi - lo) * (k / 5);
      var y = Y(v);
      g.strokeStyle = 'rgba(255,255,255,.045)';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(padL, y + .5); g.lineTo(W - padR, y + .5); g.stroke();
      g.fillStyle = '#6b7386';
      g.fillText(v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v.toFixed(2), padL - 10, y);
    }

    // 成交量
    var volTop = H - padB + 8, volH = 30;
    // 蜡烛
    data.forEach(function (d, i) {
      var x = padL + i * bw + bw / 2;
      var up = d.c >= d.o;
      // 中国习惯：涨红跌绿
      var col = up ? '#e5534b' : '#2ea87a';
      g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1;
      // 影线
      g.beginPath(); g.moveTo(x + .5, Y(d.h)); g.lineTo(x + .5, Y(d.l)); g.stroke();
      // 实体
      var yO = Y(d.o), yC = Y(d.c);
      var top = Math.min(yO, yC), hgt = Math.max(1, Math.abs(yC - yO));
      var bodyW = Math.max(2, Math.min(bw * 0.62, 11));
      g.fillRect(x - bodyW / 2, top, bodyW, hgt);

      // 量能
      var vh = d.v * volH;
      g.globalAlpha = 0.4;
      g.fillRect(x - bodyW / 2, volTop + volH - vh, bodyW, vh);
      g.globalAlpha = 1;
    });

    // 最新价线
    var last = data[data.length - 1];
    var ly = Y(last.c);
    var lc = last.c >= last.o ? '#e5534b' : '#2ea87a';
    g.setLineDash([4, 4]); g.strokeStyle = lc; g.globalAlpha = .6;
    g.beginPath(); g.moveTo(padL, ly); g.lineTo(W - padR, ly); g.stroke();
    g.setLineDash([]); g.globalAlpha = 1;
    // 价格标签
    g.fillStyle = lc;
    var label = last.c >= 1000 ? last.c.toFixed(0) : last.c.toFixed(3);
    g.font = '10.5px "JetBrains Mono", monospace';
    var tw = g.measureText(label).width + 12;
    g.fillRect(W - padR - tw, ly - 9, tw, 18);
    g.fillStyle = '#07090f'; g.textAlign = 'left';
    g.fillText(label, W - padR - tw + 6, ly);

    // 尾注
    g.fillStyle = '#464d5e'; g.font = '9.5px "JetBrains Mono", monospace';
    g.textAlign = 'left';
    g.fillText('模拟数据 · 仅用于教学演示', padL, H - 12);

    // 返回摘要供外部使用
    cv._summary = {
      open: data[0].o, close: last.c,
      chg: ((last.c - data[0].o) / data[0].o * 100),
      hi: Math.max.apply(null, data.map(function (d) { return d.h; })),
      lo: Math.min.apply(null, data.map(function (d) { return d.l; }))
    };
    var bar = cv.closest('.chart-box');
    if (bar) {
      var px = bar.querySelector('[data-live="px"]');
      var cg = bar.querySelector('[data-live="chg"]');
      if (px) px.textContent = '$' + last.c.toFixed(2);
      if (cg) {
        var ch = ((last.c - data[0].o) / data[0].o * 100);
        cg.textContent = (ch >= 0 ? '+' : '') + ch.toFixed(2) + '%';
        cg.style.color = ch >= 0 ? 'var(--up)' : 'var(--down)';
      }
    }
  }

  /* ============================================================
     标签页
     ============================================================ */
  function initTabs() {
    document.querySelectorAll('[data-tabs]').forEach(function (root) {
      var btns = root.querySelectorAll('.tab-bar button');
      var pans = root.querySelectorAll('.tab-panel');
      btns.forEach(function (b, i) {
        b.addEventListener('click', function () {
          btns.forEach(function (x) { x.classList.remove('on'); });
          pans.forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on');
          if (pans[i]) pans[i].classList.add('on');
          // 重绘该面板内的图表
          if (pans[i]) pans[i].querySelectorAll('canvas.candles').forEach(function (cv) { drawCandles(cv, cv._spec || 'mixed'); });
        });
      });
    });
  }

  /* ============================================================
     现金流模拟器
     ============================================================ */
  function initCashFlow() {
    var root = document.getElementById('flowLab');
    if (!root) return;
    var slider = root.querySelector('[data-flow]');
    var tf = root.querySelector('[data-flow-tf]');
    if (!slider) return;

    var stages = [
      { name: '法币入金', desc: '银行卡 / 电汇 → 交易所托管账户', mul: 1.0 },
      { name: '稳定币铸造', desc: 'USDT 发行方增发，等额资产托管', mul: 0.985 },
      { name: '现货买入', desc: 'USDT → BTC，做市商撮合成交', mul: 0.972 },
      { name: '转入合约', desc: 'BTC 划转至衍生品账户作保证金', mul: 0.966 },
      { name: '开杠杆仓', desc: '名义敞口放大 N 倍，资金费率实时结算', mul: 0.951 },
      { name: '对手方吃单', desc: '盈亏在账户间转移，非新增资金', mul: 0.943 }
    ];

    function render() {
      var amt = parseFloat(slider.value);
      var lbl = root.querySelector('[data-flow-tf-label]');
      if (lbl) lbl.textContent = amt + ' 万元';
      var html = '<div class="flow">';
      stages.forEach(function (s, i) {
        var v = amt * s.mul;
        var lost = i > 0 ? (stages[i - 1].mul - s.mul) * amt : 0;
        html += '<div class="flow-node money"><div class="t">' + s.name + '</div>';
        html += '<div class="s" style="color:var(--gold-200);font-size:13px">' + v.toFixed(1) + ' 万</div>';
        if (lost > 0.001) html += '<div class="s" style="color:var(--up);font-size:9.5px">-' + lost.toFixed(2) + ' 万</div>';
        html += '<div class="s" style="color:var(--fg-ghost);margin-top:6px;font-size:9px;line-height:1.4;max-width:140px">' + s.desc + '</div></div>';
        if (i < stages.length - 1) html += '<div class="flow-arrow">→</div>';
      });
      html += '</div>';
      // 汇总
      var last = amt * stages[stages.length - 1].mul;
      html += '<div class="kv-inline" style="justify-content:center;gap:46px;border-bottom:0">';
      html += '<div><dt>初始入金</dt><dd>' + amt.toFixed(1) + ' 万</dd></div>';
      html += '<div><dt>链路终点</dt><dd>' + last.toFixed(1) + ' 万</dd></div>';
      html += '<div><dt>累计损耗</dt><dd class="up">' + (amt - last).toFixed(2) + ' 万</dd></div>';
      html += '<div><dt>损耗率</dt><dd class="up">' + ((1 - stages[stages.length - 1].mul) * 100).toFixed(1) + '%</dd></div>';
      html += '</div>';
      var box = root.querySelector('.flow-out');
      if (box) box.innerHTML = html;
    }
    slider.addEventListener('input', render);
    render();
  }

  document.addEventListener('DOMContentLoaded', function () {
    initProgress(); initNav(); initReveal(); initToc();
    initChain(); initOrderBook(); initLeverage(); initChart(); initTabs(); initCashFlow();
  });
})();
