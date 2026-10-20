# 行业设计规范登记表（INDUSTRY SPEC REGISTER）

- **这份文件是什么**：把"网上最专业的公开设计规范"按**来源、版本、许可、可否再分发**登记入库，供 owner 后续自行落地测试。
- **这份文件不是什么**：不是已批准的知识、不是已接入的能力、不是任何一次合规判定。`登记 ≠ 吸收 ≠ 接入 ≠ 通过`。
- **本文不抄规范正文**：所有条目只给出处与许可事实。许可不允许转载的（Apple、ISO、Khronos 正式版、APCA），一个字的正文都不进仓库，只留引用地址。
- **观察时间**：2026-10-21，逐条打开下列 URL 实测；**取不到就写 UNKNOWN**，不用记忆补，也不把"没取到"写成"不存在"。
- **谁量的**：取数由本会话的只读检索执行完成（它只读页面，不写文件）；其中 **WCAG 2.2 与 IBM Carbon 两条由主会话二次复核**（推荐日期、许可标识与 LICENSE 文本各读回一次）。其余条目是**一次观察**，落地引用前须重取——一次读数不等于可长期引用的出处。

## 一、按可动用程度分三档

| 档 | 含义 | 条目 |
| --- | --- | --- |
| **A 可吸收**（许可明示允许再分发，署名即可） | 可以把要点改写进本项目的标准文档并标注来源 | WCAG 2.2（W3C Document License）、IBM Carbon（Apache-2.0）、Material 组件仓库（Apache-2.0 / MIT）、Fluent 组件仓库（MIT 文本）、glTF 2.0 的 AsciiDoc 源（CC-BY-4.0） |
| **B 只可引用**（版权或付费墙，正文不得进仓库） | 只能记名字、版本、链接与"该由谁去读" | Apple HIG、ISO 9241-210:2019、glTF 2.0 的 HTML/PDF 正式件、APCA 全部页面 |
| **C 今日未能核验** | 不得当作已入库，下次要重跑取数 | WCAG 3 草案、PDF/UA-1、IEC 61966-2-1（sRGB） |

## 二、逐条实测

