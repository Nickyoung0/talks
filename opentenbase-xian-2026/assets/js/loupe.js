/* ============================================================
   图片放大镜（零依赖）
   用法：给 figure 加 .zoomable，图片包在 .zoom-wrap 内，内含 .loupe。
   指针进入图片后显示镜片，镜片内用同一张图做背景放大 Z 倍，
   镜片中心始终被夹在图片内，保证镜片里一定有内容。
   ============================================================ */
window.Loupe = (() => {
  'use strict';
  const Z = 2.4;          // 放大倍数
  const D = 168;          // 镜片直径（CSS px，未缩放坐标）
  const R = D / 2;

  function bind(fig) {
    const wrap = fig.querySelector('.zoom-wrap');
    const img = fig.querySelector('.zoom-wrap img');
    const loupe = fig.querySelector('.loupe');
    if (!wrap || !img || !loupe) return;

    let w = 0, h = 0, ready = false;
    const measure = () => { w = img.offsetWidth; h = img.offsetHeight; ready = w > 0 && h > 0; };

    const onMove = e => {
      if (!ready) measure();
      if (!ready) return;
      const r = img.getBoundingClientRect();
      const k = r.width / w || 1;                     // 舞台缩放系数
      let x = (e.clientX - r.left) / k;
      let y = (e.clientY - r.top) / k;
      const cx = Math.min(Math.max(x, R), Math.max(w - R, R));
      const cy = Math.min(Math.max(y, R), Math.max(h - R, R));
      loupe.style.setProperty('--lpx', cx.toFixed(1) + 'px');
      loupe.style.setProperty('--lpy', cy.toFixed(1) + 'px');
      loupe.style.setProperty('--lbp', (-(cx * Z - R)).toFixed(1) + 'px ' + (-(cy * Z - R)).toFixed(1) + 'px');
      loupe.style.setProperty('--lbs', (w * Z).toFixed(1) + 'px ' + (h * Z).toFixed(1) + 'px');
      wrap.classList.add('is-zoom');
    };

    const paint = () => { loupe.style.backgroundImage = 'url("' + img.src + '")'; };
    img.addEventListener('load', () => { measure(); paint(); });
    if (img.complete) { measure(); paint(); } else paint();

    img.addEventListener('pointerenter', e => { measure(); onMove(e); });
    img.addEventListener('pointermove', onMove);
    img.addEventListener('pointerleave', () => wrap.classList.remove('is-zoom'));
    img.addEventListener('load', measure);
    if (img.complete) measure();
  }

  function mount(root) {
    (root || document).querySelectorAll('.zoomable').forEach(bind);
  }

  return { mount, Z };
})();
