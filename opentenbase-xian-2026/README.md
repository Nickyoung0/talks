# OpenTenBase 城市行 · 西安站 —— 网页演示工程

一个零依赖、可移植的动态 PPT：把备课材料编译成分页幻灯片，支持键盘翻页、分步揭示、SVG 逻辑图动画、**互动主板可视化（把 PostgreSQL 内核画成一台可拆装的电脑）**、总览网格、演讲者视图（讲稿 + 计时器）、黑屏、深链跳页和打印导出 PDF。

## 快速使用

1. **直接双击打开 `index.html`**（`file://` 即可，无需服务器）；
2. 或在本目录运行 `python3 -m http.server 8080`，访问 http://localhost:8080；
3. 按 `H` 查看全部快捷键；按 `N` 打开演讲者视图；按 `O` 打开总览。

## 互动机器页（第 02 章）

把扩展机制画成一台插画风格的电脑主板（浅底网格场景、橄榄绿哑光 PCB、黑色芯片白丝印、金色接插件、细描边柔和投影；六块扩展卡各带主题色铭牌）：主板 = 内核骨架，插槽 = 扩展接口，板卡 = 扩展模块（.so），开机时序 = 代码加载时机，设备清单 = 系统目录。纯 CSS 3D + 原生 JS，无任何外部依赖。

- **整机结构**（章首）：点击任意部件（24PIN 电源 / 固件+CMOS 电池 / 芯片组 / 处理器散热 / 四条内存 / SSD / 扩展槽区 / 机箱风扇 / 后置 USB），右侧显示"硬件里是什么 / 数据库里对应什么 / 关键点"；底部可在等距 / 正视 / 俯视三种视角间切换。
- **六条插槽两条总线**：PRELOAD 总线（橙，开机前必须插好）——`pg_stat_statements`、`auto_explain`、`TimescaleDB`（自带后台进程）；ON-DEMAND 总线（青，开机后热插）——`pgvector`、`PostGIS`；外加一条留给现场 DIY `hello_pg` 的空槽。每块卡顶铭牌标注名称与加载方式。
- **开机时序**（preload 时机之后）：进入页面时机器断电，按 `→` 逐步播放八步开机时序（断电 → 通电 → 定内存 → 开机插卡 → 自带进程 → 热插拔 → 登记 → 运行），板卡有插入动画；也可直接点击右侧步骤跳转；走完最后一步再按 `→` 才翻页。
- 文案在 `tools/content/content_machine.py` 中维护（部件与步骤都是数据），布局与交互在 `assets/js/machine.js` + `assets/css/machine.css`。

## 目录页大象入场（第 2 页）

封面翻页后，一头**分层 CSS 3D 的大象**背着行囊从远处走来：象身拆成尾巴 / 远侧腿 / 躯干 / 近侧腿 / 背囊 / 象头六个图层，每层不同 `translateZ`，走近时按透视产生真实视差，相机叠加 dolly + 转身，站定后持续左右微摆保持立体感；行囊开盖后五个扩展（pgvector / PostGIS / TimescaleDB / FDW / pg_stat_statements）沿 Z 轴朝观众弹出漂浮，随后整体淡出、目录卡片淡入。演讲者提前按 `→` 可立即收尾（`.rush`）。样式在 `assets/css/elephant.css`，图形在 `assets/js/elephant.js`，工具数据在 `tools/content/content_elephant.py`。

## 快捷键

| 按键 | 作用 |
|---|---|
| `→` / `空格` / `PgDn` | 下一步（先逐条揭示要点，再翻页） |
| `←` / `PgUp` | 上一页（回看时显示全部要点） |
| `数字` + `回车` | 跳转到指定页 |
| `O` | 总览网格 |
| `N` | 演讲者视图（讲稿 + 技术展开 + 计时器） |
| `F` | 全屏 |
| `B` | 黑屏 |
| `Ctrl/Cmd + P` | 打印 / 导出 PDF（每页一张，1280×720） |

## 目录结构

```
index.html                 入口页（加载引擎与数据）
assets/css/deck.css        演示样式（1280×720 舞台 + 动画 + 打印）
assets/css/machine.css     互动机器页样式（CSS 3D 主板 / 板卡 / 面板）
assets/css/elephant.css    目录页大象入场动画样式（分层 CSS 3D 视差）
assets/js/deck.js          演示引擎（原生 JS，无外部依赖）
assets/js/machine.js       互动机器组件（主板渲染、部件点击、开机时序）
assets/js/elephant.js      目录页入场动画（大象背行囊走来，工具=扩展）
assets/js/slides-data.js   由 tools/build_slides_data.py 生成的页面数据
assets/img/                模版提取的 Logo 与两张内容配图
assets/files/hello_pg.zip  现场实践源码包（页内可下载）
tools/build_slides_data.py 数据生成器（顶部 EVENT 为可编辑活动信息）
tools/content/             备课内容源模块（生成器的输入）
tools/check_deck.cjs       Playwright 自动化验收脚本（可选）：逐条打印 26 项断言
                           `cd tools && node check_deck.cjs`
tools/shot_machine.cjs     机器页截图脚本（开发用，可选）
```

## 修改与再生成

- **改活动信息**（站名 / 日期 / 地点 / 讲者）：编辑 `tools/build_slides_data.py` 顶部的 `EVENT`，然后运行：

  ```bash
  cd tools && python3 build_slides_data.py
  ```

- **改某页内容**：编辑 `tools/content/` 对应模块后重新生成。
- **章节结构**：4 章 —— 01 为什么从扩展出发 / 02 扩展如何进入执行流程（pgvector、auto_explain、pg_stat_statements 三个扩展对照 + 机制地图）/ 03 DIY 第一个扩展 / 04 回到设计哲学；pgvector 的深入拆解保留在源模块 `content_vector.py` 与详细备课材料中备查。
- **换站复用**：只改 `EVENT` 与两张配图即可，引擎无需改动。

## 视觉规范（取自 OpenTenBase 城市行模版）

- 主色：`#003C83` / `#015CB7` / `#2573C5` / `#3785D8` / `#1D7ADC`；浅底 `#E2EFFD`。
- 封面与章节页：深蓝→紫渐变 + 光带动画；内容页：白底蓝题，页脚统一站名与日期。
- 页眉双 Logo：开放原子开源基金会 + OpenTenBase（提取自模版内嵌资源）。

## 技术口径

内核源码基准：PostgreSQL master `23e7ca78a003`（20devel）；主案例：pgvector v0.8.1（独立源码基准，未声明与 master 编译兼容）。所有演示 SQL 为讲解示例，未在目标环境实跑。
