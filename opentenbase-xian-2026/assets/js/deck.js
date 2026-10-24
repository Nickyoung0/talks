/* ============================================================
   OpenTenBase 城市行 · 西安站 —— 网页演示引擎（零依赖）
   键盘：→/↓/空格/PgDn 下一步 · ←/↑/PgUp 上一步 · Home/End 首末页
        F 全屏 · N 演讲者视图 · O 总览 · B 黑屏 · H 帮助 · 数字+回车跳页
   ============================================================ */
(() => {
  'use strict';
  const D = window.DECK_DATA;
  const W = 1280, H = 720;
  const $ = s => document.querySelector(s);

  const EVENT = D.event;

  /* ---------------- 渲染 ---------------- */
  function esc(s) { return s; } // 内容来自可信的备课数据，本身已是 HTML
  const footHTML = no => `<footer class="s-foot">
      <span class="s-foot-series">${esc(EVENT.series)}</span>
      <span class="pageno">${String(no).padStart(2, '0')}</span></footer>`;

  /* 每页右上角品牌标识（位置与比例对齐官方 PPT 模版：开放原子在左、OpenTenBase 在右） */
  const brandHTML = (dark = false) => `<div class="s-brand${dark ? ' dark' : ''}" aria-hidden="true">
      <img class="oa" src="assets/img/logo-openatom.png" alt="开放原子开源基金会">
      <img class="otb" src="assets/img/logo-opentenbase.png" alt="OpenTenBase">
    </div>`;

  // 分享嘉宾条：姓名 + 单位/头衔（含 ACE 的项自动套金色徽标）
  function speakerLine() {
    const tags = (EVENT.speaker_title || '').split('·').map(x => x.trim()).filter(Boolean);
    const items = tags.map(x => {
      const ace = /ACE/i.test(x);
      return `<i class="spk-sep" aria-hidden="true"></i>`
        + `<span class="spk-item${ace ? ' is-ace' : ''}">${esc(x)}</span>`;
    }).join('');
    return `<span class="spk"><em class="spk-name">${esc(EVENT.speaker)}</em>${items}</span>`;
  }

  function coverSlide(s) {
    return `<div class="streaks"><i></i><i></i><i></i><i></i></div>
      <div class="cover-particles" aria-hidden="true">${'<i></i>'.repeat(12)}</div>
      <div class="cover-top">
        <div class="ct-logos">
          <img class="oa" src="assets/img/logo-openatom.png" alt="开放原子开源基金会">
          <span class="sep"></span>
          <img class="otb" src="assets/img/logo-opentenbase.png" alt="OpenTenBase">
        </div>
        <span class="brand-right">
          <img class="tc" src="assets/img/logo-tencentcloud.png" alt="腾讯云">
        </span>
      </div>
      <div class="cover-main">
        <div class="cover-series">${esc(EVENT.series.split('·')[0].trim())} <b>${esc(EVENT.series.split('·')[1] || '').trim()}</b></div>
        <h1 class="cover-title">${esc(s.title.replace('设计哲学', '<em>设计哲学</em>'))}</h1>
        <p class="cover-sub">${esc(s.thesis)}</p>
        <div class="cover-meta">
          <b>活动时间</b><span>${esc(EVENT.date)}</span>
          <b>活动地点</b><span>${esc(EVENT.venue)}</span>
          <b>分享嘉宾</b>${speakerLine()}
        </div>
      </div>
      <div class="cover-foot"><span>${esc(EVENT.organizer)}</span><span>OpenTenBase Tech Meetup</span></div>`;
  }

  /* 官方模版封面：深蓝底 + 自转地球 + 波浪光带，无 logo 无页脚。
     字号规范（PPT 1pt = 1.333px）：标题 54 号 → 72px，其余 16 号 → 21.3px */
  function coverOfficialSlide(s) {
    return `<div class="cvo-globe" aria-hidden="true"></div>
      <div class="cvo-wave" aria-hidden="true">
        <svg viewBox="0 0 1280 260" preserveAspectRatio="none">
          <path class="w1" d="M-60,150 C240,88 430,192 650,150 C890,104 1060,188 1340,128 L1340,260 L-60,260 Z"/>
          <path class="w2" d="M-60,192 C260,140 470,228 700,192 C950,150 1110,216 1340,176 L1340,260 L-60,260 Z"/>
        </svg>
      </div>
      <div class="cvo-lines" aria-hidden="true"></div>
      <div class="cvo-main">
        <h1 class="cvo-title">${esc(s.title)}</h1>
        <div class="cvo-dots" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="cvo-date">${esc(EVENT.date)}</div>
        <div class="cvo-speaker"><b>演讲人</b><span>${esc(EVENT.speaker)}</span></div>
      </div>`;
  }

  /* 结束页：官方模版 Thanks——白底 + 左上模版标 + 双 logo + 蓝色横线 + Impact 大字 + 底部波浪。
     字号规范（PPT 1pt = 1.333px）：Thanks 80 号 → 106.7px */
  function thanksSlide(s) {
    return `<div class="thk-mark" aria-hidden="true"><i></i><i></i></div>
      <div class="thk-rule" aria-hidden="true"></div>
      <h1 class="thk-word">Thanks</h1>
      <div class="thk-foot">${esc(s.footer || EVENT.series)}</div>
      <div class="thk-wave" aria-hidden="true">
        <svg viewBox="0 0 1280 80" preserveAspectRatio="none">
          <defs><linearGradient id="thkwg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#2a3fe0"/><stop offset="1" stop-color="#0a1670"/>
          </linearGradient></defs>
          <path fill="url(#thkwg)" d="M0,58 C230,26 480,76 700,52 C930,26 1100,64 1280,40 L1280,80 L0,80 Z"/>
          <path fill="rgba(42,63,224,.35)" d="M0,66 C260,40 520,84 760,62 C980,42 1130,70 1280,52 L1280,80 L0,80 Z"/>
        </svg>
      </div>` + brandHTML();
  }

  function profileSlide(s) {
    return `<div class="streaks"><i></i><i></i><i></i><i></i></div>
      <header>
        <span class="kicker">${esc(s.kicker)}</span>
        <h2 class="s-title">${esc(s.title)}</h2>
      </header>
      <div class="pf-wrap">
        <div class="pf-card">
          <div class="pf-deco" aria-hidden="true"><i></i><i></i><i></i></div>
          <div class="pf-name-row">
            <h3 class="pf-name">${esc(s.name)}</h3>
            <span class="pf-name-en" aria-hidden="true">YANG XIANGBO</span>
          </div>
          <div class="pf-role">${esc(s.role)}</div>
          <ul class="pf-list">${s.creds.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
          <div class="pf-footline" aria-hidden="true"></div>
        </div>
        <figure class="pf-photo">
          <img src="${s.photo}" alt="${esc(s.photo_alt || s.name)}">
          <figcaption class="pf-cap">${esc(s.photo_alt || '')}</figcaption>
        </figure>
      </div>` + brandHTML() + footHTML(s.no);
  }

  function agendaSlide(s) {
    return `<header><span class="kicker">CONTENTS</span><h2 class="s-title">${esc(s.title)}</h2></header>
      <div class="agenda-grid">${s.chapters.map((c, i) => `
        <div class="agenda-item frag"><div class="agenda-num">${c.part || String(i + 1).padStart(2, '0')}</div>
        <div><h3>${esc(c.title)}</h3><p>${esc(c.intro)}</p></div></div>`).join('')}</div>` +
      (window.ElephantWalk ? window.ElephantWalk.render(s.tools) : '') + brandHTML() + footHTML(s.no);
  }

  function dividerSlide(s) {
    return `<div class="divider-ghost" aria-hidden="true">${esc(s.part)}</div>
      <div class="divider-part frag">${esc(s.part)}</div>
      <h1 class="divider-title frag">${esc(s.title)}</h1>
      <div class="divider-line frag"></div>
      ${s.subtitle ? `<p class="divider-sub frag">${esc(s.subtitle)}</p>` : ''}` + brandHTML(true);
  }

  function contentSlide(s) {
    const vis = s.visual
      ? `<figure class="s-visual frag">${s.visual}</figure>` : '';
    return `<header>
        <span class="kicker">${esc(s.chapter)}</span>
        <h2 class="s-title">${esc(s.title)}</h2>
        ${s.thesis ? `<p class="s-thesis">${esc(s.thesis)}</p>` : ''}
      </header>
      <div class="s-body ${s.visual ? '' : 'no-visual'}">
        <div class="s-screen">${s.screen}</div>${vis}
      </div>${s.extra || ''}` + brandHTML() + footHTML(s.no);
  }

  // 时间线要点的前导词增强：把条目开头的「××：」自动包成 .li-lead（加重 + 马克笔划线）。
  // 只处理两种安全形态：① 首子节点是文本且冒号在 14 字内；② 首子节点是行内代码/加粗
  // 元素、冒号紧跟其后。其余形态保持原样，不做任何改写。
  function enhanceScreenLeads(root) {
    root.querySelectorAll('.s-screen li').forEach(li => {
      const first = li.firstChild;
      if (!first) return;
      if (first.nodeType === 3) {
        const m = first.textContent.match(/^([^：<]{1,14})：/);
        if (!m) return;
        const b = document.createElement('b');
        b.className = 'li-lead';
        b.textContent = m[1] + '：';
        first.textContent = first.textContent.slice(m[0].length);
        li.insertBefore(b, first);
        return;
      }
      if (first.nodeType === 1 && /^(CODE|STRONG|B|EM|I)$/.test(first.tagName)) {
        const nxt = first.nextSibling;
        if (nxt && nxt.nodeType === 3 && nxt.textContent.startsWith('：')) {
          const b = document.createElement('b');
          b.className = 'li-lead';
          li.insertBefore(b, first);
          b.appendChild(first);
          b.appendChild(document.createTextNode('：'));
          nxt.textContent = nxt.textContent.slice(1);
        }
      }
    });
  }

  function closingSlide(s) {
    const links = s.variant === 'thanks' ? `<div class="repo-links">
        <a href="https://github.com/OpenTenBase/OpenTenBase" target="_blank" rel="noopener">OpenTenBase · GitHub</a>
        <a href="https://github.com/pgvector/pgvector" target="_blank" rel="noopener">pgvector · GitHub</a>
        <a href="https://www.opentenbase.org" target="_blank" rel="noopener">opentenbase.org</a></div>` : '';
    return `<header>
        <span class="kicker">${esc(s.chapter)}</span>
        ${s.variant === 'thanks' ? '<div class="big-qa frag">Q &amp; A</div>' : `<h2 class="s-title">${esc(s.title)}</h2>`}
        <p class="s-thesis">${esc(s.thesis)}</p>
      </header>
      <div class="s-body"><div class="s-screen"><ul>${(s.bullets || []).map(b => `<li class="frag">${b}</li>`).join('')}</ul></div></div>
      ${links}` + brandHTML() + footHTML(s.no);
  }

  function machineSlide(s) {
    return `<header>
        <span class="kicker">${esc(s.chapter)}</span>
        <h2 class="s-title">${esc(s.title)}</h2>
        ${s.thesis ? `<p class="s-thesis">${esc(s.thesis)}</p>` : ''}
      </header>
      <div class="s-body machine-body"><div class="mach-root"></div></div>` + brandHTML() + footHTML(s.no);
  }

  function blocksSlide(s) {
    return `<header>
        <span class="kicker">${esc(s.chapter)}</span>
        <h2 class="s-title">${esc(s.title)}</h2>
        ${s.thesis ? `<p class="s-thesis">${esc(s.thesis)}</p>` : ''}
      </header>
      <div class="s-body blocks-body"><div class="blk-root"></div></div>` + brandHTML() + footHTML(s.no);
  }

  const stage = $('#stage');
  const slideEls = [];
  const machines = new Map();
  const blocks = new Map();
  const globes = new Map();
  D.slides.forEach((s, i) => {
    const el = document.createElement('section');
    el.className = 'slide ' + s.kind;
    el.dataset.idx = i;
    el.innerHTML = s.kind === 'cover' ? coverSlide(s)
      : s.kind === 'cover2' ? coverOfficialSlide(s)
      : s.kind === 'profile' ? profileSlide(s)
      : s.kind === 'agenda' ? agendaSlide(s)
      : s.kind === 'divider' ? dividerSlide(s)
      : s.kind === 'closing' ? closingSlide(s)
      : s.kind === 'machine' ? machineSlide(s)
      : s.kind === 'blocks' ? blocksSlide(s)
      : s.kind === 'thanks' ? thanksSlide(s)
      : contentSlide(s);
    if (s.kind === 'machine' && window.MachineLab) {
      machines.set(i, window.MachineLab.mount(el.querySelector('.mach-root'), s));
    }
    if (s.kind === 'blocks' && window.BlocksLab) {
      blocks.set(i, window.BlocksLab.mount(el.querySelector('.blk-root'), s));
    }
    if (s.kind === 'cover2' && window.CoverGlobe) {
      globes.set(i, window.CoverGlobe.mount(el.querySelector('.cvo-globe')));
    }
    // 4 条及以上要点的页面自动进入紧凑档，保证要点列不压页脚
    if (el.querySelectorAll('.s-screen li').length >= 4) el.classList.add('dense-li');
    // 时间线版式：包装「××：」前导词（在收集 frag 之前完成，避免污染遍历）
    enhanceScreenLeads(el);
    // 收集分步元素：屏幕要点逐条、视觉图整体
    el.querySelectorAll('.s-screen li, .s-visual, .agenda-item, .divider-part, .divider-title, .divider-line, .divider-sub, .big-qa, .closing .s-screen li, .repo-links')
      .forEach(node => node.classList.add('frag'));
    stage.appendChild(el);
    slideEls.push(el);
  });
  // 附录作为演示后的备查页
  D.appendices.forEach(a => {
    const el = document.createElement('section');
    el.className = 'slide appendix-slide';
    el.dataset.idx = slideEls.length;
    el.style.overflow = 'auto';
    el.innerHTML = `<header><span class="kicker">附录 ${esc(a.key.toUpperCase())}</span>
      <h2 class="s-title" style="font-size:30px">${esc(a.title)}</h2>
      <p class="s-thesis">${esc(a.intro)}</p></header>
      <div class="p-detail" style="flex:1;margin-top:18px">${a.body}</div>` + brandHTML();
    el.querySelectorAll('.frag').forEach(n => n.classList.add('on'));
    stage.appendChild(el);
    slideEls.push(el);
  });

  // 图片放大镜（第 9 页生态图）：指针移到图上局部放大
  if (window.Loupe) window.Loupe.mount(stage);

  /* ---------------- 缩放 ---------------- */
  /* 触摸设备额外提供：整页 / 铺满宽度 两种视图，以及双指与按钮缩放。
     桌面与投影场景行为与之前完全一致（整页等比缩放 0.985）。 */
  const COARSE = matchMedia('(hover: none) and (pointer: coarse)').matches;
  const wrapEl = document.getElementById('stage-wrap');
  let vmode = 'fit';          // 'fit' 整页等比 | 'fill' 铺满宽度（纵向可滚动）
  let zoom = 1;               // 额外倍率
  let curS = 1;

  function vvSize() {
    const vv = window.visualViewport;     // iPhone 上避开 Safari 工具栏遮挡
    return { w: vv ? vv.width : innerWidth, h: vv ? vv.height : innerHeight };
  }
  function baseScale() {
    const { w, h } = vvSize();
    if (vmode === 'fill') return w / W;   // 16:9 画布按宽度铺满，纵向滚动查看
    return Math.min(w / W, h / H) * 0.985;
  }
  function applyScale(anchor) {
    const prev = curS;
    curS = baseScale() * zoom;
    document.documentElement.style.setProperty('--s', curS);
    // 以手指/屏幕中心为锚点，缩放后保持同一内容点位置
    if (anchor && prev && wrapEl) {
      const r = wrapEl.getBoundingClientRect();
      const relX = anchor.x - r.left, relY = anchor.y - r.top;
      const cx = (wrapEl.scrollLeft + relX) / prev, cy = (wrapEl.scrollTop + relY) / prev;
      wrapEl.scrollLeft = cx * curS - relX;
      wrapEl.scrollTop = cy * curS - relY;
    }
  }
  function fit(keepAnchor) {
    applyScale(keepAnchor ? { x: innerWidth / 2, y: innerHeight / 2 } : null);
    const btn = $('#hud .vfit');
    if (btn) btn.textContent = vmode === 'fit' ? '整页' : '铺满';
  }
  addEventListener('resize', () => fit(true));
  addEventListener('orientationchange', () => setTimeout(() => fit(true), 80));
  if (window.visualViewport) visualViewport.addEventListener('resize', () => fit(true));
  fit();

  /* 按钮缩放 / 视图切换 */
  const clampZ = z => Math.min(3.2, Math.max(0.8, z));
  const zIn = $('#hud .zin'), zOut = $('#hud .zout'), vFitBtn = $('#hud .vfit');
  if (zIn) zIn.addEventListener('click', () => { zoom = clampZ(zoom * 1.25); applyScale({ x: innerWidth / 2, y: innerHeight / 2 }); });
  if (zOut) zOut.addEventListener('click', () => { zoom = clampZ(zoom / 1.25); applyScale({ x: innerWidth / 2, y: innerHeight / 2 }); });
  if (vFitBtn) vFitBtn.addEventListener('click', () => {
    vmode = vmode === 'fit' ? 'fill' : 'fit';
    zoom = 1;
    applyScale();
    if (wrapEl) { wrapEl.scrollTop = 0; wrapEl.scrollLeft = 0; }
    vFitBtn.textContent = vmode === 'fit' ? '整页' : '铺满';
  });

  /* 双指缩放（iPhone / Android 通用）：以两指中点为锚点 */
  /* iOS Safari 的页面级缩放不受 touch-action 约束，需用私有 gesture 事件拦掉，
     否则会出现“系统缩放 + 自定义缩放”叠加；Android Chrome 无此事件，直接忽略。 */
  if (wrapEl) {
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => {
      wrapEl.addEventListener(t, e => e.preventDefault(), { passive: false });
    });
  }
  let pinch = null;
  if (wrapEl) {
    wrapEl.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        const [a, b] = e.touches;
        pinch = {
          d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
          z: zoom,
          x: (a.clientX + b.clientX) / 2,
          y: (a.clientY + b.clientY) / 2,
        };
      }
    }, { passive: true });
    wrapEl.addEventListener('touchmove', e => {
      if (!pinch || e.touches.length !== 2) return;
      e.preventDefault();
      const [a, b] = e.touches;
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      zoom = clampZ(pinch.z * (d / pinch.d));
      applyScale({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 });
    }, { passive: false });
    wrapEl.addEventListener('touchend', () => { pinch = null; }, { passive: true });
  }

  /* 手机横屏默认“铺满宽度”：16:9 画布占满屏宽，纵向滑动看完整页 */
  if (COARSE && innerWidth > innerHeight && Math.min(innerWidth, innerHeight) <= 500) {
    vmode = 'fill';
    fit();
  }

  /* ---------------- 导航与分步 ---------------- */
  let idx = 0;
  const frags = el => [...el.querySelectorAll('.frag')];
  const pending = el => frags(el).filter(f => !f.classList.contains('on'));

  function show(i, back = false) {
    i = Math.max(0, Math.min(slideEls.length - 1, i));
    if (i === idx && slideEls[i].classList.contains('active')) return;
    const from = idx;
    slideEls.forEach((el, j) => {
      el.classList.toggle('active', j === i);
      el.classList.toggle('leaving', j === from && j !== i);
    });
    // 方向性入场：前进从右侧推入、回退从左侧推入（互动机器页保持原有动效，不参与）
    const target = slideEls[i];
    target.classList.remove('enter-fwd', 'enter-back');
    if (!target.classList.contains('machine')) {
      void target.offsetWidth;                       // 强制重排，保证动画每次都重放
      target.classList.add(i >= from ? 'enter-fwd' : 'enter-back');
    }
    idx = i;
    // 搭积木页：进入时自动搭起第一个建筑；离开时停掉自动巡演
    const prevBlocks = blocks.get(from);
    if (prevBlocks && from !== i) prevBlocks.stop && prevBlocks.stop();
    const bk = blocks.get(i);
    if (bk && bk.activate) bk.activate();
    // 封面地球：进入页面开始自转，翻走即停表
    const prevGlobe = globes.get(from);
    if (prevGlobe && from !== i) prevGlobe.stop && prevGlobe.stop();
    const gb = globes.get(i);
    if (gb && gb.activate) gb.activate();
    $('#timebar').style.width = ((i + 1) / slideEls.length * 100) + '%';
    if (back) frags(slideEls[i]).forEach(f => f.classList.add('on'));
    location.hash = String(i + 1);
    $('#hud .pagenum').textContent = `${i + 1} / ${slideEls.length}`;
    updateOverview();
    if (presenterOpen) renderPresenter();
  }
  function next() {
    // 目录页：演讲者若提前推进，入场动画立即收尾，不等满 3.9s
    slideEls[idx] && slideEls[idx].classList.add('rush');
    const m = machines.get(idx);              // 互动机器页：先在内部推进时序
    if (m && m.advance()) return;
    const p = pending(slideEls[idx]);
    if (p.length) { p[0].classList.add('on'); return; }
    show(idx + 1);
  }
  function prev() {
    const m = machines.get(idx);
    if (m && m.retreat()) return;
    show(idx - 1, true);
  }

  /* ---------------- 总览 ---------------- */
  const ov = $('#overview');
  const ovGrid = $('#overview .ov-grid');
  slideEls.forEach((el, i) => {
    const s = D.slides[i] || { title: '附录 ' + (D.appendices[i - D.slides.length] || {}).title, kind: 'appendix' };
    const b = document.createElement('button');
    b.className = 'ov-card'; b.type = 'button';
    const title = s.kind ? s.title : (D.appendices[i - D.slides.length] || {}).title || '附录';
    const kindName = { cover: '封面', cover2: '封面 · 模版', profile: '嘉宾', agenda: '目录', divider: '章节', content: '内容', closing: '收尾', machine: '互动 · 主板', blocks: '互动 · 积木', thanks: '结束' };
    b.innerHTML = `<div class="ov-no">${String(i + 1).padStart(2, '0')}</div>
      <div class="ov-title">${title.replace(/<[^>]+>/g, '')}</div>
      <div class="ov-kind">${s.chapter || ''} ${kindName[s.kind] || '附录备查'}</div>`;
    b.addEventListener('click', () => { ov.classList.remove('open'); show(i, true); });
    ovGrid.appendChild(b);
  });
  function updateOverview() {
    [...ovGrid.children].forEach((c, i) => c.classList.toggle('current', i === idx));
  }

  /* ---------------- 演讲者视图 ---------------- */
  let presenterOpen = false, timerSec = 0, timerOn = false, timerInt = null;
  const pBody = $('#presenter');
  function renderPresenter() {
    const s = D.slides[idx] || { title: '附录备查' };
    $('#presenter header h2').textContent = (s.title || '').replace(/<[^>]+>/g, '') || '（无标题）';
    $('#presenter .p-meta').textContent = `${s.chapter || ''} · 第 ${idx + 1} / ${slideEls.length} 页 · 建议时长 ${s.time || '—'}`;
    $('#presenter .p-text').innerHTML = (s.talk || '（本页无讲稿）');
    $('#presenter .p-detail').innerHTML = s.body || (D.appendices[idx - D.slides.length] || {}).body || '（无技术展开）';
    $('#presenter footer .next-tip').textContent = s.transition ? `下一页衔接：${s.transition.replace(/<[^>]+>/g, '')}` : '';
    $('#presenter footer .design-tip').textContent = s.design ? `制作提示：${s.design}` : '';
  }
  function togglePresenter(force) {
    presenterOpen = force !== undefined ? force : !presenterOpen;
    pBody.classList.toggle('open', presenterOpen);
    if (presenterOpen) renderPresenter();
  }
  function fmt(sec) { return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`; }
  function tickTimer() { timerSec++; $('#timer .read').textContent = fmt(timerSec); }
  $('#timer .toggle').addEventListener('click', () => {
    timerOn = !timerOn;
    $('#timer .toggle').textContent = timerOn ? '暂停' : '开始';
    if (timerOn) timerInt = setInterval(tickTimer, 1000); else clearInterval(timerInt);
  });
  $('#timer .reset').addEventListener('click', () => { timerSec = 0; $('#timer .read').textContent = '00:00'; });

  /* ---------------- 演示视频弹层 ---------------- */
  const vbox = $('#video-modal');
  const vboxEl = $('#video-modal .vm-stage');
  let videoOpen = false;

  function openVideo(src) {
    vboxEl.innerHTML = `<video src="${src.replace(/"/g, '&quot;')}" controls autoplay playsinline preload="auto"></video>`;
    const v = vboxEl.querySelector('video');
    v.addEventListener('error', () => {
      vboxEl.innerHTML = '<div class="vm-error">视频加载失败：请确认 assets/video/hello_pg-demo.mp4 与页面在同一目录</div>';
    });
    vbox.classList.add('open');
    videoOpen = true;
    document.body.classList.add('video-open');
  }
  function closeVideo() {
    const v = vboxEl.querySelector('video');
    if (v) { try { v.pause(); } catch (e) {} v.removeAttribute('src'); v.load(); }
    vboxEl.innerHTML = '';
    vbox.classList.remove('open');
    videoOpen = false;
    document.body.classList.remove('video-open');
  }
  stage.addEventListener('click', e => {
    const btn = e.target.closest('.demo-bar');
    if (btn && btn.dataset.video) openVideo(btn.dataset.video);
  });
  // 入口标签上预填视频真实时长（只取 metadata，不下载正文）
  stage.querySelectorAll('.demo-bar[data-video]').forEach(btn => {
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.src = btn.dataset.video;
    probe.addEventListener('loadedmetadata', () => {
      const d = Math.round(probe.duration);
      const t = btn.querySelector('.demo-time');
      if (t && Number.isFinite(d)) t.textContent = `${Math.floor(d / 60)}′${String(d % 60).padStart(2, '0')}″`;
    });
  });
  $('#video-modal .vm-close').addEventListener('click', closeVideo);
  $('#video-modal').addEventListener('click', e => { if (e.target === $('#video-modal')) closeVideo(); });

  /* ---------------- 帮助 ---------------- */
  const help = $('#help');

  /* ---------------- 事件 ---------------- */
  let numBuf = '';
  addEventListener('keydown', e => {
    if (e.target.matches('input, textarea')) return;
    // 视频弹层打开时：Esc / 空格 / 方向键归播放器，不翻页
    if (videoOpen) {
      if (e.key === 'Escape' || e.key === ' ') { e.preventDefault(); closeVideo(); }
      return;
    }
    if (/^[0-9]$/.test(e.key)) { numBuf += e.key; $('#hud .hint').textContent = numBuf; return; }
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown': e.preventDefault(); next(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': e.preventDefault(); prev(); break;
      case 'Enter':
        if (numBuf) { show(parseInt(numBuf, 10) - 1, true); numBuf = ''; $('#hud .hint').textContent = '·'; }
        else next();
        break;
      case 'Home': show(0, true); break;
      case 'End': show(slideEls.length - 1, true); break;
      case 'f': case 'F': document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); break;
      case 'n': case 'N': togglePresenter(); break;
      case 'o': case 'O': ov.classList.toggle('open'); updateOverview(); break;
      case 'b': case 'B': document.body.classList.toggle('blank'); break;
      case 'h': case 'H': case '?': help.classList.toggle('open'); break;
      case 'Escape':
        help.classList.remove('open'); ov.classList.remove('open');
        if (presenterOpen) togglePresenter(false);
        break;
      default: break;
    }
  });

  /* ---------------- 移动端：竖屏引导（可跳过） ---------------- */
  function fitRotate() {
    const phone = Math.min(innerWidth, innerHeight) <= 500;
    document.body.classList.toggle('portrait-phone',
      phone && innerHeight > innerWidth && !sessionStorage.getItem('rh-skip'));
  }
  addEventListener('resize', fitRotate);
  addEventListener('orientationchange', () => setTimeout(fitRotate, 60));
  fitRotate();
  const rh = document.getElementById('rotate-hint');
  if (rh) {
    rh.querySelector('.rh-skip').addEventListener('click', () => {
      try { sessionStorage.setItem('rh-skip', '1'); } catch (_) {}
      fitRotate();
    });
    // 引导层出现时挡住翻页触摸/滚轮
    rh.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
    rh.addEventListener('touchend', e => e.stopPropagation(), { passive: true });
  }

  let touchX = null, touchY = null;
  addEventListener('touchstart', e => {
    if (e.touches.length !== 1) { touchX = null; return; }
    touchX = e.touches[0].clientX; touchY = e.touches[0].clientY;
  }, { passive: true });
  addEventListener('touchend', e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    const dy = e.changedTouches[0].clientY - touchY;
    // 纵向意图（滚动看完整页内容）优先；画布已放大可横向平移时，不再触发翻页
    const canPanX = wrapEl && (wrapEl.scrollWidth - wrapEl.clientWidth) > 4;
    if (!canPanX && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? next() : prev());
    touchX = null;
  }, { passive: true });

  let wheelLock = false;
  addEventListener('wheel', e => {
    if (e.target.closest('.appendix-slide, .p-detail, #overview')) return;
    if (Math.abs(e.deltaY) < 24 || wheelLock) return;
    wheelLock = true; setTimeout(() => wheelLock = false, 500);
    e.deltaY > 0 ? next() : prev();
  }, { passive: true });

  $('#hud .prev').addEventListener('click', prev);
  $('#hud .next').addEventListener('click', next);
  $('#hud .ov').addEventListener('click', () => { ov.classList.toggle('open'); updateOverview(); });
  $('#hud .pres').addEventListener('click', () => togglePresenter());
  $('#hud .fs').addEventListener('click', () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
  $('#presenter .close').addEventListener('click', () => togglePresenter(false));

  addEventListener('hashchange', () => {
    const n = parseInt(location.hash.slice(1), 10);
    if (n >= 1 && n <= slideEls.length && n - 1 !== idx) show(n - 1, true);
  });

  /* ---------------- 启动 ---------------- */
  const start = parseInt(location.hash.slice(1), 10);
  show(Number.isFinite(start) && start >= 1 ? start - 1 : 0, true);
  $('#hud .hint').textContent = 'H 帮助';
})();
