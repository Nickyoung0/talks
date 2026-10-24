/* ============================================================
   搭积木互动组件（零依赖）
     地基 = PostgreSQL 内核     框架 = 扩展接口
     积木 = 扩展提供的类型 / 函数 / 操作符 / 索引 AM / Hook
   核心表达：地基和框架不动，需求不同，搭出来的建筑就不同。
   用法：BlocksLab.mount(root, slideData) -> { activate, advance }
   ============================================================ */
window.BlocksLab = (() => {
  'use strict';

  /* 舞台局部坐标（viewBox 760 × 400） */
  const VBW = 760, VBH = 400;
  /* 积木网格：列宽 120、块 112×40、层高 46，row0 坐在框架顶面 y=252 */
  const G = { x0: 140, dx: 120, bw: 112, bh: 40, gap: 6, base: 252 };
  /* 立体斜切：所有厚度面统一向右上方偏移，形成 2.5D 体积感 */
  const D = { x: 14, y: -11 };
  const DB = { x: 10, y: -8 };   // 钢梁用略小的厚度
  /* 地基 / 框架几何 */
  /* 地基格宽随格数变化：5 格时 116px 正好铺满板面（126 + 5×116 + 4×6 = 730） */
  const FDN = { x: 118, y: 330, w: 620, h: 44, cx: 126, cw: 116, cg: 6 };
  const FRM = { x: 130, y: 252, w: 600, h: 66 };
  const PILLARS = [140, 280, 420, 560, 700];

  const esc = s => String(s == null ? '' : s);

  /* ---------------- 静态骨架 ---------------- */
  function skeletonHTML(B) {
    const fdn = B.foundation || {}, frm = B.frame || {};
    const cells = (fdn.cells || []).map((c, i) => {
      const x = FDN.cx + i * (FDN.cw + FDN.cg);
      return `<rect class="fd-cell" x="${x}" y="${FDN.y + 6}" width="${FDN.cw}" height="${FDN.h - 12}" rx="5"/>
              <text class="fd-t" x="${x + FDN.cw / 2}" y="${FDN.y + 27}">${esc(c)}</text>`;
    }).join('');

    const slots = (frm.cells || []).map((c, i) => {
      const x = 154 + i * 94;
      return `<g class="fr-slot"><rect x="${x}" y="278" width="88" height="26" rx="13"/>
              <rect class="fr-slot-hl" x="${x + 5}" y="280.5" width="78" height="5" rx="2.5"/>
              <text x="${x + 44}" y="296">${esc(c)}</text></g>`;
    }).join('');

    const pillars = PILLARS.map(x =>
      `<rect class="fr-pillar" x="${x}" y="${FRM.y}" width="12" height="${FRM.h}" rx="3"/>`).join('');
    const braces = [140, 280, 420, 560].map(x =>
      `<line class="fr-brace" x1="${x + 12}" y1="${FRM.y + 9}" x2="${x + 140}" y2="${FRM.y + FRM.h - 9}"/>`).join('');

    /* 立体：顶面 + 右侧厚度面（先画，正面后画覆盖） */
    const bx = FRM.x, bw = FRM.w, ty = FRM.y, by = FRM.y + FRM.h - 9;
    const beam3d = y => `<polygon class="fr-btop" points="${bx},${y} ${bx + DB.x},${y + DB.y} ${bx + bw + DB.x},${y + DB.y} ${bx + bw},${y}"/>
        <polygon class="fr-bside" points="${bx + bw},${y} ${bx + bw + DB.x},${y + DB.y} ${bx + bw + DB.x},${y + 9 + DB.y} ${bx + bw},${y + 9}"/>`;

    return `<svg class="blk-svg" viewBox="0 0 ${VBW} ${VBH}" preserveAspectRatio="xMidYMid meet" role="img"
        aria-label="搭积木：内核是地基，扩展接口是框架，不同需求搭出不同建筑">
      <defs>
        <linearGradient id="blGround" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#dbe8f6"/><stop offset="1" stop-color="#f4f9ff"/>
        </linearGradient>
        <linearGradient id="blFdn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#e3ecf6"/><stop offset="1" stop-color="#b9cadb"/>
        </linearGradient>
        <linearGradient id="blSteel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#015CB7"/><stop offset="1" stop-color="#3785D8"/>
        </linearGradient>
        <linearGradient id="blFdnTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f4f9ff"/><stop offset="1" stop-color="#d7e4f1"/>
        </linearGradient>
        <linearGradient id="blPillar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#dbeaf7"/>
          <stop offset=".42" stop-color="#b3cee6"/>
          <stop offset="1" stop-color="#8aacc9"/>
        </linearGradient>
      </defs>

      <rect class="bl-ground" x="0" y="374" width="${VBW}" height="26" fill="url(#blGround)"/>
      <line class="bl-horizon" x1="0" y1="374" x2="${VBW}" y2="374"/>
      <ellipse class="bl-shadow" cx="380" cy="378" rx="300" ry="7"/>

      <text class="bl-cap" x="14" y="292">框架</text>
      <text class="bl-cap" x="14" y="354">地基</text>

      <g class="bl-frame">
        ${beam3d(FRM.y)}
        ${beam3d(FRM.y + FRM.h - 9)}
        ${braces}
        ${pillars}
        <rect class="fr-beam" x="${FRM.x}" y="${FRM.y}" width="${FRM.w}" height="9" rx="4" fill="url(#blSteel)"/>
        <rect class="fr-beam" x="${FRM.x}" y="${FRM.y + FRM.h - 9}" width="${FRM.w}" height="9" rx="4" fill="url(#blSteel)"/>
        ${slots}
      </g>

      <g class="bl-found">
        <polygon class="fd-top" points="${FDN.x},${FDN.y} ${FDN.x + D.x},${FDN.y + D.y} ${FDN.x + FDN.w + D.x},${FDN.y + D.y} ${FDN.x + FDN.w},${FDN.y}"/>
        <polygon class="fd-side" points="${FDN.x + FDN.w},${FDN.y} ${FDN.x + FDN.w + D.x},${FDN.y + D.y} ${FDN.x + FDN.w + D.x},${FDN.y + FDN.h + D.y} ${FDN.x + FDN.w},${FDN.y + FDN.h}"/>
        <rect class="fd-body" x="${FDN.x}" y="${FDN.y}" width="${FDN.w}" height="${FDN.h}" rx="9" fill="url(#blFdn)"/>
        ${cells}
      </g>

      <g class="bl-layer"></g>
      <text class="bl-name" x="380" y="34"></text>
    </svg>`;
  }

  function blockHTML(b, kinds, n) {
    const x = G.x0 + b.c * G.dx;
    const y = G.base - G.bh - b.r * (G.bh + G.gap);
    const k = kinds[b.k] || {};
    const rgb = k.rgb || '126, 156, 187';
    const kindName = k.name || '';
    const bw = G.bw, bh = G.bh, dx = D.x, dy = D.y;
    /* 顶部凸起：先画暗色柱身，再盖亮色顶面，形成圆柱颗粒 */
    const stud = cx => `<ellipse class="b-sstud" cx="${cx}" cy="${dy * 0.5 + 3.2}" rx="11" ry="5"/>
          <ellipse class="b-stud" cx="${cx}" cy="${dy * 0.5}" rx="11" ry="5"/>`;
    return `<g class="blk k-${b.k}" data-kind="${esc(kindName)}" transform="translate(${x},${y})" style="--c:${rgb}">
        <g class="blk-in" style="animation-delay:${n * 85}ms">
          <polygon class="b-side" points="${bw},0 ${bw + dx},${dy} ${bw + dx},${bh + dy} ${bw},${bh}"/>
          <polygon class="b-top" points="0,0 ${dx},${dy} ${bw + dx},${dy} ${bw},0"/>
          ${stud(bw * 0.29 + dx * 0.5)}
          ${stud(bw * 0.71 + dx * 0.5)}
          <rect class="b-body" x="0" y="0" width="${bw}" height="${bh}" rx="7"/>
          <rect class="b-shine" x="7" y="5" width="${bw - 14}" height="8" rx="4"/>
          <rect class="b-foot" x="0" y="${bh - 4}" width="${bw}" height="4" rx="2"/>
          <text class="b-t" x="${bw / 2}" y="${bh / 2 + 5}">${esc(b.t)}</text>
        </g>
      </g>`;
  }

  function sideHTML(slide, B) {
    const badges = (slide.bullets || []).map(b => `<li>${b}</li>`).join('');
    return `<aside class="bl-side">
        <div class="bl-pname"></div>
        <p class="bl-pdesc"></p>
        <div class="bl-kinds"></div>
        <div class="bl-note">${esc(B.note || '')}</div>
        <ul class="bl-summary">${badges}</ul>
      </aside>`;
  }

  /* ---------------- 挂载 ---------------- */
  function mount(root, slide) {
    const B = slide.blocks || {};
    const kinds = B.kinds || {};
    const plans = B.plans || [];

    root.innerHTML = `<div class="bl-main">
        <div class="bl-stage">${skeletonHTML(B)}</div>
        <div class="bl-chips">
          ${plans.map((p, i) => `<button type="button" class="bl-chip" data-i="${i}">${esc(p.chip)}</button>`).join('')}
          <button type="button" class="bl-auto">自动巡演</button>
        </div>
      </div>` + sideHTML(slide, B);

    const layer = root.querySelector('.bl-layer');
    const frame = root.querySelector('.bl-frame');
    const found = root.querySelector('.bl-found');
    const nameEl = root.querySelector('.bl-name');
    const pName = root.querySelector('.bl-pname');
    const pDesc = root.querySelector('.bl-pdesc');
    const kindsEl = root.querySelector('.bl-kinds');
    const chips = [...root.querySelectorAll('.bl-chip')];
    const autoBtn = root.querySelector('.bl-auto');

    let cur = -1, timer = null;

    function kindBadges(plan) {
      const seen = [];
      (plan.blocks || []).forEach(b => {
        if (b.k === 'extra' || b.k === 'ghost') return;
        if (!kinds[b.k] || seen.includes(b.k)) return;
        seen.push(b.k);
      });
      return seen.map(k => `<span class="bl-badge" style="--c:${kinds[k].rgb}">${esc(kinds[k].name)}</span>`).join('');
    }

    function build(plan) {
      layer.innerHTML = (plan.blocks || []).map((b, n) => blockHTML(b, kinds, n)).join('');
      nameEl.textContent = plan.name || '';
      frame.classList.add('pulse');
      found.classList.add('pulse');
      setTimeout(() => { frame.classList.remove('pulse'); found.classList.remove('pulse'); }, 720);
    }

    function paint(plan) {
      pName.textContent = plan.name || '';
      pDesc.textContent = plan.desc || '';
      kindsEl.innerHTML = kindBadges(plan);
      chips.forEach((c, i) => c.classList.toggle('on', i === cur));
    }

    function select(i, instant) {
      if (i < 0 || i >= plans.length || i === cur) return;
      const plan = plans[i];
      const old = [...layer.children];
      cur = i;
      paint(plan);
      if (!old.length || instant) { build(plan); return; }
      old.forEach((g, n) => {
        g.classList.add('in-out');
        const inner = g.querySelector('.blk-in');
        if (inner) inner.style.animationDelay = (n * 28) + 'ms';
      });
      setTimeout(() => build(plan), 240 + old.length * 28);
    }

    function stopAuto() {
      if (timer) { clearInterval(timer); timer = null; autoBtn.classList.remove('on'); autoBtn.textContent = '自动巡演'; }
    }
    function startAuto() {
      stopAuto();
      autoBtn.classList.add('on');
      autoBtn.textContent = '停止巡演';
      timer = setInterval(() => select((cur + 1) % plans.length), 3200);
    }

    root.addEventListener('click', e => {
      const chip = e.target.closest('.bl-chip');
      if (chip) { stopAuto(); select(+chip.dataset.i); return; }
      if (e.target.closest('.bl-auto')) { timer ? stopAuto() : startAuto(); }
    });

    return {
      /* 默认自动巡演：进入页面先搭起第一个建筑，随后每 3.2s 换下一个；
         点击任一方案按钮即停下，交给演讲者手动控制 */
      activate() { if (cur < 0) select(0); startAuto(); },
      advance() { return false; },   // 不拦截翻页，交互全部交给点击
      stop() { stopAuto(); },
    };
  }

  return { mount };
})();
