/* 左侧要点 ↔ 右侧流程图联动
   ------------------------------------------------------------------
   目的：原本右图整张占一次 frag，要等要点全讲完才出现，讲前几条时右半屏一直空着。
   改为：讲到第 i 条要点，右图对应的那一步就显影，当前这一步换成品牌蓝描边。

   刻意不做的事（2026-10-27 视觉评审的结论）：
   - 不在右图加编号方片 —— 编号只保留在左侧要点上（用户 2026-10-28 明确）；
   - 不换底色、不加色块 —— 实心高亮像“选中按钮”，与全篇浅色风格冲突；
   - 不新增版式、不改配色 —— 全部讲完后画面与原版逐像素一致。

   映射表 MAP 按页登记：MAP[页码] = [ 图1的映射, 图2的映射, … ]，
   其中每张图的映射是 [ 第1条要点点亮的步骤下标[], 第2条…, … ]（步骤下标 0 起算）。
   **数组末位 = 这条要点的落点**，描边聚焦在它身上；前面的是一并点亮的铺垫步骤，
   所以数组不必升序（例如 P20 要点3 写成 [4, 6, 5]：亮 5/7/6 三步，焦点落在第 6 步）。
   空数组表示这条要点在这张图上没有落点。没登记的页不受影响。 */
