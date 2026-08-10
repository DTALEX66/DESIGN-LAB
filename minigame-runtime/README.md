# MINIGAME

> Open Design 设计能力的 **设计 fixture / runtime reference**（冻结边界）

本目录是 `OPEN-DESIGN-Assistance` 内的游戏 UI/视觉设计参考样板与运行时 fixture，
服务 Open Design 的 HUD/UI/图标/视觉规范/皮肤/提示词/设计 fixture 需求。
**它不再是小游戏合集平台或独立产品仓库**；禁止平台工程、广告/变现、发行、
运营和完整产品逻辑扩张（详见 `project-memory/MINIGAME_FROZEN_BOUNDARY.md`）。

当前首发样例：**找异常：异常电梯控制台**（`games/find-anomaly/elevator-console/`），
仅作为运行时/视觉 fixture 保留，不作为产品主线推进。

该 fixture 的视觉参考属性包括：监控面板中的 CCTV/电梯轿厢/乘客热源/异常准星
（不是纯文字日志），以及楼层、电梯门、电源、稳定度、异常等级、
乘客数量等状态 HUD 元素；这些用于 Open Design 的游戏 UI/HUD 设计参考。

## 当前能力快照

- H5/Android WebView：`100dvh` 竖屏一屏布局，页面级滚动关闭，面板内滚动
- 微信/抖音小游戏：独立 Canvas runtime，严格检查已确保不依赖 DOM/window
- 换皮系统：皮肤 JSON 驱动，已包含电梯、安防、工厂、地铁、医院 5 套皮肤
- Android APK：项目内便携 JDK/Gradle/Android SDK 工具链已验证可构建 debug APK
- 发布安全：真实 AppID / adUnitId 走 ignored 私有配置，不提交源码
- 数据基础：轻量 `src/analytics.js` 埋点接口已接入 H5 游戏关键路径
- 留存基础：跨局异常档案库已按皮肤记录遭遇异常、解锁日志和收集进度
- 视觉资产：`docs/IMAGE_GENERATION_PROMPT_PACK.md` 收录真实 CCTV / 控制台 / HUD 材质生成词汇


## 平台目录

```text
games/                         # 小游戏合集分类目录
games/find-anomaly/            # 找异常分类
games/find-anomaly/elevator-console/  # 当前首发游戏 manifest / 运行时映射
```

关键文档：

- `docs/PLATFORM_POSITIONING.md`：MINIGAME 新平台定位
- `docs/DIRECTORY_MAP.md`：本地目录分层与后续迁移边界
- `games/README.md`：小游戏合集分类入口

## 快速开始

```bash
npm install
npm run serve
```

然后访问：

```text
http://127.0.0.1:5173
```

## 一键开发验收

```bash
npm run verify
```

该命令会完整执行：

1. `npm test`
2. 微信小游戏构建与 strict bundle 检查
3. 抖音小游戏构建、真实 `tt` Canvas 冒烟测试与合规静态检查
4. Android debug APK 构建
5. Android APK 元数据检查

当前验收状态与测试数以实际输出为准，不以 README 中的历史记录代替。

## Android APK

```bash
npm run android:build
npm run android:inspect
```

产物：

```text
android-webview/app/build/outputs/apk/debug/app-debug.apk
```

详细交接见：

```text
docs/ANDROID_APK_HANDOFF.md
```

## 微信/抖音小游戏构建

```bash
node build.js wechat
node scripts/check-wechat-bundle.mjs --strict
npm run douyin:build
npm run douyin:check
npm run douyin:compliance
```

平台产物：

```text
wechat-minigame/{game.js,game.json,project.config.json,audio/}
douyin-minigame/{game.js,game.json,project.config.json,audio/}
```

抖音正式发布门禁与打包：

```bash
npm run douyin:release:check
npm run douyin:package
```

