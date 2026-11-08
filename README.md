# SHIBUYA / AFTER HOURS

### 涩谷雨夜 · 可交互实时 3D 城市漫游

一场在雨夜中亮起的涩谷街头漫游。步入巨型广告屏、密集店铺与霓虹灯牌之间，俯瞰被车灯和招牌照亮的湿润路口，或在街道间自由旋转、缩放、观察。场景以东京涩谷为灵感，建筑、广告与店铺均为原创的程序化表现。

![SHIBUYA / AFTER HOURS 场景截图：雨夜路口、商业大楼、霓虹广告和行人](previews/shibuya-after-hours.png)

**在线体验：** [kaorumiyagawa.github.io/Shibuya-After-Hours](https://kaorumiyagawa.github.io/Shibuya-After-Hours/)（首次部署完成后开放）

## 场景亮点

- **高密度商业街区：** 69 栋高低错落的建筑、密集的楼层店招、暖色橱窗与可见的店内货架。
- **城市交通：** 540 名带有步行动作与雨伞的行人，以及 48 辆出租车、轿车和巴士；行人与车辆按照独立信号阶段通过路口。
- **多层街道空间：** 大型交叉路口、商业侧巷、步行天桥、高架列车、屋顶设备、服务阳台与交错的架空线。
- **雨夜灯光：** 湿路面反射与细微水波、动态雨幕、雾气、广告灯箱、冷暖灯光和克制的霓虹光晕。
- **原创屏幕美术：** 为主广告屏创作了一张独立的原创画面；其余店招和广告由场景程序生成。

## 技术栈

- [Three.js](https://threejs.org/) 0.170.0 与 WebGL 2，生成并实时渲染 3D 场景；运行所需的官方 ES modules 随项目一同发布。
- ES modules，采用实例化渲染处理密集人群、灯牌和城市细节。
- Three.js 后期处理：Bloom 光晕、电影色调映射，以及自定义着色器实现的雨水扰动反射。
- Node.js 本地静态服务。项目没有构建打包步骤，运行时资源全部存放于仓库。

## 本地运行

需要 Node.js 20 或更高版本，以及支持 WebGL 2 的现代浏览器，例如 Chrome 或 Edge。

```bash
npm ci
npm start
```

在浏览器打开 <http://localhost:4173>。也可以在 Windows 上双击 [启动场景.cmd](启动场景.cmd)。服务只监听本机地址 `127.0.0.1`。场景、Three.js 模块、广告纹理和样式均由本地服务提供；页面运行时不需要访问 CDN。

`npm run check` 会检查场景 JavaScript 语法。

## 交互操作

| 操作 | 功能 |
| --- | --- |
| 鼠标左键拖动，或单指拖动 | 旋转观察角度 |
| 滚轮，或双指捏合 | 拉近与拉远 |
| 鼠标右键拖动，或双指平移 | 平移观察中心 |
| `1` / `2` / `3` | 切换「交叉路口」「街头漫游」「城市鸟瞰」镜头 |
| `T` | 开启或关闭自动巡游；手动拖动镜头会退出巡游 |
| `Space` | 暂停或继续行人、车辆、雨幕与列车 |
| `R` | 切换雨幕或雨后场景 |
| `H` | 隐藏或显示界面 |
| `P` | 下载当前画面的无界面 PNG 截图 |
| 工具栏「高画质 / 流畅」 | 切换光晕、渲染像素比与反射分辨率 |
| 全屏按钮 | 进入或退出全屏 |

## 版本记录

请见 [CHANGELOG.md](CHANGELOG.md)。

## 项目目录

- `scene.js`：城市模型、广告、灯光、雨水、人车动画与镜头控制。
- `index.html`、`style.css`、`boot.js`：页面、响应式界面及启动失败提示。
- `server.mjs`：仅监听本机的静态文件服务器。
- `vendor/three/`：Three.js 0.170.0 核心与场景使用的官方模块；包含 Three.js 原始 MIT 许可声明。
- `assets/after-hours.png`：原创巨型广告屏纹理。
- `assets/ART_DIRECTION.md`：广告画面的生成方式与完整提示词。
- `previews/shibuya-after-hours.png`：从场景直接导出的无界面高清截图。
- `verify.mjs`、`inspect.mjs`：本地浏览器交互验证和视角预览脚本。
- `index.original.html`：原始街角场景备份。

依赖版本记录在 `package-lock.json`。运行 `npm run vendor:three` 可从安装的 Three.js 0.170.0 包重新复制所需模块。`node_modules` 与本地检查生成的中间截图不会提交。项目未附加开源许可证。
