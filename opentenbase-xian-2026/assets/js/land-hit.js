/* 底图命中判定（海陆判定）——封面地球与校验脚本共用同一份逻辑
   单独成文件的原因：地图判定一旦在两处各写一遍，改了一处另一处就会悄悄漂移，
   校验通过的结论也就不可信了。globe.js 负责画，这里只负责回答“某点是不是陆地”。

   四类环的语义（见 land-data.js 头部）：
     LAND_RINGS   陆地外环 —— 命中即陆地
     LAND_HOLES   陆地内环（洞，如里海）—— 命中即非陆地
     LAKE_RINGS   湖面     —— 命中即非陆地
     LAKE_ISLANDS 湖中岛   —— 命中即陆地，压过湖面

   两个必须处理的坑：
     1) 跨 ±180° 日界线：楚科奇、北地群岛这类环的经度同时含 -180 与 +179.9，
        直接做平面射线法会横跨全球，实测会把 71°N 整条纬线判成陆地。
        数据在生成时已整体平移到连续区间（表现为 maxx>180），这里判点时要
        把待判经度也挪 ±360° 再试一次。
     2) 判点性能：升级到 1:10m 底图后陆地有 5 万多个顶点，其中欧亚大陆一个环
        就占两万多。只按环做纬度分带仍然要整环扫一遍边，采样两万个点实测要
        750ms，首页会明显卡顿。改为把**边**按 1° 纬度带登记：一次判点只看
        那些真正跨越该纬度的边，实测降到几十毫秒。

   索引结构（每组一份）：
     bandR[b]  第 b 个纬度带里出现的环下标
     bandE[b]  与 bandR[b] 一一对应，存该环落在这一带内的边下标
   完整性说明：射线法只需要“跨越待判纬度”的边；边一旦跨越该纬度，其两端点的
   纬度区间必然覆盖该纬度所在的带，因此一定被登记进这一带，不会漏边。 */
(function () {
  const BAND = 1, NBAND = 180 / BAND;

  function build(src) {
    const rings = (src || []).map(f => {
      let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
      for (let i = 0; i < f.length; i += 2) {
        const x = f[i], y = f[i + 1];
        if (x < minx) minx = x; if (x > maxx) maxx = x;
        if (y < miny) miny = y; if (y > maxy) maxy = y;
      }
      return { f, minx, maxx, miny, maxy, n: f.length >> 1, shifted: maxx > 180 };
    });

    const bandR = [], bandE = [];
    for (let b = 0; b < NBAND; b++) { bandR.push([]); bandE.push([]); }

    rings.forEach((r, ri) => {
      const f = r.f, n = r.n;
      if (n < 3) return;
      const byBand = new Map();
      for (let e = 0; e < n; e++) {
        const j = e + 1 === n ? 0 : e + 1;
        const y0 = f[2 * e + 1], y1 = f[2 * j + 1];
        let b0 = Math.floor((Math.min(y0, y1) + 90) / BAND);
        let b1 = Math.floor((Math.max(y0, y1) + 90) / BAND);
        if (b0 < 0) b0 = 0; if (b1 > NBAND - 1) b1 = NBAND - 1;
        for (let b = b0; b <= b1; b++) {
          let a = byBand.get(b);
          if (!a) { a = []; byBand.set(b, a); }
          a.push(e);
        }
      }
      byBand.forEach((edges, b) => {
        bandR[b].push(ri);
        bandE[b].push(Int32Array.from(edges));
      });
    });

    for (let b = 0; b < NBAND; b++) bandR[b] = Int32Array.from(bandR[b]);
    return { rings, bandR, bandE };
  }

  function inRings(g, lon, lat) {
    const k = Math.floor((lat + 90) / BAND);
    if (k < 0 || k >= NBAND) return false;
    const rs = g.bandR[k], es = g.bandE[k];
    for (let m = 0; m < rs.length; m++) {
      const r = g.rings[rs[m]];
      if (lat < r.miny || lat > r.maxy) continue;
      /* 跨日界线的环：待判经度要挪到环所在的那个连续区间再试 */
      let lx = lon;
      if (lx < r.minx || lx > r.maxx) {
        if (!r.shifted) continue;
        const a = lon + 360, c = lon - 360;
        if (a >= r.minx && a <= r.maxx) lx = a;
        else if (c >= r.minx && c <= r.maxx) lx = c;
        else continue;
      }
      const f = r.f, n = r.n, E = es[m];
      let inside = false;
      for (let t = 0; t < E.length; t++) {
        const i = E[t], j = i + 1 === n ? 0 : i + 1;
        const yi = f[2 * i + 1], yj = f[2 * j + 1];
        if ((yi > lat) === (yj > lat)) continue;         // 该边不跨越待判纬度
        const xi = f[2 * i], xj = f[2 * j];
        if (lx < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) return true;
    }
    return false;
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
      if (!g.land.rings.length || !inRings(g.land, lon, lat)) return false;
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
