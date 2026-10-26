/* 底图命中判定（海陆判定）——封面地球与校验脚本共用同一份逻辑
   单独成文件的原因：地图判定一旦在两处各写一遍，改了一处另一处就会悄悄漂移，
   校验通过的结论也就不可信了。globe.js 负责画，这里只负责回答"某点是不是陆地"。

   四类环的语义（见 land-data.js 头部）：
     LAND_RINGS   陆地外环 —— 命中即陆地
     LAND_HOLES   陆地内环（洞，如里海）—— 命中即非陆地
     LAKE_RINGS   湖面     —— 命中即非陆地
     LAKE_ISLANDS 湖中岛   —— 命中即陆地，压过湖面

   ────────────────────────────────────────────────────────────────
   判定算法：球面射线法（沿经线向北到北极）
   ────────────────────────────────────────────────────────────────
   为什么不用最直观的"经纬度平面射线法（向东到 +180）"：
     欧亚大陆这种环的经度横跨全球（楚科奇跨 ±180），数据里已整体展开到 [180,540]
     这类连续区间。向东的射线只朝一个方向，走不到"绕回"的那一段——实测把西伯利亚
     北部 66–68°N 整片判成了海。
     试过"逐顶点取相对待判经度的最近表示"：环的展开跨度恰好是 360°，映射会把首尾
     折到同一点，环被折叠，太平洋中部反而判成陆地。都不成立。

   这里改用沿经线向北的射线：
     · 从待判点沿其经线向北走到北极，统计与环的边的交点数，奇数即在环内。
       （北极不在任何陆地环内，等价于平面射线法里的"无穷远"。）
     · 边是否跨过这条经线，用经度差的符号判断，并配合 wrap() 归一到 [-180,180)，
       跨日界线的边因此天然正确，完全不需要重映射顶点、也不会撕裂多边形。
     · 边在数据中都很短（|Δlon| << 180），所以"跨越"的判定没有歧义。

   性能：按 1° 经度分槽建边索引，一次判点只扫描跨过该经线的那批边（约两百条），
        两万个采样点实测几十毫秒。

   另一处必须单独处理的：南极极冠。数据源在约 -85.2° 把南极洲水平截断（多数投影
   的裁剪线），射线法在该纬度以南恒判为海，但那里是南极大陆内陆，由 LAND_ANTARCTIC
   补回陆地。 */
(function () {
  /* 南极闭合纬度（由 gen_land_data.js 写入，null 表示数据未截断） */
  const ANT = typeof window.LAND_ANTARCTIC === 'number' ? window.LAND_ANTARCTIC : null;
  /* 经度差归一到 [-180,180) */
  const wrap = d => ((d % 360) + 540) % 360 - 180;
  const NLON = 360;                       // 经度槽：1° 一格
  const slot = x => (((Math.floor(x) % 360) + 360) % 360);

  function build(src) {
    const rings = (src || []).map(f => {
      let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
      for (let i = 0; i < f.length; i += 2) {
        const x = f[i], y = f[i + 1];
        if (x < minx) minx = x; if (x > maxx) maxx = x;
        if (y < miny) miny = y; if (y > maxy) maxy = y;
      }
      return { f, minx, maxx, miny, maxy, n: f.length >> 1 };
    });

    /* 经度槽索引：每条边登记到它跨过的所有整经度槽。
       存的是打包后的 (环号 << 20 | 边号)，避免为每条边建对象。 */
    const idx = [];
    for (let s = 0; s < NLON; s++) idx.push([]);
    rings.forEach((r, ri) => {
      const f = r.f, n = r.n;
      if (n < 3) return;
      for (let i = 0; i < n; i++) {
        const j = i + 1 === n ? 0 : i + 1;
        const x1 = f[2 * i], x2 = f[2 * j];
        const dx = wrap(x2 - x1);
        const packed = (ri << 20) | i;
        /* 边的两个端点所在的整经度槽都要登记：绝大多数边短于 1°，
           若写成 ceil→floor 的循环，这种边一格都不会登记，会被整条漏掉。 */
        const a = Math.floor(Math.min(x1, x1 + dx)), b = Math.floor(Math.max(x1, x1 + dx));
        for (let x = a; x <= b; x++) idx[slot(x)].push(packed);
      }
    });
    for (let s = 0; s < NLON; s++) idx[s] = Int32Array.from(idx[s]);
    return { rings, idx };
  }

  /* 点是否落在这一组环的任意一个里（球面射线：沿经线向北到北极） */
  function inRings(g, lon, lat) {
    const list = g.idx[slot(lon)];
    if (!list.length) return false;
    let ri = -1, cnt = 0, hit = false;
    /* 边按环号分组统计：奇偶性必须按环独立算，跨环相加没有意义。
       索引里的边是按 (环,边) 顺序压进去的，同一环的边天然相邻，顺序扫一遍即可。 */
    for (let k = 0; k < list.length; k++) {
      const packed = list[k];
      const r = packed >> 20, i = packed & 0xFFFFF;
      if (r !== ri) {
        if (ri >= 0 && (cnt & 1)) return true;
        ri = r; cnt = 0;
      }
      const ring = g.rings[r], f = ring.f, n = ring.n;
      const j = i + 1 === n ? 0 : i + 1;
      const x1 = f[2 * i], y1 = f[2 * i + 1], x2 = f[2 * j], y2 = f[2 * j + 1];
      /* 半开区间：边是否跨过射线经线，用两端相对射线的经度差符号判断。
         必须严格半开（d1>0 与 d2>0 异号），否则顶点恰好落在射线上时会被前后两条边
         各算一次，凭空多出一个交点——实测会让南印度洋整片判成陆地。 */
      const d1 = wrap(x1 - lon), d2 = wrap(x2 - lon);
      if ((d1 > 0) === (d2 > 0)) continue;
      const den = d1 - d2;
      if (den === 0) continue;
      const yc = y1 + (d1 / den) * (y2 - y1);
      if (yc > lat) cnt++;
    }
    if (ri >= 0 && (cnt & 1)) hit = true;
    return hit;
  }

  let I = null;
  function ensure() {
    if (!I) {
      I = {
        land: build(window.LAND_RINGS),
        hole: build(window.LAND_HOLES),
        lake: build(window.LAKE_RINGS),
        isle: build(window.LAKE_ISLANDS),
      };
    }
    return I;
  }

  window.LandHit = {
    inRings, ensure,
    /* 四组环，供渲染层烘焙岸线用 */
    groups() { return ensure(); },
    isLand(lon, lat) {
      const g = ensure();
      /* 南极极冠：数据源在 LAND_ANTARCTIC 处把南极洲水平截断，该纬度以南是南极大陆内陆 */
      const onLand = (ANT !== null && lat <= ANT) || (g.land.rings.length && inRings(g.land, lon, lat));
      if (!onLand) return false;
      if (g.hole.rings.length && inRings(g.hole, lon, lat)) return false;
      if (g.lake.rings.length && inRings(g.lake, lon, lat) && !inRings(g.isle, lon, lat)) return false;
      return true;
    },
    counts() {
      const g = ensure();
      const n = i => i.rings.reduce((s, r) => s + r.n, 0);
      return {
        land: g.land.rings.length, landVerts: n(g.land),
        hole: g.hole.rings.length, holeVerts: n(g.hole),
        lake: g.lake.rings.length, lakeVerts: n(g.lake),
        isle: g.isle.rings.length, isleVerts: n(g.isle),
      };
    },
  };
})();
