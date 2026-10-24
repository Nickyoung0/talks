/* 目录页入场动画：PostgreSQL 大象背着行囊从远处走来，行囊里的工具就是扩展。
 *
 * 造型：写实派渲染 —— 暖灰象皮三段明暗 + 皮肤皱褶/趾甲/鼻环/耳脉等解剖细节，
 *       单一主光源（左上方）+ 腹部与腿根 AO 环境遮蔽。
 * 3D：象身拆成 9 个图层，每层不同 translateZ；躯干与象头各带一片"厚度侧片"
 *       （暗色副本，Z 更靠后），转身时能看出体积而不是纸片。相机叠加
 *       dolly(-1500→0) + rotateY(26°→0) + rotateX(8°→0)，配雾与对焦做大气透视。
 * 工具从背囊口沿 Z 轴朝观众弹出（不是平面上放大）。
 *
 * 工具清单由 tools/content/content_elephant.py 提供，换讲稿只改数据。
 */
(function () {
  'use strict';

  /* 工具图标：24×24 线条风格，stroke 用 currentColor */
  const ICONS = {
    vector: '<path d="M4 5h4M4 5v4M16 5h4M16 5v4M4 19h4M4 19v-4M16 19h4M16 19v-4"/><circle cx="12" cy="12" r="3.2"/>',
    geo: '<path d="M12 21s6.5-5.6 6.5-10.2A6.5 6.5 0 0 0 5.5 10.8C5.5 15.4 12 21 12 21z"/><circle cx="12" cy="10.6" r="2.4"/>',
    time: '<circle cx="12" cy="12" r="8"/><path d="M12 7.4V12l3.4 2.2"/>',
    fdw: '<rect x="2.6" y="8" width="6" height="8" rx="1.6"/><rect x="15.4" y="8" width="6" height="8" rx="1.6"/><path d="M8.6 12h6.8M12 6.4v1.6M12 16v1.6"/>',
    stat: '<path d="M4 20V4"/><path d="M4 20h16"/><rect x="7.6" y="12" width="3" height="5" rx="1"/><rect x="13" y="8.6" width="3" height="8.4" rx="1"/>',
  };

  const DEFS = `
<svg class="ele-defs" aria-hidden="true"><defs>
  <linearGradient id="gBody" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#4184ae"/><stop offset=".38" stop-color="#346993"/>
    <stop offset=".72" stop-color="#285882"/><stop offset="1" stop-color="#1d476e"/>
  </linearGradient>
  <linearGradient id="gHead" x1="0" y1="0" x2=".3" y2="1">
    <stop offset="0" stop-color="#478db6"/><stop offset=".5" stop-color="#356b95"/>
    <stop offset="1" stop-color="#26537d"/>
  </linearGradient>
  <linearGradient id="gEar" x1=".1" y1="0" x2=".8" y2="1">
    <stop offset="0" stop-color="#3c7ba5"/><stop offset=".6" stop-color="#2e608b"/>
    <stop offset="1" stop-color="#234f78"/>
  </linearGradient>
  <linearGradient id="gEarIn" x1="0" y1="0" x2=".6" y2="1">
    <stop offset="0" stop-color="#366e98"/><stop offset="1" stop-color="#285781"/>
  </linearGradient>
  <linearGradient id="gTrunk" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#39749e"/><stop offset=".45" stop-color="#2f618b"/>
    <stop offset="1" stop-color="#204c74"/>
  </linearGradient>
  <linearGradient id="gLegF" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#3b79a3"/><stop offset=".42" stop-color="#30628c"/>
    <stop offset=".78" stop-color="#25537d"/><stop offset="1" stop-color="#1c446b"/>
  </linearGradient>
  <linearGradient id="gLegB" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#2a5984"/><stop offset="1" stop-color="#1a3f64"/>
  </linearGradient>
  <linearGradient id="gTusk" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fbf6ea"/><stop offset=".6" stop-color="#e6dece"/><stop offset="1" stop-color="#c3b9a5"/>
  </linearGradient>
  <linearGradient id="gBlanket" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#134f92"/><stop offset="1" stop-color="#0a2c53"/>
  </linearGradient>
  <linearGradient id="gBag" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#cfa36a"/><stop offset=".55" stop-color="#a87f4c"/><stop offset="1" stop-color="#7d5c33"/>
  </linearGradient>
  <radialGradient id="aoSoft" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#163659" stop-opacity=".5"/><stop offset="1" stop-color="#163659" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="hiSoft" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#81bdd9" stop-opacity=".42"/><stop offset="1" stop-color="#81bdd9" stop-opacity="0"/>
  </radialGradient>
</defs></svg>`;

  const VB = 'viewBox="0 0 560 440"';
  const layer = (cls, inner) => `<div class="ele-layer ${cls}"><svg ${VB} aria-hidden="true">${inner}</svg></div>`;

  /* 躯干轮廓（非洲象：肩高臀低、腹部下垂） */
  const BODY_PATH = 'M244 252C232 216 246 180 286 162C326 144 392 146 430 170C466 192 486 226 482 262C478 296 454 314 416 316C372 318 322 312 292 300C266 290 250 274 244 252Z';
  /* 躯干厚度侧片：同一轮廓向后下偏移的暗色副本 */
  const bodyBackSVG = `<g transform="translate(11,9)"><path d="${BODY_PATH}" fill="#1b4268"/>
    <path d="${BODY_PATH}" fill="#163659" opacity=".45"/></g>`;

  const bodySVG = `
  <path d="${BODY_PATH}" fill="url(#gBody)"/>
  <ellipse cx="330" cy="186" rx="112" ry="34" fill="url(#hiSoft)"/>
  <ellipse cx="372" cy="298" rx="96" ry="26" fill="url(#aoSoft)"/>
  <ellipse cx="262" cy="266" rx="40" ry="46" fill="url(#aoSoft)"/>
  <ellipse cx="470" cy="252" rx="34" ry="52" fill="url(#aoSoft)"/>
  <path d="M286 162C326 144 392 146 430 170C466 192 486 226 482 262C472 214 430 176 372 166C336 160 302 160 286 162Z" fill="#4c94bd" opacity=".28"/>
  <g stroke="#1d456d" stroke-width="2.6" fill="none" opacity=".4" stroke-linecap="round">
    <path d="M266 174c-12 32-10 66 2 94"/>
    <path d="M300 166c-12 34-10 70 2 98"/>
    <path d="M338 164c-12 34-10 70 2 98"/>
    <path d="M376 168c-12 34-10 68 2 96"/>
    <path d="M414 178c-12 32-10 64 2 90"/>
    <path d="M450 194c-10 28-8 56 2 78"/>
  </g>
  <g stroke="#5ba2c6" stroke-width="2.2" fill="none" opacity=".3" stroke-linecap="round">
    <path d="M274 174c-12 32-10 66 2 94"/>
    <path d="M308 166c-12 34-10 70 2 98"/>
    <path d="M346 164c-12 34-10 70 2 98"/>
    <path d="M384 168c-12 34-10 68 2 96"/>
    <path d="M422 178c-12 32-10 64 2 90"/>
  </g>
  <g fill="#1c446b" opacity=".13">
    <ellipse cx="316" cy="214" rx="7" ry="5"/><ellipse cx="356" cy="240" rx="5" ry="4"/>
    <ellipse cx="398" cy="206" rx="6" ry="4.5"/><ellipse cx="432" cy="238" rx="5" ry="4"/>
    <ellipse cx="288" cy="252" rx="5" ry="4"/><ellipse cx="452" cy="212" rx="4.5" ry="3.5"/>
  </g>`;

  /* 一条腿：x 起点、宽度、脚趾数量、明暗 */
  function leg(x, w, nails, near) {
    const g = near ? 'url(#gLegF)' : 'url(#gLegB)';
    const footY = 356, footH = 34, footX = x - 8, footW = w + 20;
    const nailEls = [];
    for (let i = 0; i < nails; i++) {
      const nx = footX + 12 + i * ((footW - 22) / Math.max(1, nails - 1));
      const ny = 374 + (i === 0 || i === nails - 1 ? -2 : 2);
      nailEls.push(`<ellipse cx="${nx.toFixed(0)}" cy="${ny}" rx="${(near ? 7 : 6).toFixed(0)}" ry="5" fill="${near ? '#e8e0d0' : '#c3bcae'}" transform="rotate(${i === 0 ? -14 : i === nails - 1 ? 14 : 0} ${nx.toFixed(0)} ${ny})"/>`);
    }
    return `
  <path d="M${x} 272h${w}c5 36 5 66 0 92-2 14-9 21-19 21h-${w - 38}c-10 0-17-7-19-21-5-26-5-56 0-92z" fill="${g}"/>
  <path d="M${x + 2} 274h${w - 4}c4 34 4 62 0 86" fill="none" stroke="${near ? '#529ac1' : '#326690'}" stroke-width="3" opacity="${near ? '.4' : '.25'}"/>
  <g stroke="#1b4268" stroke-width="2.4" fill="none" opacity=".38" stroke-linecap="round">
    <path d="M${x - 1} 306c${w * .55} 7 ${w * .85} 5 ${w + 2} -3"/>
    <path d="M${x - 1} 330c${w * .55} 7 ${w * .85} 5 ${w + 2} -3"/>
  </g>
  <rect x="${footX}" y="${footY}" width="${footW}" height="${footH}" rx="15" fill="${near ? '#2f618c' : '#204b74'}"/>
  <rect x="${footX}" y="${footY}" width="${footW}" height="${footH}" rx="15" fill="none" stroke="#1a3f64" stroke-width="2" opacity=".45"/>
  <ellipse cx="${footX + footW / 2}" cy="${footY + 4}" rx="${footW / 2 - 6}" ry="7" fill="url(#aoSoft)"/>
  ${nailEls.join('')}`;
  }

  const farLegsSVG = `<g class="ele-leg">${leg(298, 58, 3, false)}</g><g class="ele-leg">${leg(420, 58, 3, false)}</g>`;
  const nearLegsSVG = `<g class="ele-leg">${leg(250, 62, 4, true)}</g><g class="ele-leg">${leg(374, 62, 3, true)}</g>`;

  /* 尾巴 */
  const tailSVG = `
  <g class="ele-tail">
    <path d="M470 226c14 26 20 62 16 96" fill="none" stroke="#26557f" stroke-width="9" stroke-linecap="round"/>
    <path d="M486 320c1 12-1 22-6 30" fill="none" stroke="#1f4972" stroke-width="7" stroke-linecap="round"/>
    <g stroke="#193c61" stroke-width="5" stroke-linecap="round" fill="none">
      <path d="M480 348l-7 22"/><path d="M480 348l-1 24"/><path d="M480 348l6 22"/><path d="M480 348l12 18"/><path d="M480 348l-13 17"/>
    </g>
  </g>`;

  /* 象背毯 + 行囊（工具从此层弹出；整体左移补偿 Z 投影偏移，驮在背中前部） */
  const gearSVG = `<g transform="translate(-16,-6)">
  <path d="M268 204c-2-10 8-18 22-21 44-9 96-6 132 9 13 5 17 13 11 22-8 15-24 26-46 33-32 11-74 12-108 2-16-6-11-27-11-45z" fill="url(#gBlanket)"/>
  <path d="M256 250c36 14 80 11 118-2 23-8 40-19 48-30-8 18-26 30-48 38-38 14-82 11-114-1z" fill="#d9a03a"/>
  <g stroke="#d9a03a" stroke-width="3" opacity=".85" stroke-linecap="round">
    <path d="M286 258v16"/><path d="M308 266v17"/><path d="M330 270v17"/><path d="M352 269v17"/><path d="M374 264v17"/><path d="M396 256v16"/>
  </g>
  <path d="M290 220c-12 44-11 78 1 100" fill="none" stroke="#6f5330" stroke-width="11" stroke-linecap="round"/>
  <path d="M414 214c10 42 10 76-1 98" fill="none" stroke="#6f5330" stroke-width="11" stroke-linecap="round"/>
  <rect x="300" y="148" width="122" height="98" rx="18" fill="url(#gBag)"/>
  <rect x="300" y="148" width="122" height="98" rx="18" fill="none" stroke="#6f5330" stroke-width="2.5"/>
  <g stroke="#f0dcb4" stroke-width="1.6" stroke-dasharray="5 5" opacity=".65">
    <path d="M310 160h102"/><path d="M310 234h102"/>
  </g>
  <rect x="314" y="182" width="94" height="34" rx="10" fill="#b98c56"/>
  <rect x="314" y="182" width="94" height="34" rx="10" fill="none" stroke="#7d5c33" stroke-width="2"/>
  <circle cx="361" cy="199" r="8" fill="#5e4426"/>
  <circle cx="361" cy="199" r="3.4" fill="#c9a15f"/>
  <g class="ele-bag-lid">
    <rect x="292" y="126" width="138" height="30" rx="12" fill="#c1914f"/>
    <rect x="292" y="126" width="138" height="30" rx="12" fill="none" stroke="#7d5c33" stroke-width="2.5"/>
    <rect x="336" y="134" width="50" height="11" rx="5" fill="#6f5330" opacity=".5"/>
  </g></g>`;

  /* 象头厚度侧片 */
  const headBackSVG = `<g transform="translate(13,10)">
    <ellipse cx="176" cy="206" rx="76" ry="80" fill="#1d456c"/>
    <path d="M238 160c44-24 96-12 116 26 18 34 0 76-34 92-30 12-60 6-74-14-8-12-10-40-8-62z" fill="#1b4268"/>
  </g>`;

  const headSVG = `
  <g class="ele-head">
    <g class="ele-ear ele-ear-far"><g transform="translate(-10,-14)">
      <path d="M232 168c34-26 78-22 100 10 20 30 12 70-18 90-24 16-52 12-66-8-10-14-14-40-14-58 0-12 2-24 6-34z" fill="#25537d"/>
    </g></g>
    <path d="M108 214C104 172 128 142 162 134C198 125 228 140 242 168C254 192 250 228 238 254C224 282 196 298 166 296C138 294 116 274 110 250C107 238 107 226 108 214Z" fill="url(#gHead)"/>
    <path d="M108 214C104 172 128 142 162 134c22-6 40 0 52 14-30-4-58 2-74 16-22 20-30 52-26 84-28-6-42-30-6-34z" fill="#569dc3" opacity=".35"/>
    <ellipse cx="196" cy="268" rx="56" ry="30" fill="url(#aoSoft)"/>
    <g stroke="#1d476e" stroke-width="2.6" fill="none" opacity=".38" stroke-linecap="round">
      <path d="M132 186c-8 20-10 44-6 66"/>
      <path d="M186 172c-10 20-14 46-10 70"/>
      <path d="M222 200c-8 18-12 40-10 60"/>
    </g>
    <path d="M138 258c-6 16-6 30 0 44" fill="none" stroke="#204b74" stroke-width="3" opacity=".35"/>
    <circle cx="156" cy="214" r="8" fill="#211d19"/>
    <circle cx="153.5" cy="211.5" r="2.6" fill="#fff" opacity=".9"/>
    <path d="M146 205c6-6 16-7 22-2" fill="none" stroke="#1d476e" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M146 224c6 5 15 6 22 2" fill="none" stroke="#1d476e" stroke-width="2.6" stroke-linecap="round" opacity=".7"/>
    <g stroke="#183a5e" stroke-width="2" stroke-linecap="round" fill="none" opacity=".8">
      <path d="M144 200l-6-6"/><path d="M152 197l-3-7"/><path d="M162 198l2-7"/>
    </g>
    <path d="M126 246c-8 4-14 10-17 18" fill="none" stroke="#204b74" stroke-width="2.4" opacity=".3" stroke-linecap="round"/>
    <g class="ele-ear ele-ear-near">
      <path d="M236 158c40-24 92-18 114 20 20 34 8 80-28 98-30 14-64 8-78-14-10-16-12-48-8-70 2-12 0-24 0-34z" fill="url(#gEar)"/>
      <path d="M240 158c40-24 92-18 114 20 8 14 10 30 8 44-24-30-62-42-98-38-10 1-18-6-24-26z" fill="#458ab4" opacity=".35"/>
      <path d="M254 178c30-14 66-8 82 18 12 20 2 48-22 62-18 10-40 6-50-8-8-10-10-36-8-52 1-8 0-14-2-20z" fill="url(#gEarIn)" opacity=".75"/>
      <g stroke="#24517b" stroke-width="2.2" fill="none" opacity=".5" stroke-linecap="round">
        <path d="M264 188c22 8 38 24 46 46"/>
        <path d="M258 212c18 8 32 26 40 48"/>
        <path d="M276 176c14 4 26 12 34 24"/>
        <path d="M266 240c14 10 24 24 30 38"/>
      </g>
      <path d="M236 158c40-24 92-18 114 20" fill="none" stroke="#204b74" stroke-width="3.5" opacity=".45"/>
    </g>
  </g>`;

  /* 象鼻：独立最前层，摆动幅度最大；象牙画在鼻段之前，内侧被鼻身遮挡 */
  const trunkSVG = `
  <g class="ele-trunk">
    <path d="M184 296c-6 22-14 38-28 48" fill="none" stroke="url(#gTusk)" stroke-width="14" stroke-linecap="round"/>
    <path d="M142 282c-8 20-16 34-28 44" fill="none" stroke="url(#gTusk)" stroke-width="11" stroke-linecap="round" opacity=".92"/>
    <path d="M150 254C134 288 128 322 130 352" fill="none" stroke="url(#gTrunk)" stroke-width="42" stroke-linecap="round"/>
    <path d="M130 352c1 22-6 38-18 44" fill="none" stroke="#2f618b" stroke-width="32" stroke-linecap="round"/>
    <path d="M112 396c-10 2-16-6-12-14" fill="none" stroke="#2b5c87" stroke-width="22" stroke-linecap="round"/>
    <path d="M100 382c-2 10 4 16 12 14" fill="none" stroke="#275680" stroke-width="12" stroke-linecap="round"/>
    <g stroke="#1c446b" stroke-width="3" fill="none" opacity=".42" stroke-linecap="round">
      <path d="M124 278c12 7 26 7 36 0"/>
      <path d="M118 304c12 7 26 7 36 0"/>
      <path d="M116 330c12 7 26 7 36 0"/>
      <path d="M118 356c10 7 24 8 32 2"/>
      <path d="M112 380c8 6 20 7 28 3"/>
    </g>
    <path d="M138 262c-8 30-12 60-10 88" fill="none" stroke="#569dc3" stroke-width="5" opacity=".18" stroke-linecap="round"/>
  </g>`;

  function render(tools) {
    const list = (tools || []).map((t, i) => `
      <div class="ele-tool" style="--tx:${t.tx}px;--ty:${t.ty}px;--c:${t.color};--i:${i}">
        <div class="ele-tool-in">
          <span class="ele-tool-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[t.icon] || ICONS.stat}</svg></span>
          <span class="ele-tool-name">${t.name}</span>
        </div>
      </div>`).join('');

    /* 背囊层内嵌工具容器：与行囊同一 Z 平面，弹出时再各自 translateZ 朝观众 */
    const gearLayer = `<div class="ele-layer ele-l-gear"><svg ${VB} aria-hidden="true">${gearSVG}</svg>
      <div class="ele-tools">${list}</div></div>`;

    return `<div class="ele-stage" aria-hidden="true">
      ${DEFS}
      <div class="ele-horizon"></div>
      <div class="ele-ground ele-g-far"></div>
      <div class="ele-ground ele-g-mid"></div>
      <div class="ele-shadow ele-sh-soft"></div>
      <div class="ele-shadow ele-sh-hard"></div>
      <div class="ele-camera">
        <div class="ele-bob">
          <div class="ele-rig">
            ${layer('ele-l-tail', tailSVG)}
            ${layer('ele-l-far', farLegsSVG)}
            ${layer('ele-l-bodyback', bodyBackSVG)}
            ${layer('ele-l-body', bodySVG)}
            ${layer('ele-l-near', nearLegsSVG)}
            ${gearLayer}
            ${layer('ele-l-headback', headBackSVG)}
            ${layer('ele-l-head', headSVG)}
            ${layer('ele-l-trunk', trunkSVG)}
          </div>
        </div>
      </div>
      <div class="ele-fog"></div>
      <div class="ele-dust"><i></i><i></i><i></i></div>
      <div class="ele-ground ele-g-near"></div>
    </div>`;
  }

  window.ElephantWalk = { render: render };
})();