`douyin:package` 只在真实抖音 AppID、三个真实激励广告位和全部代码门禁通过后生成 `dist/douyin-minigame-release.zip` 与 SHA-256 manifest。完整交接见 `docs/DOUYIN_RELEASE_HANDOFF_2026-07-12.md`。

> 公开 `project.config.json` 使用游客/占位 AppID；真实 AppID 由 ignored `release.config.json` 写入 `project.private.config.json`，不得提交。

## 发布前私有配置

仓库只提交安全模板：

```bash
cp release.config.example.json release.config.json
```

然后在本地 `release.config.json` 填入真实值：

```json
{
  "releaseMode": true,
  "wechat": {
    "appid": "真实微信小游戏 AppID",
    "adUnits": {
      "revive": "真实微信复活广告位",
      "decode": "真实微信日志解锁广告位",
      "truth": "真实微信真相提示广告位"
    }
  },
  "douyin": {
    "appid": "真实抖音小游戏 AppID",
    "adUnits": {
      "revive": "真实抖音复活广告位",
      "decode": "真实抖音日志解锁广告位",
      "truth": "真实抖音真相提示广告位"
    }
  }
}
```

发布前运行：

```bash
npm run release:check
```

默认占位配置下该命令会故意失败；填入真实私有配置后才应通过。

## 常用命令

```bash
npm run serve            # 本地 H5 预览
npm test                 # Node16 兼容测试入口
npm run verify           # 一键开发验收
npm run android:build    # 构建 Android WebView debug APK
npm run android:inspect  # 检查 APK 包名、应用名、图标、SDK
npm run android:install  # 安装并启动 Android debug APK（需 adb 设备在线）
npm run douyin:build     # 生成可导入抖音开发者工具的 Canvas 工程
npm run douyin:check     # 抖音目录、包体、tt API 与 runtime 静态门禁
npm run douyin:compliance # 隐私、适龄、素材与敏感 API 门禁
npm run douyin:release:check # 仅检查抖音真实发布配置
npm run douyin:package   # 真实配置通过后生成发布 ZIP + SHA-256 manifest
npm run release:check    # 全平台发布前检查
npm run skin:new -- <id> [名称]  # 从模板生成新皮肤
node build.js wechat     # 构建微信小游戏 bundle
```

## 当前文档

- `docs/PLATFORM_POSITIONING.md`：旧平台定位（已 DEPRECATED，见冻结边界文档）
- `docs/DIRECTORY_MAP.md`：目录分层与游戏分类
- `docs/PROJECT_CONTEXT.md`：项目单一事实源
- `docs/WORKFLOW.md`：AI 协作与开发约束
- `docs/YOLO_BOUNDARIES.md`：YOLO 自主执行边界
- `docs/GAME_DESIGN.md`：异常电梯控制台设计总纲
- `docs/P1_MONETIZATION_LOOP.md`：变现循环设计
- `docs/P2_SKINNING_SYSTEM.md`：换皮系统设计
- `docs/P3_PLATFORM_ADAPTATION.md`：平台适配设计
- `docs/ANDROID_APK_HANDOFF.md`：Android APK 构建/安装/调试交接
- `docs/DOUYIN_RELEASE_HANDOFF_2026-07-12.md`：抖音构建、检查、材料与发布阻塞交接
- `docs/NEXT_TASKS.md`：后续任务列表与建议执行顺序
- `docs/CONTENT_PACK_SPEC.md`：内容包协议与当前 skin 映射
- `docs/SKIN_AUTHORING_GUIDE.md`：新皮肤生成流程与模板使用说明
- `docs/GAME_BASE_SELECTION.md`：开源小游戏底座评分表

## 开发原则

- 每次只做一个功能
- 先设计，后开发
- 所有修改必须可回滚
- 不偏离"Open Design 设计 fixture / runtime reference"的冻结边界（见 `project-memory/MINIGAME_FROZEN_BOUNDARY.md`）
- 真实 AppID / adUnitId / 私密配置只放 ignored 本地文件，不提交源码