(function () {
  'use strict';

  const MAP = {
    /* P8 同源演进：三条要点正是图上三层 */
    8: [[[0], [1], [2]]],

    /* P17 pgvector：四条要点 = 四个接入点 */
    17: [[[0], [1], [2], [3]]],

    /* P18 auto_explain：要点1 讲加载阶段（图A 整条注册链，落点是“保存 prev 再改写 Hook”），
       要点2–4 沿图B 调用链推进 */
    18: [
      [[0, 1, 3, 2], [], [], []],
      [[], [0], [1, 2], [3]],
    ],

    /* P19 pg_stat_statements：三条路径各对应一张图，要点4 是结论、不另点亮 */
    19: [
      [[0, 2, 1], [], [], []],          // 落点 RegisterShmemCallbacks
      [[], [0, 2, 1], [], []],          // 落点 pgss_store
      [[], [], [0, 1, 2], []],          // 落点 …_internal
    ],

    /* P20 共享内存主线：申报 → 分配 → 初始化。
       要点3 连带点亮尾部的 DSM / 兼容路径，但焦点落在 ShmemInitRequested；
       要点4 讲 pgss 自己的做法，图上没有独立步骤 */
    20: [[[0, 1], [2, 3], [4, 6, 5], []]],

    /* P21 preload：四条要点 = 加载路径的四段 */
    21: [[[0], [1], [2], [3]]],

    /* P23 DSM：要点1–2 走运行调用链，要点3 对应创建分支细节 */
    23: [
      [[0, 1], [2, 4, 3], [], []],      // 落点依次是 init_dsm_registry、创建/复用映射
      [[], [], [0, 2, 1], []],          // 落点 dsm_pin_segment / dsm_pin_mapping
    ],

    /* P24 后台进程：要点1 静态链，要点2–3 动态链前后半段 */
    24: [
      [[0, 2, 1], [], [], []],          // 落点 RegisterBackgroundWorker
      [[], [0, 1, 2], [3, 4, 5], []],   // 落点 SendPostmasterSignal、worker 运行入口
    ],

    /* P26 CREATE/UPDATE/DROP：要点1 讲整条安装链，要点2 把焦点移到其中的“依赖”那一环。
       不让“依赖”那步留空等着——中间空一格看着像漏掉了一步（2026-10-28 实测后改） */
    26: [
      [[0, 1, 3, 2], [1], [], []],      // 落点 InsertExtensionTuple；要点2 焦点移到“依赖”
      [[], [], [0, 2, 1], []],          // 落点 ApplyExtensionUpdates
      [[], [], [], [0, 1, 2]],          // 落点“进程库与 Hook 不自动卸载”
    ],
  };

  /* 一张 flow 图：取框（宽度 > 300 的 rect）、框内文字、框之间的箭头 */
  function parseFlow(svg) {
    const boxes = [...svg.querySelectorAll('rect')].filter(r => +r.getAttribute('width') > 300);
    if (!boxes.length) return null;
    const texts = [...svg.querySelectorAll('text')];
    const paths = [...svg.querySelectorAll('path')].filter(p => !p.closest('marker'));
    return boxes.map((r, i) => {
      const y = +r.getAttribute('y'), h = +r.getAttribute('height');
      const els = [r, ...texts.filter(t => { const ty = +t.getAttribute('y'); return ty > y && ty < y + h; })];
      /* 指向本框的箭头跟着本框一起显影 */
      if (i) els.push(...paths.filter(p => {
        const m = /V\s*([\d.]+)/.exec(p.getAttribute('d') || '');
        return m && Math.abs(+m[1] - (y - 4)) < 3;
      }));
      els.forEach(e => e.setAttribute('data-st', 'todo'));
      return els;
    });
  }

  function setup(slide, plan) {
    const vis = slide.querySelector('.s-visual');
    if (!vis || slide.dataset.sync) return null;
    const flows = [...vis.querySelectorAll('svg.logic')].map(parseFlow).filter(Boolean);
    if (!flows.length) return null;
    slide.dataset.sync = '1';
    vis.classList.remove('frag');          // 由本脚本接管显隐，不再单独占一次翻页
    vis.classList.add('on', 'sync-vis');

    const lis = [...slide.querySelectorAll('.s-screen li')];
    const paint = hover => {
      const k = lis.filter(li => li.classList.contains('on')).length;
      /* 一条要点都没讲时整图不出现，进场画面与原版一致 */
      vis.classList.toggle('sync-hold', k === 0);
      flows.forEach((steps, f) => {
        const m = plan[f] || [];
        const upto = hover != null ? lis.length : k;     // 悬停预览时按全亮算底
        const reached = new Set();
        for (let i = 0; i < upto; i++) (m[i] || []).forEach(x => reached.add(x));
        /* 当前焦点 = 正在讲的那条要点在本图上的落点（取该组最后一个）。
           全部讲完后不再聚焦，画面回到原版。 */
        let cur = [];
        if (hover != null) cur = m[hover] || [];
        else if (k > 0 && k < lis.length) { const g = m[k - 1] || []; cur = g.length ? [g[g.length - 1]] : []; }
        steps.forEach((els, i) => {
          const v = cur.includes(i) ? 'cur' : (reached.has(i) ? 'done' : 'todo');
          els.forEach(e => e.setAttribute('data-st', v));
        });
      });
    };

    new MutationObserver(() => paint()).observe(slide.querySelector('.s-screen'),
      { subtree: true, attributes: true, attributeFilter: ['class'] });
    /* 指针停在某条要点上时临时点亮对应步骤，方便讲者指图 */
    lis.forEach((li, i) => {
      li.addEventListener('mouseenter', () => li.classList.contains('on') && paint(i));
      li.addEventListener('mouseleave', () => paint());
    });
    paint();
    return { flows: flows.map(s => s.length), bullets: lis.length };
  }

  function boot() {
    /* 按 data-idx（= DECK_DATA.slides 的下标）定位，不依赖 DOM 顺序 */
    const byIdx = new Map();
    document.querySelectorAll('.slide').forEach(s => {
      if (s.dataset.idx !== undefined) byIdx.set(+s.dataset.idx, s);
    });
    const report = {};
    Object.keys(MAP).forEach(no => {
      const slide = byIdx.get(+no - 1);
      if (!slide) return;
      const r = setup(slide, MAP[no]);
      if (r) {
        r.title = (slide.querySelector('.s-title, h2') || {}).textContent || '';
        report[no] = r;
      }
    });
    window.__SYNC = report;                 // 供验收脚本核对页码 / 图数 / 步数与映射是否一致
  }
  if (document.readyState === 'complete') setTimeout(boot, 60);
  else window.addEventListener('load', () => setTimeout(boot, 60));
})();
