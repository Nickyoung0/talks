/* ============================================================
   机器内部结构互动组件（零依赖）
   把 PostgreSQL 内核画成一台可拆装的电脑：
     主板 = 内核骨架   插槽 = 扩展接口   板卡 = 扩展模块（.so）
     开机时序 = 代码加载时机   设备清单 = 系统目录
   用法：MachineLab.mount(slideEl, slideData) -> { advance, retreat }
   ============================================================ */
window.MachineLab = (() => {
  'use strict';

  /* 主板局部坐标：宽 600 × 高 500（单位 px，未旋转） */
  const BOARD = { w: 600, h: 500 };

  const LAYOUT = [
    { id: 'psu',     type: 'psu',  x: 536, y: 34,  w: 48,  h: 122, z: 20 },
    { id: 'cpu',     type: 'cpu',  x: 138, y: 28,  w: 170, h: 170, z: 46 },
    { id: 'ram',     type: 'ram',  x: 328, y: 22,  w: 198, h: 178, z: 10 },
    { id: 'bios',    type: 'bios', x: 24,  y: 36,  w: 112, h: 64,  z: 12 },
    { id: 'chipset', type: 'chip', x: 328, y: 212, w: 142, h: 90,  z: 16 },
    { id: 'disk',    type: 'disk', x: 484, y: 212, w: 112, h: 92,  z: 24 },
    { id: 'usb',     type: 'usb',  x: 484, y: 316, w: 112, h: 44,  z: 18 },
    { id: 'fan',     type: 'fan',  x: 494, y: 372, w: 96,  h: 96,  z: 26 },
    { id: 'pcie',    type: 'pcie', x: 30,  y: 264, w: 250, h: 226, z: 0 },
  ];

  /* PCIe 板卡：6 条插槽，卡片竖插在插槽上；rgb 为各卡主题色（铭牌条/装饰） */
  const CARDS = [
    { id: 'pcie1', y: 270, h: 56, bus: 'preload',  rgb: '54, 108, 168' },
    { id: 'pcie2', y: 311, h: 56, bus: 'preload',  rgb: '201, 122, 47' },
    { id: 'pcie3', y: 352, h: 56, bus: 'preload',  rgb: '104, 96, 172' },
    { id: 'pcie4', y: 393, h: 56, bus: 'ondemand', rgb: '62, 150, 100' },
    { id: 'pcie5', y: 434, h: 56, bus: 'ondemand', rgb: '186, 84, 66' },
    { id: 'pcie6', y: 475, h: 56, bus: 'free',     rgb: '138, 150, 136' },
  ];
  const CARD_X = 30, CARD_W = 250;

  const esc = s => String(s == null ? '' : s);

  /* ---------------- 部件外观 ---------------- */
  function partInner(L) {
    switch (L.type) {
      case 'psu':
        return '<i class="body"><span class="pinbox"></span><span class="clip"></span>' +
               '<span class="silk">ATX 24P</span><span class="led"></span></i>';
      case 'cpu':
        return '<i class="body"><span class="fins"></span><span class="frame"></span>' +
               '<span class="fan pgfan"><img src="assets/img/logo-pg.png" alt="PostgreSQL"></span>' +
               '<span class="silk">PLAN·EXEC</span></i>';
      case 'chip':
        return '<i class="body"><span class="fins"></span><span class="silk">fmgr</span></i>';
      case 'bios':
        return '<i class="chip"><span class="pinrow l"></span><span class="pinrow r"></span>' +
               '<span class="dot"></span><span class="silk">FIRMWARE</span></i>' +
               '<i class="cmos"><span>CR2032</span></i>';
      case 'disk':
        return '<i class="body"><span class="label">PGDATA</span><span class="sata"></span>' +
               '<span class="led"></span></i>';
      case 'usb':
        return '<i class="body"><span class="port"></span><span class="port"></span>' +
               '<span class="port"></span><span class="port"></span></i>' +
               '<i class="stick"><b class="stick-board riser"><span class="cap"></span></b></i>';
      case 'fan':
        return '<i class="body"><span class="fan"><b class="blades"></b><b class="hub"></b></span>' +
               '<span class="screw s1"></span><span class="screw s2"></span>' +
               '<span class="screw s3"></span><span class="screw s4"></span></i>';
      case 'ram':
        return '<i class="slots"></i>' +
          [0, 1, 2, 3].map(i => `<i class="dimm" style="--i:${i}">
              <b class="dimm-slot"></b><b class="dimm-board riser" data-rh="40">
                <span class="chiprow"></span><span class="finger"></span></b></i>`).join('');
      case 'pcie':
        return '<i class="zone"><span class="silk">扩展槽区 · EXTENSION SLOTS</span>' +
               '<span class="bus b1">PRELOAD BUS</span><span class="bus b2">ON-DEMAND BUS</span></i>';
      default:
        return '<i class="body"></i>';
    }
  }

  function partHTML(L, def) {
    const tag = esc(def && def.tag) || esc(L.id);
    return `<div class="part t-${L.type}" data-part="${L.id}" data-state="off"
        style="--x:${L.x}px;--y:${L.y}px;--w:${L.w}px;--h:${L.h}px;--z:${L.z}px">
        ${partInner(L)}<b class="tag"><span>${tag}</span></b></div>`;
  }

  function cardHTML(c, def) {
    const name = esc(def && def.tag) || esc(c.id);
    const badge = def && def.badge ? `<em class="cbadge">${esc(def.badge)}</em>` : '';
    return `<div class="pcard" data-part="${c.id}" data-state="off" data-plug="out" data-bus="${c.bus}"
        style="--x:${CARD_X}px;--y:${c.y}px;--w:${CARD_W}px;--h:14px;--rh:${c.h}px;--card-rgb:${c.rgb || '138, 150, 136'}">
        <i class="slot"><b class="clip"></b></i>
        <b class="board riser">
          <span class="cfingers"></span>
          <span class="cpcb"></span>
          <span class="cblower"><b class="blades"></b><b class="hub"></b></span>
          <span class="cbracket"></span>
          <span class="cstrip"><b>${name}</b>${badge}</span>
        </b>
        <b class="tag"><span>${name}</span></b>
      </div>`;
  }

  /* ---------------- 元件密度层 ----------------
     黑芯片（IC）、贴片电容/电阻（SMD）、排阻（SIP）、铝电解电容（ECAP）
     全部落在主板的空白区域，被上层部件自然遮挡，只负责"板子很密"的观感 */
  const CHIPS = [
    { x: 24,  y: 106, w: 56, h: 24, t: 'U12' },
    { x: 24,  y: 138, w: 56, h: 24, t: 'U13' },
    { x: 24,  y: 170, w: 56, h: 24, t: 'U14' },
    { x: 140, y: 206, w: 40, h: 22, t: 'U21', sop: 1 },
    { x: 262, y: 206, w: 34, h: 22, t: 'U22', sop: 1 },
    { x: 298, y: 214, w: 22, h: 40, t: 'U31' },
    { x: 534, y: 164, w: 50, h: 24, t: 'U41' },
    { x: 302, y: 340, w: 48, h: 24, t: 'U51' },
    { x: 370, y: 340, w: 48, h: 24, t: 'U52' },
    { x: 302, y: 414, w: 48, h: 24, t: 'U53' },
    { x: 370, y: 414, w: 48, h: 24, t: 'U54' },
    { x: 314, y: 476, w: 40, h: 18, t: 'U61', sop: 1 },
  ];

  /* 贴片阵列：矩形区域内按网格撒，带确定性抖动，避免死板 */
  const SMD_FIELDS = [
    { x: 26,  y: 208, w: 54,  h: 46,  c: 4,  r: 5 },
    { x: 262, y: 232, w: 34,  h: 18,  c: 2,  r: 2 },
    { x: 300, y: 262, w: 20,  h: 40,  c: 2,  r: 4 },
    { x: 532, y: 194, w: 56,  h: 30,  c: 5,  r: 3 },
    { x: 296, y: 306, w: 176, h: 18,  c: 13, r: 2 },
    { x: 298, y: 370, w: 168, h: 38,  c: 12, r: 3 },
    { x: 298, y: 442, w: 168, h: 26,  c: 12, r: 2 },
    { x: 34,  y: 240, w: 236, h: 14,  c: 16, r: 1 },
    { x: 360, y: 476, w: 100, h: 14,  c: 8,  r: 1 },
    /* ---- CPU 供电区：绕处理器一圈，密度对齐右下高密度区 ---- */
    { x: 140, y: 15,  w: 166, h: 13,  c: 12, r: 1 },   /* 上：CPU 顶部一排 */
    { x: 138, y: 231, w: 52,  h: 26,  c: 4,  r: 2 },   /* 下：CPU 与排针之间 */
    { x: 196, y: 249, w: 56,  h: 13,  c: 4,  r: 1 },   /* 下：排针下方补一排 */
    { x: 262, y: 231, w: 34,  h: 26,  c: 2,  r: 2 },   /* 下：右侧补一段 */
    { x: 310, y: 30,  w: 16,  h: 162, c: 2,  r: 13 },  /* 右：CPU 与内存之间的供电阵列 */
    { x: 92,  y: 103, w: 44,  h: 9,   c: 3,  r: 1 },   /* 左：VRM 电容列上方 */
    { x: 96,  y: 199, w: 40,  h: 9,   c: 3,  r: 1 },   /* 左：VRM 电容列下方 */
  ];

  /* 排阻 / 铝电解电容 */
  const EXTRA = [
    { k: 'sip',  x: 300, y: 304, w: 44, h: 9 },
    { k: 'sip',  x: 214, y: 244, w: 38, h: 9 },
    { k: 'sip',  x: 466, y: 336, w: 9,  h: 38, v: 1 },
    { k: 'ecap', x: 444, y: 344, w: 18, h: 18 },
    { k: 'ecap', x: 444, y: 376, w: 18, h: 18 },
    { k: 'ecap', x: 444, y: 408, w: 18, h: 18 },
    { k: 'ecap', x: 90,  y: 216, w: 16, h: 16 },
    { k: 'ecap', x: 90,  y: 240, w: 16, h: 16 },
  ];

  const rnd = n => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };

  function chipHTML(c) {
    return `<i class="ic${c.sop ? ' sop' : ''}" style="left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px">
        <s class="pt"></s><s class="pb"></s><s class="pl"></s><s class="pr"></s>
        <b class="dot"></b><em>${esc(c.t)}</em></i>`;
  }

  function smdHTML(f, seed) {
    const out = [];
    const gx = f.w / Math.max(1, f.c), gy = f.h / Math.max(1, f.r);
    for (let r = 0; r < f.r; r++) {
      for (let c = 0; c < f.c; c++) {
        const n = seed + r * 31 + c * 7;
        const kind = rnd(n) > .62 ? 'res' : 'cap';
        const jx = (rnd(n + 1) - .5) * Math.min(4, gx * .28);
        const jy = (rnd(n + 2) - .5) * Math.min(3, gy * .3);
        const rot = rnd(n + 3) > .84 ? 90 : 0;
        out.push(`<i class="smd ${kind}" style="left:${(f.x + gx * (c + .5) - 3 + jx).toFixed(1)}px;` +
          `top:${(f.y + gy * (r + .5) - 1.5 + jy).toFixed(1)}px;transform:rotate(${rot}deg)"></i>`);
      }
    }
    return out.join('');
  }

  function densityHTML() {
    let out = '', seed = 3;
    CHIPS.forEach(c => { out += chipHTML(c); });
    SMD_FIELDS.forEach(f => { out += smdHTML(f, seed); seed += 137; });
    EXTRA.forEach(e => {
      out += e.k === 'sip'
        ? `<i class="sip${e.v ? ' v' : ''}" style="left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px"></i>`
        : `<i class="ecap" style="left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px"><b></b></i>`;
    });
    return out;
  }

  /* 主板装饰（不可点击，纯真实感） */
  function garnishHTML() {
    const screws = [[12, 12], [574, 12], [12, 474], [574, 474], [300, 12], [300, 476]]
      .map(([x, y]) => `<i class="screw" style="left:${x}px;top:${y}px"></i>`).join('');
    return `<span class="pcb-grid"></span>
      <span class="trace t1"></span><span class="trace t2"></span>
      <span class="trace t3"></span><span class="trace t4"></span>
      <span class="trace t5"></span>
      <span class="density">${densityHTML()}</span>
      ${screws}
      <i class="vrm"></i>
      <i class="sata"></i>
      <i class="hdr"></i>
      <span class="silk-brand">PostgreSQL</span>
      <span class="silk-model">PG-MAINBOARD · REV 20devel</span>`;
  }

  function boardHTML() {
    return `<div class="mach">
      <div class="mach-stage">
        <div class="mach-scene">
          <div class="mobo" data-view="iso">
            <div class="case-floor"><i class="standoff s1"></i><i class="standoff s2"></i>
              <i class="standoff s3"></i><i class="standoff s4"></i></div>
            <div class="pcb">${garnishHTML()}</div>
          </div>
        </div>
        <div class="mach-tools">
          <button type="button" class="mt" data-view="iso">等距</button>
          <button type="button" class="mt" data-view="front">正视</button>
          <button type="button" class="mt" data-view="top">俯视</button>
          <span class="mt-hint">点击部件或板卡，查看它在数据库里是什么</span>
        </div>
      </div>
      <aside class="mach-panel">
        <div class="mp-step">
          <span class="mp-no">STEP <b>1</b> / 7</span>
          <h4 class="mp-title"></h4>
          <p class="mp-text"></p>
          <div class="mp-code"></div>
        </div>
        <div class="mp-track"></div>
        <div class="mp-part">
          <div class="mp-part-head"><span class="dot"></span><b class="mp-part-name"></b></div>
          <dl class="mp-part-dl">
            <dt>硬件里是什么</dt><dd class="d-hw"></dd>
            <dt>数据库里对应</dt><dd class="d-pg"></dd>
            <dt>关键点</dt><dd class="d-note"></dd>
          </dl>
        </div>
        <ul class="mp-points"></ul>
      </aside>
    </div>`;
  }

  /* ---------------- 挂载 ---------------- */
  function mount(root, slide) {
    const M = slide.machine || {};
    const defs = {};
    (M.parts || []).forEach(p => { defs[p.id] = p; });
    const steps = M.steps || [];
    const mode = M.mode || 'explore';

    root.innerHTML = boardHTML();
    const wrap = root.querySelector('.mach');
    wrap.dataset.mode = mode;

    const partsWrap = document.createElement('div');
    partsWrap.className = 'parts';
    partsWrap.innerHTML = LAYOUT.map(L => partHTML(L, defs[L.id])).join('')
      + CARDS.map(c => cardHTML(c, defs[c.id])).join('');
    root.querySelector('.mobo').appendChild(partsWrap);

    /* 面板：步骤轨道 */
    const track = root.querySelector('.mp-track');
    if (mode === 'boot') {
      track.innerHTML = steps.map((s, i) =>
        `<button type="button" class="tk" data-step="${i}"><span>${i + 1}</span><em>${esc(s.short || s.title)}</em></button>`).join('');
    } else {
      track.remove();
      root.querySelector('.mp-step').remove();
    }

    /* 面板：要点 */
    const pts = root.querySelector('.mp-points');
    pts.innerHTML = (slide.screen || '').replace(/<\/?ul>/g, '') || '';
    if (mode === 'boot') pts.classList.add('compact');

    const el = {
      mobo: root.querySelector('.mobo'),
      title: root.querySelector('.mp-title'),
      text: root.querySelector('.mp-text'),
      code: root.querySelector('.mp-code'),
      no: root.querySelector('.mp-no'),
      partBox: root.querySelector('.mp-part'),
      partName: root.querySelector('.mp-part-name'),
      hw: root.querySelector('.d-hw'),
      pg: root.querySelector('.d-pg'),
      note: root.querySelector('.d-note'),
    };

    let step = 0, picked = null;

    function setPart(id) {
      picked = id;
      const d = defs[id];
      if (!d) { el.partBox.classList.remove('on'); return; }
      el.partBox.classList.add('on');
      el.partName.textContent = d.name || id;
      el.hw.innerHTML = d.hw || '';
      el.pg.innerHTML = d.pg || '';
      el.note.innerHTML = d.note || '';
      root.querySelectorAll('[data-part]').forEach(n =>
        n.classList.toggle('picked', n.dataset.part === id));
    }

    function applyStep() {
      const s = steps[step];
      const lit = new Set(), plugged = new Set();
      for (let i = 0; i <= step; i++) {
        (steps[i].light || []).forEach(x => lit.add(x));
        (steps[i].plug || []).forEach(x => plugged.add(x));
      }
      const focus = new Set((s.light || []));
      root.querySelectorAll('[data-part]').forEach(n => {
        const id = n.dataset.part;
        if (n.classList.contains('pcard')) {
          n.dataset.plug = plugged.has(id) ? 'in' : 'out';
          n.dataset.state = plugged.has(id) ? (focus.has(id) ? 'active' : 'on') : 'off';
        } else {
          n.dataset.state = lit.has(id) ? (focus.has(id) ? 'active' : 'on') : 'off';
        }
      });
      root.querySelector('.mobo').classList.toggle('flowing', !!s.flow);
      el.mobo.dataset.bus = s.bus || '';
      el.no.innerHTML = `STEP <b>${step + 1}</b> / ${steps.length}`;
      el.title.textContent = s.title || '';
      el.text.innerHTML = s.text || '';
      el.code.innerHTML = s.code ? `<code>${esc(s.code)}</code>` : '';
      [...track.children].forEach((b, i) => {
        b.classList.toggle('done', i < step);
        b.classList.toggle('now', i === step);
      });
      if (s.pick) setPart(s.pick);
    }

    function setStep(n) {
      step = Math.max(0, Math.min(steps.length - 1, n));
      applyStep();
    }

    if (mode === 'boot') applyStep();
    else {
      root.querySelectorAll('.part').forEach(n => { n.dataset.state = 'on'; });
      root.querySelectorAll('.pcard').forEach(n => {
        n.dataset.state = 'on';
        n.dataset.plug = defs[n.dataset.part] && defs[n.dataset.part].empty ? 'out' : 'in';
      });
      root.querySelector('.mobo').classList.add('flowing');
      setPart(M.default || 'cpu');
    }

    /* 事件：点击部件 */
    root.addEventListener('click', e => {
      const part = e.target.closest('[data-part]');
      if (part) { setPart(part.dataset.part); return; }
      const tk = e.target.closest('.tk');
      if (tk) { setStep(+tk.dataset.step); return; }
      const v = e.target.closest('.mt');
      if (v) {
        el.mobo.dataset.view = v.dataset.view;
        root.querySelectorAll('.mt').forEach(b => b.classList.toggle('on', b === v));
      }
    });
    const firstView = root.querySelector('.mt');
    if (firstView) firstView.classList.add('on');

    return {
      advance() {
        if (mode !== 'boot' || step >= steps.length - 1) return false;
        setStep(step + 1); return true;
      },
      retreat() {
        if (mode !== 'boot' || step <= 0) return false;
        setStep(step - 1); return true;
      },
      step: () => step,
    };
  }

  return { mount, BOARD };
})();