| 规范 | 发布方 | 我实际打开的地址 | 版本 / 日期（页面原话） | 许可（页面原话） | 管什么 |
| --- | --- | --- | --- | --- | --- |
| WCAG 2.2 | World Wide Web Consortium | https://www.w3.org/TR/WCAG22/ | "W3C Recommendation 12 December 2024" | "Copyright © 2020-2024 World Wide Web Consortium … document use rules apply"，链接文字为 "W3C Document License" | 网页内容的可感知/可操作/可理解/稳健判据；本项目 `ACCESSIBILITY_BASELINE.md` 的 AA 目标即指向它 |
| WCAG 3 | UNKNOWN | 试取 https://www.w3.org/WAI/GL/WCAG3/0/2024/draft1/ → 404 | UNKNOWN | UNKNOWN | 未核验：**不得**把 APCA 之类"WCAG 3 方向"的算法当成本项目的现行对比度判据 |
| Apple Human Interface Guidelines | Apple | https://developer.apple.com/design/human-interface-guidelines | UNKNOWN（页面为 JS 渲染，服务端 HTML 内无版本/日期） | "Copyright © 2026 Apple Inc. All rights reserved."（取自站点自带 JSON 数据源），另链接 Apple 服务条款 | Apple 平台的 UI/UX 约定。B 档：只引用 |
| Material Design 3 色彩 | 页面未署名（站点标题 "Material Design"） | https://m3.material.io/styles/color/overview | UNKNOWN（客户端渲染，HTML 内无许可/日期） | 规范页 UNKNOWN；组件仓库实测：`material-components/material-components` = Apache-2.0，`material-components-web` = "The MIT License … Google, Inc."，`material-web` = Apache-2.0 | 色彩角色系统与配色推导；A 档只针对**代码仓库**，规范页正文按 B 档处理 |
| Microsoft Fluent 2 | Microsoft | https://fluent2.microsoft.design/ | UNKNOWN | 站点仅 "© Microsoft 2026"，无文档许可；`microsoft/fluentui` 的 LICENSE 文本为 "MIT License / Copyright (c) Microsoft Corporation."（GitHub API 把该文件标为 NOASSERTION） | 跨端产品设计系统 |
| IBM Carbon | IBM | https://carbondesignsystem.com/ | 页面显示 "v11.0"，页脚 "Copyright © 2026 IBM" | `carbon-design-system/carbon` LICENSE = "Apache License Version 2.0, January 2004" | 企业级设计系统与组件规格；A 档 |
| glTF 2.0 | Khronos Group | https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html → **403**（Cloudflare 挑战，浏览器头也过不去） | UNKNOWN（正式件页面未取到） | 镜像仓库 `KhronosGroup/glTF` 的 LICENSE.adoc：规范 AsciiDoc 源 = "SPDX license identifier: CC-BY-4.0"；HTML/PDF 输出 = "LicenseRef-KhronosSpecCopyright"，原文给予"使用与复制**未修改**规范"的有条件许可，并禁止未经许可的再分发 | 3D 资产传输格式；`3D_ASSET_INTEROP.md` 的外部参照 |
| ISO 9241-210 | ISO | https://www.iso.org/standard/77520.html（现行）与 …/52075.html（旧版） | "ISO 9241-210:2019 — Edition 2, 2019"，Status Published，Publication date 2019-07；52075 那条为 "Edition 1, 2010"，状态 **Withdrawn** | "…protected by copyright and are subject to the user's acceptance of ISO's conditions of copyright. Any use, including reproduction requires our written permission." | 以人为中心的设计流程要求。B 档且付费：只记名字与版次 |
| PDF/UA-1 | UNKNOWN | 试取 https://www.pdfa.org/project/pdf-ua/（403→404）、/standards/pdf-ua/（重定向后 403）、/project/pdf-ua-2/（403）、wp-json 与 sitemap（403）；ISO 14289-1 目录页与 OBP REST 亦 403 | UNKNOWN | UNKNOWN | 未核验：`ACCESSIBILITY_BASELINE.md` 里"PDF/UA 是可记录的交付剖面"这句话目前**没有**外部出处支撑，落地前须重取 |
| APCA（可感知对比度） | 站点标题 "Inclusive Reading Technologies"；仓库署名 Myndex / Andrew Somers | https://readtech.org/ARC/（200）与 https://apcacontrast.com（200）；题述 `.../ARC/tests/accessible-perceptual-contrast-algorithm/` → 404 | `apca-w3` LICENSE.md："Current base reference algorithm is 0.0.98G-4g … apca-w3 versions 0.1.9" | apcacontrast.com："COPYRIGHT © 1997-2022 BY ANDREW SOMERS, ALL RIGHTS RESERVED - The content on THIS page is PROPRIETARY AND NOT LICENSED FOR FURTHER USE."；`SAPC-APCA`："Registered Beta Testers OR Personal use only is permitted unless authorized in writing"、"Patent(s) pending"；`apca-w3`："licensed to the W3/AGWG under their cooperative agreement for use with WCAG … web-delivered and web-based content only" | 显示介质上的文字/背景感知对比。**B 档，且它不是本项目现行判据**：现行仍是 WCAG 2.2 的对比度条款 |
| sRGB / IEC 61966-2-1 | UNKNOWN | https://webstore.iec.ch/publication/78 返回的是 CISPR 25:2008（`og:title` 实测），即该编号**不是** 61966-2-1；webstore 为 SPA，服务端无出版数据，API/检索路径连接重置 | UNKNOWN | UNKNOWN | 未核验：不得引用"IEC 61966-2-1 官方页"这个说法，直到取到正确地址 |

## 三、这份登记表自己不被什么背书

1. **没有任何一条被判定为"本项目已符合"**。判定需要真实产物 + 真实测量 + 人审（E3/E4），本项目现在没有。
2. **UNKNOWN 是读数，不是空缺**。写 UNKNOWN 的地方表示今天确实取不到，下次要重跑；把它改成"应该没问题"就是编造。
3. **A 档 ≠ 可以照抄**：许可允许再分发仍要求署名与保留声明，且本项目的规范正文一律用自己的话重写并标注来源（见 `front-end-design-checklist/SOURCE.md` 的既有做法）。
4. **B/C 档不得进任何提示词语料**：付费墙与专有正文一旦被抓进 prompt，就是权利问题，不是引用问题。
5. **对比度判据只有一个现行版本**：`ACCESSIBILITY_BASELINE.md` 指向 WCAG 2.2 AA；APCA 只作为"行业在往哪走"的记录存在，不改判据、不改闸门阈值，除非 owner 明确裁定。

## 四、下一步（不是待办派工，是取数欠账）

- 重取 WCAG 3 的真实位置（W3C AGWG 目录）与 PDF/UA 的可访问出处；
- 找到 IEC 61966-2-1 的正确编号/URL，或改用 W3C CSS Color 与 ICC 的公开页替代"色彩空间出处"这一格；
- Apple HIG 与 Material 规范页是客户端渲染的：要拿版本与日期，需要走它们各自的数据接口（Apple 已有 JSON feed 实测可用），而不是猜一个日期。
