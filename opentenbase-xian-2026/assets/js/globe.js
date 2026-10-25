/* 封面右上角地球：真实球面自转（canvas 2D，零依赖，file:// 可用）
   画面构成：
   1) 大陆板块由更小更密的点阵刻出来（陆地点取自 Natural Earth 50m 陆地轮廓判定），
      并用同一份轮廓描出海岸线，板块边界清晰；
   2) 海面圆点铺在测地格点上（正二十面体 Class I 细分），沿三个方向各自排成直线，
      同方向的相邻圆点连成一条连续的细虚线，整张网随地球一起转，只画正面可见的段；
   3) 经纬线随自转一起移动，是“球在转”最直接的线索；
   4) 大气光晕 + 球面明暗 + 轮廓，撑出球体的体积。
   几何全部预算成单位向量，每帧只做矩阵乘加；尊重“减弱动态”偏好时只画静帧，
   可用 step() 手动推进（导出与验收用）。 */
(function () {
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* Fibonacci 球面分布：等面积铺点，不会往两极堆；
     加小幅度随机抖动打散螺旋纹理（只用于大陆点阵，网格不用它） */
  function spherePoints(n, jitScale) {
    const pts = new Array(n);
    const ga = Math.PI * (3 - Math.sqrt(5));
    const jit = (Math.PI / Math.sqrt(n)) * (jitScale || 1);   // 约半个格距
    for (let i = 0; i < n; i++) {
      const sy = 1 - (2 * i + 1) / n;
      const lat = Math.asin(clamp(sy, -1, 1)) + (Math.random() - 0.5) * jit;
      const lon = ((ga * i) % TAU) + (Math.random() - 0.5) * jit * 2;
      pts[i] = { lat, lon };
    }
    return pts;
  }

  /* 经纬度 → 单位向量（y 轴为地轴） */
  const vec = (lat, lon) => {
    const cl = Math.cos(lat);
    return { x: cl * Math.cos(lon), y: Math.sin(lat), z: cl * Math.sin(lon) };
  };
  const unit = (x, y, z) => {
    const l = Math.sqrt(x * x + y * y + z * z) || 1;
    return { x: x / l, y: y / l, z: z / l };
  };

  /* 陆地轮廓：扁平数组 [lon,lat,...] → 带 bbox 的环 */
  function prepRings() {
    const src = window.LAND_RINGS || [];
    return src.map(f => {
      let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
      for (let i = 0; i < f.length; i += 2) {
        const x = f[i], y = f[i + 1];
        if (x < minx) minx = x; if (x > maxx) maxx = x;
        if (y < miny) miny = y; if (y > maxy) maxy = y;
      }
      return { f, minx, maxx, miny, maxy, n: f.length >> 1 };
    });
  }

  /* 射线法判定点是否落在陆地环内 */
  function inLand(rings, lon, lat) {
    for (let k = 0; k < rings.length; k++) {
      const r = rings[k];
      if (lon < r.minx || lon > r.maxx || lat < r.miny || lat > r.maxy) continue;
      let inside = false;
      const f = r.f, n = r.n;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = f[2 * i], yi = f[2 * i + 1];
        const xj = f[2 * j], yj = f[2 * j + 1];
        if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) return true;
    }
    return false;
  }

  /* ---- 测地格点：正二十面体 Class I 细分 --------------------------------
     每个三角面按重心坐标细分成 freq 份再投影到球面。这样格点沿三个方向各自排在
     同一条大圆弧上，看起来就是一排排整齐的直线，网格自然、不歪扭。 */
  const PHI = (1 + Math.sqrt(5)) / 2;
  const ICO_V = [
    [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
    [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
    [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
  ].map(v => unit(v[0], v[1], v[2]));
  const ICO_F = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];

  function geodesic(freq) {
    const verts = [], tris = [], map = new Map();
    const add = v => {
      const k = Math.round(v.x * 1e5) + ',' + Math.round(v.y * 1e5) + ',' + Math.round(v.z * 1e5);
      let i = map.get(k);
      if (i === undefined) { i = verts.length; verts.push(v); map.set(k, i); }
      return i;
    };
    for (const f of ICO_F) {
      const a = ICO_V[f[0]], b = ICO_V[f[1]], c = ICO_V[f[2]];
      /* 面上的格点索引表 P(i,j)：共享边上的点由同一组重心坐标算出，天然重合 */
      const idx = [];
      for (let i = 0; i <= freq; i++) {
        idx.push(new Array(freq - i + 1));
        for (let j = 0; j <= freq - i; j++) {
          const wa = freq - i - j, wb = i, wc = j;
          idx[i][j] = add(unit(
            (a.x * wa + b.x * wb + c.x * wc) / freq,
            (a.y * wa + b.y * wb + c.y * wc) / freq,
            (a.z * wa + b.z * wb + c.z * wc) / freq));
        }
      }
      for (let i = 0; i < freq; i++) {
        for (let j = 0; j < freq - i; j++) {
          tris.push([idx[i][j], idx[i + 1][j], idx[i][j + 1]]);
          if (i + j < freq - 1) tris.push([idx[i + 1][j], idx[i + 1][j + 1], idx[i][j + 1]]);
        }
      }
    }
    return { verts, tris };
  }

  /* 把三角网拆成一条条“直线”：在每个格点上找出方向最接近相反的一对邻居，
     说明这条线是穿过去的；顺着这个关系把相邻线段串成整条，虚线才能连续不断。 */
  function buildLines(verts, tris) {
    const n = verts.length;
    const nb = new Array(n).fill(null).map(() => []);
    for (const t of tris) {
      for (let k = 0; k < 3; k++) {
        const a = t[k], b = t[(k + 1) % 3];
        if (nb[a].indexOf(b) < 0) nb[a].push(b);
        if (nb[b].indexOf(a) < 0) nb[b].push(a);
      }
    }
    const link = new Map();                       // key(v,u) = 从 u 走到 v 之后继续走到 w
    const K = (v, u) => v * n + u;
    for (let p = 0; p < n; p++) {
      const ns = nb[p];
      const dirs = ns.map(q => {
        const dx = verts[q].x - verts[p].x, dy = verts[q].y - verts[p].y, dz = verts[q].z - verts[p].z;
        const l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        return { x: dx / l, y: dy / l, z: dz / l };
      });
      for (let i = 0; i < ns.length; i++) {
        let bestJ = -1, best = -0.7;              // 六边形格点上直通的一对 dot ≈ -1，其余是 ±0.5
        for (let j = 0; j < ns.length; j++) {
          if (j === i) continue;
          const d = dirs[i].x * dirs[j].x + dirs[i].y * dirs[j].y + dirs[i].z * dirs[j].z;
          if (d < best) { best = d; bestJ = j; }
        }
        if (bestJ >= 0) link.set(K(p, ns[i]), ns[bestJ]);
      }
    }
    const used = new Set(), lines = [];
    for (let a = 0; a < n; a++) {
      for (const b of nb[a]) {
        if (used.has(K(a, b))) continue;
        const line = [a, b];
        used.add(K(a, b)); used.add(K(b, a));
        let prev = a, cur = b;                    // 往前接
        for (;;) {
          const w = link.get(K(cur, prev));
          if (w === undefined || w === prev || used.has(K(cur, w)) || line.indexOf(w) >= 0) break;
          used.add(K(cur, w)); used.add(K(w, cur));
          line.push(w); prev = cur; cur = w;
        }
        prev = b; cur = a;                        // 往回接
        for (;;) {
          const w = link.get(K(cur, prev));
          if (w === undefined || w === prev || used.has(K(cur, w)) || line.indexOf(w) >= 0) break;
          used.add(K(cur, w)); used.add(K(w, cur));
          line.unshift(w); prev = cur; cur = w;
        }
        lines.push(line);
      }
    }
    return lines;
  }

  window.CoverGlobe = {
    mount(host) {
      if (!host) return null;
      const cv = document.createElement('canvas');
      cv.className = 'cvo-globe-cv';
      host.innerHTML = '';
      host.appendChild(cv);
      const ctx = cv.getContext('2d');
      if (!ctx) return null;

      const S = {
        cx: 0.545, cy: 0.545, R: 0.40,      // 圆心跳到容器右下，让地球大部分落在画面内
        tilt: -0.34, roll: -0.28,           // 极轴倾斜 + 画面内倾角
        freq: 9,                            // 测地细分密度：格点数 = 10·freq² + 2
        seaR: 1.7, seaAlpha: 0.30,
        landSample: 100000, landR: 0.95, landAlpha: 1.0,
        coastA: 0.34, coastB: 0.15,         // 海岸线两档亮度（正面亮 / 边缘暗）
        meridians: 10, parallels: 6,
        meshAlpha: [0.09, 0.14, 0.19, 0.25, 0.33],   // 虚线按深度分五档，边缘淡出
        speed: 0.0030,                      // 弧度/帧（16.7ms），约 35 秒转一圈
        flow: 14,                           // 虚线流动速度（像素/秒）
      };

      /* 固定姿态矩阵：Rz(roll) · Rx(tilt) */
      const cosT = Math.cos(S.tilt), sinT = Math.sin(S.tilt);
      const cosR = Math.cos(S.roll), sinR = Math.sin(S.roll);
      const m11 = cosR, m12 = -cosT * sinR, m13 = sinT * sinR;
      const m21 = sinR, m22 = cosT * cosR, m23 = -sinT * cosR;
      const m32 = sinT, m33 = cosT;

      /* 点云预算：只存单位向量，每帧纯矩阵乘加。
         注意格点的经度是 0..360°，陆地数据是 -180..180°，判定时要对齐区间 */
      const rings = prepRings();
      const lonDeg = v => { const d = (Math.atan2(v.z, v.x) * 180) / Math.PI; return d > 180 ? d - 360 : d; };
      const latDeg = v => (Math.asin(clamp(v.y, -1, 1)) * 180) / Math.PI;

      /* 测地格点里落在海上的那些，才是网格的圆点；大陆留给密集点阵 */
      const geo = geodesic(S.freq);
      const sea = [];
      const seaOf = new Int32Array(geo.verts.length).fill(-1);
      geo.verts.forEach((v, i) => {
        if (!rings.length || !inLand(rings, lonDeg(v), latDeg(v))) {
          seaOf[i] = sea.length;
          sea.push(v);
        }
      });

      /* 海岸线顶点预算成单位向量三元组，每帧只做投影 */
      const coast = rings.map(r => {
        const a = new Float64Array(r.n * 3);
        for (let i = 0; i < r.n; i++) {
          const v = vec((r.f[2 * i + 1] * Math.PI) / 180, (r.f[2 * i] * Math.PI) / 180);
          a[3 * i] = v.x; a[3 * i + 1] = v.y; a[3 * i + 2] = v.z;
        }
        return a;
      });

      /* 直线：整张网先串成一条条线，再按大陆把线断开（大陆上不连线） */
      let lines = [];
      let segs = 0;
      setTimeout(() => {
        const raw = buildLines(geo.verts, geo.tris);
        const out = [];
        for (const ln of raw) {
          let cur = [];
          for (const v of ln) {
            const s = seaOf[v];
            if (s >= 0) cur.push(s);
            else { if (cur.length >= 2) out.push(Int32Array.from(cur)); cur = []; }
          }
          if (cur.length >= 2) out.push(Int32Array.from(cur));
        }
        lines = out;
        segs = out.reduce((a, l) => a + l.length - 1, 0);
        if (!raf) draw();
      }, 0);
      let seaProj = null;                    // 每帧的海点投影缓存（网格与圆点共用）
      let landProj = new Float32Array(0);    // 每帧的陆地点投影缓存

      /* 大陆点阵：判定 10 万个点约零点几秒，放到首帧之后异步做；
         手机屏小，密度按宽度降一档，保帧率 */
      const land = [];
      let landReady = false;
      setTimeout(() => {
        if (!rings.length || landReady) return;
        const n = W > 0 && W < 620 ? Math.round(S.landSample * 0.6) : S.landSample;
        spherePoints(n, 0.5).forEach(p => {
          /* 这里拿到的是 {lat, lon}（弧度），不是单位向量，换算不能走 lonDeg/latDeg */
          let lon = (p.lon * 180) / Math.PI;
          if (lon > 180) lon -= 360;
          if (inLand(rings, lon, (p.lat * 180) / Math.PI)) land.push(vec(p.lat, p.lon));
        });
        landReady = true;
        if (!raf) draw();
      }, 60);

      /* 经纬线采样点 */
      const meridians = [], parallels = [];
      for (let m = 0; m < S.meridians; m++) {
        const lon = (m * TAU) / (S.meridians * 2);
        const line = [];
        for (let i = 0; i <= 56; i++) line.push(vec(-Math.PI / 2 + (i * Math.PI) / 56, lon));
        meridians.push(line);
      }
      for (let k = 1; k < S.parallels; k++) {
        const lat = -Math.PI / 2 + (k * Math.PI) / S.parallels;
        const line = [];
        for (let i = 0; i <= 84; i++) line.push(vec(lat, (i * TAU) / 84));
        parallels.push(line);
      }

      let spin = 0.2, raf = 0, last = 0, flow = 0, W = 0, H = 0, dpr = 1;

      function resize() {
        /* 用布局尺寸（offsetWidth），不受 #stage 整体缩放影响，位图才不会被拉花 */
        const r = host.getBoundingClientRect();
        W = Math.max(160, host.offsetWidth || r.width || 760);
        H = Math.max(160, host.offsetHeight || r.height || 760);
        dpr = Math.min(2, (window.devicePixelRatio || 1) * 1.4);
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
        cv.style.width = W + 'px';
        cv.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      function draw() {
        const cx = W * S.cx, cy = H * S.cy, R = Math.min(W, H) * S.R;
        const cs = Math.cos(spin), ss = Math.sin(spin);
        ctx.clearRect(0, 0, W, H);

        /* 单位向量 → 屏幕（先绕地轴自转 spin，再套固定姿态矩阵） */
        const px = v => {
          const x1 = v.x * cs + v.z * ss, z1 = -v.x * ss + v.z * cs;
          return {
            x: cx + R * (m11 * x1 + m12 * v.y + m13 * z1),
            y: cy + R * (m21 * x1 + m22 * v.y + m23 * z1),
            z: m32 * v.y + m33 * z1,
          };
        };

        /* 大气光晕 */
        const halo = ctx.createRadialGradient(cx, cy, R * 0.78, cx, cy, R * 1.24);
        halo.addColorStop(0, 'rgba(150,200,255,0)');
        halo.addColorStop(0.44, 'rgba(155,205,255,.14)');
        halo.addColorStop(1, 'rgba(150,200,255,0)');
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(cx, cy, R * 1.24, 0, TAU); ctx.fill();

        /* 球体底色：左上亮、右下沉 */
        const body = ctx.createRadialGradient(cx - R * 0.32, cy - R * 0.38, R * 0.08, cx, cy, R);
        body.addColorStop(0, 'rgba(255,255,255,.11)');
        body.addColorStop(0.55, 'rgba(255,255,255,.035)');
        body.addColorStop(1, 'rgba(8,22,88,.30)');
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();

        /* 经线：随自转从一侧转出、另一侧转入 */
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255,255,255,.15)';
        for (const line of meridians) {
          let open = false;
          ctx.beginPath();
          for (const v of line) {
            const q = px(v);
            if (q.z <= 0.02) { open = false; continue; }
            if (!open) { ctx.moveTo(q.x, q.y); open = true; } else ctx.lineTo(q.x, q.y);
          }
          ctx.stroke();
        }
        /* 纬线：形状不随自转变化，用来固定球的形态 */
        ctx.strokeStyle = 'rgba(255,255,255,.10)';
        for (const line of parallels) {
          let open = false;
          ctx.beginPath();
          for (const v of line) {
            const q = px(v);
            if (q.z <= 0.02) { open = false; continue; }
            if (!open) { ctx.moveTo(q.x, q.y); open = true; } else ctx.lineTo(q.x, q.y);
          }
          ctx.stroke();
        }

        /* 海面圆点先投影一遍，网格线与圆点共用这一份结果 */
        if (!seaProj || seaProj.length !== sea.length * 3) seaProj = new Float32Array(sea.length * 3);
        for (let i = 0; i < sea.length; i++) {
          const q = px(sea[i]);
          seaProj[3 * i] = q.x; seaProj[3 * i + 1] = q.y; seaProj[3 * i + 2] = q.z;
        }

        /* 网格：同方向的圆点连成一条连续细虚线；
           只画两端都在正面的段，按深度分五档淡出，虚线缓慢流动 */
        if (lines.length) {
          const paths = [], NB = S.meshAlpha.length;
          for (let b = 0; b < NB; b++) paths.push(new Path2D());
          for (const ln of lines) {
            let bucket = -1, path = null;
            for (let i = 0; i < ln.length - 1; i++) {
              const ia = ln[i] * 3, ib = ln[i + 1] * 3;
              const za = seaProj[ia + 2], zb = seaProj[ib + 2];
              if (za <= 0.04 || zb <= 0.04) { bucket = -1; path = null; continue; }
              const m = za < zb ? za : zb;
              const b = Math.min(NB - 1, Math.floor(m * NB));
              if (b !== bucket || !path) {        // 换档或刚起步：另起一段，保证虚线在线内连续
                bucket = b; path = paths[b];
                path.moveTo(seaProj[ia], seaProj[ia + 1]);
              }
              path.lineTo(seaProj[ib], seaProj[ib + 1]);
            }
          }
          ctx.strokeStyle = '#c8e6ff';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3.6]);
          ctx.lineDashOffset = -flow;
          for (let b = 0; b < NB; b++) {
            ctx.globalAlpha = S.meshAlpha[b];
            ctx.stroke(paths[b]);
          }
          ctx.globalAlpha = 1;
          ctx.setLineDash([]);
        }

        /* 海面：稀疏的淡点，同时也是网格的顶点 */
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < sea.length; i++) {
          const z = seaProj[3 * i + 2];
          if (z <= 0.02) continue;
          ctx.globalAlpha = S.seaAlpha * Math.pow(z, 0.8);
          ctx.beginPath(); ctx.arc(seaProj[3 * i], seaProj[3 * i + 1], S.seaR * (0.5 + 0.6 * z), 0, TAU); ctx.fill();
        }

        /* 陆地：更小更密的点，把大陆板块刻出来（内联投影 + fillRect，几万点也能稳 60fps） */
        if (landProj.length !== land.length * 3) landProj = new Float32Array(land.length * 3);
        ctx.fillStyle = '#eaf4ff';
        for (let i = 0; i < land.length; i++) {
          const v = land[i];
          const x1 = v.x * cs + v.z * ss, z1 = -v.x * ss + v.z * cs;
          const z = m32 * v.y + m33 * z1;
          if (z <= 0.02) continue;
          const X = cx + R * (m11 * x1 + m12 * v.y + m13 * z1);
          const Y = cy + R * (m21 * x1 + m22 * v.y + m23 * z1);
          landProj[3 * i] = X; landProj[3 * i + 1] = Y; landProj[3 * i + 2] = z;
          const lit = clamp(0.5 + 0.5 * (z * 0.62 - ((X - cx) / R) * 0.26 - ((Y - cy) / R) * 0.30), 0.38, 1);
          ctx.globalAlpha = S.landAlpha * Math.pow(z, 0.65) * (0.62 + 0.38 * lit);
          const r = S.landR * (0.55 + 0.55 * z);
          ctx.fillRect(X - r, Y - r, 2 * r, 2 * r);
        }
        ctx.globalAlpha = 1;

        /* 海岸线：同一份轮廓描边，板块边界一眼可辨（正面亮、边缘暗两档） */
        if (coast.length && S.coastA > 0) {
          const pa = new Path2D(), pb = new Path2D();
          for (const rp of coast) {
            let openA = false, openB = false;
            for (let i = 0; i < rp.length; i += 3) {
              const x = rp[i], y = rp[i + 1], zv = rp[i + 2];
              const x1 = x * cs + zv * ss, z1 = -x * ss + zv * cs;
              const z = m32 * y + m33 * z1;
              if (z <= 0.02) { openA = openB = false; continue; }
              const X = cx + R * (m11 * x1 + m12 * y + m13 * z1);
              const Y = cy + R * (m21 * x1 + m22 * y + m23 * z1);
              if (z > 0.45) {                       // 正面：亮档
                if (!openA) { pa.moveTo(X, Y); openA = true; openB = false; }
                pa.lineTo(X, Y);
              } else {                              // 边缘：暗档
                if (!openB) { pb.moveTo(X, Y); openB = true; openA = false; }
                pb.lineTo(X, Y);
              }
            }
          }
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#cfe6ff';
          ctx.globalAlpha = S.coastA; ctx.stroke(pa);
          ctx.globalAlpha = S.coastB; ctx.stroke(pb);
          ctx.globalAlpha = 1;
        }

        /* 球体轮廓 */
        ctx.strokeStyle = 'rgba(255,255,255,.14)';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      }

      function frame(ts) {
        raf = requestAnimationFrame(frame);
        if (!last) last = ts;
        const dt = Math.min(64, ts - last);
        last = ts;
        spin += S.speed * (dt / 16.7);
        if (spin > TAU) spin -= TAU;
        flow += S.flow * (dt / 1000);
        draw();
      }

      const reduce = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      function start() { if (raf || reduce()) return; last = 0; raf = requestAnimationFrame(frame); }
      function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

      resize();
      draw();                                        // 静态首帧：总览、打印、导出都有内容
      window.addEventListener('resize', resize);

      const ctrl = {
        activate() { resize(); draw(); start(); },
        stop() { stop(); },
        /* 手动推进 sec 秒（导出静帧与自动化验收用） */
        step(sec) { spin += S.speed * 60 * (sec || 1); flow += S.flow * (sec || 1); if (spin > TAU) spin -= TAU; draw(); },
        setSpin(x) { spin = x; draw(); },
        stats() { return { land: land.length, sea: sea.length, lines: lines.length, segs: segs }; },
      };
      host.__globe = ctrl;                           // 验收脚本用
      return ctrl;
    },
  };
})();
