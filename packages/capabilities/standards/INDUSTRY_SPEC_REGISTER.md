# 行业设计规范登记表（INDUSTRY SPEC REGISTER）

- **这份文件是什么**：把"网上最专业的公开设计规范"按**来源、版本、许可、可否再分发**登记入库，供 owner 后续自行落地测试。
- **这份文件不是什么**：不是已批准的知识、不是已接入的能力、不是任何一次合规判定。`登记 ≠ 吸收 ≠ 接入 ≠ 通过`。
- **本文不抄规范正文**：所有条目只给出处与许可事实。许可不允许转载的（Apple、ISO、Khronos 正式版、APCA），一个字的正文都不进仓库，只留引用地址。
- **观察时间**：首轮 2026-10-21，第二轮 2026-10-22（重跑 C 档与三家设计语言的版本/日期面），逐条打开下列 URL 实测；**取不到就写 UNKNOWN**，不用记忆补，也不把"没取到"写成"不存在"。
- **谁量的**：第一轮取数由本会话的只读检索执行完成（它只读页面，不写文件）；主会话随后二次复核了 **WCAG 2.2 与 IBM Carbon**（推荐日期、许可标识与 LICENSE 文本各读回一次），并在第二轮**直接取到 WCAG 3.0 草案页**、重试图书 ISO 14289-1 与 IEC 61966-2-1 的出版方页面（两者今日仍取不到，见 C 档）。其余条目仍是**一次观察**，落地引用前须重取——一次读数不等于可长期引用的出处。

## 一、按可动用程度分三档

| 档 | 含义 | 条目 |
| --- | --- | --- |
| **A 可吸收**（许可明示允许再分发，署名即可） | 可以把要点改写进本项目的标准文档并标注来源 | WCAG 2.2（W3C Document License）、WCAG 3.0 草案（同为 W3C 文档许可，但**草案不是判据**）、IBM Carbon（Apache-2.0）、Material 组件仓库（Apache-2.0 / MIT）、Fluent 组件仓库（MIT 文本）、glTF 2.0 的 AsciiDoc 源（CC-BY-4.0） |
| **B 只可引用**（版权或付费墙，正文不得进仓库） | 只能记名字、版本、链接与"该由谁去读" | Apple HIG、ISO 9241-210:2019、glTF 2.0 的 HTML/PDF 正式件、APCA 全部页面 |
| **C 今日未能向出版方核验** | 不得当作已入库，下次要重跑取数 | PDF/UA-1（ISO 14289-1；2026-10-22 第二轮 ISO 整站 403、pdfa.org 403、ANSI 403、BSI 404、DIN 连接失败）、IEC 61966-2-1（sRGB）——两者的**版次号只有二手线索**，出版方页面两轮都取不到；IEC 侧另取到一条可打开的 ICC 登记页（`registry.color.org/rgb-registry/srgb`），只可引用，不等同于 IEC 出版物 |

## 二、逐条实测

| 规范 | 发布方 | 我实际打开的地址 | 版本 / 日期（页面原话） | 许可（页面原话） | 管什么 |
| --- | --- | --- | --- | --- | --- |
| WCAG 2.2 | World Wide Web Consortium | https://www.w3.org/TR/WCAG22/ | "W3C Recommendation 12 December 2024" | "Copyright © 2020-2024 World Wide Web Consortium … document use rules apply"，链接文字为 "W3C Document License" | 网页内容的可感知/可操作/可理解/稳健判据；本项目 `ACCESSIBILITY_BASELINE.md` 的 AA 目标即指向它 |
| WCAG 3.0 | World Wide Web Consortium | https://www.w3.org/TR/wcag-3.0/ （第二轮直接取到） | "W3C Working Draft 10 September 2026"；"This version: https://www.w3.org/TR/2026/WD-wcag-3.0-20260910/" | "Copyright © 2021-2026 World Wide Web Consortium. W3C® document use rules apply." | 下一代网页可访问性指南的**草案**。它是方向，不是判据：本项目现行判据仍是 WCAG 2.2 AA，任何对比度阈值改动要 owner 裁定 |
| Apple Human Interface Guidelines | Apple | https://developer.apple.com/design/human-interface-guidelines 为 JS 壳；2026-10-22 实测可打开的是纯 Markdown 姊妹页 https://developer.apple.com/design/human-interface-guidelines.md（`/design/whats-new.md` → 300 Multiple Choices，`/tutorials/data/documentation/design/information.json` 及三个同级 JSON 全 **404**） | **UNKNOWN**：该 .md 页全篇不印编辑日期或规范版本号。页内 frontmatter 只有 `"metadataVersion" : "0.1.0"`、`"framework" : "Human Interface Guidelines"`——**0.1.0 是内容元数据的 schema 标记，不是规范版本，不得当作 HIG 版本登记** | "Copyright © 2026 Apple Inc. All rights reserved."（同页页脚，另链接 Apple Terms of Use 与 Privacy Policy） | Apple 平台的 UI/UX 约定。B 档：只引用 |
| Material Design 3 色彩 | 页面未署名（站点标题 "Material Design"） | https://m3.material.io/styles/color/overview 与 /blog 均为 JS 壳；2026-10-22 实测可打开的带日期面是 https://m3.material.io/sitemap.xml | **UNKNOWN（无发布版本号）**；sitemap 给出的是 `<lastmod>`：`https://m3.material.io/` → 2026-07-08、`/blog` → 2026-10-06、`/building-with-m3-expressive` → 2026-07-16。**登记为"站点最后修改日，不是规范版本"** | 规范页 UNKNOWN；组件仓库实测：`material-components/material-components` = Apache-2.0，`material-components-web` = "The MIT License … Google, Inc."，`material-web` = Apache-2.0 | 色彩角色系统与配色推导；A 档只针对**代码仓库**，规范页正文按 B 档处理 |
| Microsoft Fluent 2 | Microsoft | https://fluent2.microsoft.design/ 与 /components 均为客户端渲染；2026-10-22 再试 /whats-new → **404**、/get-started/whatisnew → 页面自述无带日期条目、/ 仅 "Home - Fluent 2 Design System" | **UNKNOWN**（无 changelog、无版本 JSON、无带日期的发布说明面可打开） | 站点仅 "© Microsoft 2026"，无文档许可；`microsoft/fluentui` 的 LICENSE 文本为 "MIT License / Copyright (c) Microsoft Corporation."（GitHub API 把该文件标为 NOASSERTION）。**一处必须写下来的误认风险**：/components 页面上唯一的版本串是 "DOMPurify version is 3.4.15"，那是随页打包的净化库，**不是 Fluent 的版本**，不得登记为规范版本 | 跨端产品设计系统 |
| IBM Carbon | IBM | https://carbondesignsystem.com/ | 页面显示 "v11.0"，页脚 "Copyright © 2026 IBM" | `carbon-design-system/carbon` LICENSE = "Apache License Version 2.0, January 2004" | 企业级设计系统与组件规格；A 档 |
| glTF 2.0 | Khronos Group | https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html → **403**（Cloudflare 挑战，浏览器头也过不去） | UNKNOWN（正式件页面未取到） | 镜像仓库 `KhronosGroup/glTF` 的 LICENSE.adoc：规范 AsciiDoc 源 = "SPDX license identifier: CC-BY-4.0"；HTML/PDF 输出 = "LicenseRef-KhronosSpecCopyright"，原文给予"使用与复制**未修改**规范"的有条件许可，并禁止未经许可的再分发 | 3D 资产传输格式；`3D_ASSET_INTEROP.md` 的外部参照 |
| ISO 9241-210 | ISO | https://www.iso.org/standard/77520.html（现行）与 …/52075.html（旧版） | "ISO 9241-210:2019 — Edition 2, 2019"，Status Published，Publication date 2019-07；52075 那条为 "Edition 1, 2010"，状态 **Withdrawn** | "…protected by copyright and are subject to the user's acceptance of ISO's conditions of copyright. Any use, including reproduction requires our written permission." | 以人为中心的设计流程要求。B 档且付费：只记名字与版次 |
| PDF/UA-1 | ISO（出版方页面第二轮仍取不到） | 2026-10-21 首轮：https://www.iso.org/standard/64599.html → **403**；https://www.pdfa.org/project/pdf-ua/（403→404）、/standards/pdf-ua/（重定向后 403）、/project/pdf-ua-2/（403）、wp-json 与 sitemap（403）。2026-10-22 第二轮再试全部落空：iso.org `/standard/71374`、`/38369`、`/64599` 与 `/obp/ui` 一律 **403**（整站挡非浏览器客户端），pdfa.org 根页与三条子路径仍 **403**，`webstore.ansi.org/standards/iso/iso1428912014amdp1p2021` **403**，`knowledge.bsigroup.com` **404 "Product not found"**，DIN webstore 连接失败 | 二手线索一致写作 "ISO 14289-1:2014"（初版 2012；PDF/UA-2 = ISO 14289-2:2024），本轮新增一条同向线索：tug.org/twg/accessibility 亦写 "Revised as ISO 14289-1:2014 (December 2014)"——**仍未向出版方核验，只算线索，版次保持 UNKNOWN** | UNKNOWN（ISO 一律付费并主张版权，实践上按 B 档处理） | 无障碍 PDF 的交付剖面。**注意一处外部误记**：随包的 2026-10-21 审计材料把 PDF/UA-1 写成 "ISO 19005-1"，而 19005-1 是 PDF/A-1；本行原本就写 14289-1，不因该措辞去"修改"一个已经正确的编号 |
| APCA（可感知对比度） | 站点标题 "Inclusive Reading Technologies"；仓库署名 Myndex / Andrew Somers | https://readtech.org/ARC/（200）与 https://apcacontrast.com（200）；题述 `.../ARC/tests/accessible-perceptual-contrast-algorithm/` → 404 | `apca-w3` LICENSE.md："Current base reference algorithm is 0.0.98G-4g … apca-w3 versions 0.1.9" | apcacontrast.com："COPYRIGHT © 1997-2022 BY ANDREW SOMERS, ALL RIGHTS RESERVED - The content on THIS page is PROPRIETARY AND NOT LICENSED FOR FURTHER USE."；`SAPC-APCA`："Registered Beta Testers OR Personal use only is permitted unless authorized in writing"、"Patent(s) pending"；`apca-w3`："licensed to the W3/AGWG under their cooperative agreement for use with WCAG … web-delivered and web-based content only" | 显示介质上的文字/背景感知对比。**B 档，且它不是本项目现行判据**：现行仍是 WCAG 2.2 的对比度条款 |
| sRGB / IEC 61966-2-1 | IEC（出版方页面两轮都取不到） | 2026-10-21：https://webstore.iec.ch/publication/78 实测返回的是 **CISPR 25:2008**（`og:title` 读数），即这个编号不是 61966-2-1；webstore 为 SPA，服务端不出出版数据，检索路径连接重置。2026-10-22 复核：`webstore.iec.ch/en/publication/78` 页面自己印 "CISPR 25:2008. Edition: 3.0. Date: 2008-03-26. Status: Withdrawn (2016-10-27). Superseded by CISPR 25:2021"，`/en/search?q=61966-2-1` 与高级检索表单均 **404/连接失败** | IEC 版次仍 **UNKNOWN**。本轮新取到一条**可打开的权威侧页**：`registry.color.org/rgb-registry/srgb`（由 color.org/chardata/rgb/srgb.xalter 301 而来）原样印 Reference "sRGB"、Def "IEC 61966-2-1:1999"、Doc "see Amendment 1 to IEC 61966-2-1:1999"、"Updated April 2015"，并写 "International Standard defining this colour encoding published by IEC, Geneva (document available through National Standards Bodies)"——**这是 ICC 的色彩编码登记，不是 IEC 的出版物记录，按"只可引用"处理**；聚合站上 "COR1:2014 latest" 一类说法非出版方来源，不采 | UNKNOWN | 默认 RGB 色彩空间 sRGB |

## 三、这份登记表自己不被什么背书

1. **没有任何一条被判定为"本项目已符合"**。判定需要真实产物 + 真实测量 + 人审（E3/E4），本项目现在没有。
2. **UNKNOWN 是读数，不是空缺**。写 UNKNOWN 的地方表示今天确实取不到，下次要重跑；把它改成"应该没问题"就是编造。
3. **A 档 ≠ 可以照抄**：许可允许再分发仍要求署名与保留声明，且本项目的规范正文一律用自己的话重写并标注来源（见 `front-end-design-checklist/SOURCE.md` 的既有做法）。
4. **B/C 档不得进任何提示词语料**：付费墙与专有正文一旦被抓进 prompt，就是权利问题，不是引用问题。
5. **对比度判据只有一个现行版本**：`ACCESSIBILITY_BASELINE.md` 指向 WCAG 2.2 AA；APCA 只作为"行业在往哪走"的记录存在，不改判据、不改闸门阈值，除非 owner 明确裁定。

## 四、下一步（不是待办派工，是取数欠账）

- **PDF/UA-1**：ISO 目录页与 PDF Association 双侧都被挡（403/404，含 sitemap 与 wp-json），2026-10-22 第二轮把 ANSI、BSI、DIN 三个国家标准渠道也试完，仍然全数落空。**这条欠账现在的处置**：`ACCESSIBILITY_BASELINE.md` 已就地标注"做法不需出处、带版次的合规断言待取证"，所以它不再是一句没有根据的对外声明；C 档状态保持，下一次仍可重跑取数（换网络出口或走国家渠道的付费页）。
- **IEC 61966-2-1（sRGB）**：`webstore.iec.ch/publication/78` 是错的编号（两轮实测都返回 CISPR 25:2008，且该条已于 2016-10-27 撤回）。按本条原计划改走了 ICC 的公开登记页 `registry.color.org/rgb-registry/srgb`，它把 Def 写成 "IEC 61966-2-1:1999" 并提到 Amendment 1——**登记为只可引用的侧页**，IEC 出版记录本身仍是 UNKNOWN，没有引用一个没打开过的"IEC 官方页"。
- Apple HIG 与 Material / Fluent 规范页是客户端渲染的：版本与日期不在服务端 HTML 里。**本行原先写的"走 Apple 的 `.../tutorials/data/design/human-interface-guidelines.json`（实测可用）"已被 2026-10-22 否证**——那一族 JSON 全部 404，可打开的是 `.md` 姊妹页（它只给 `metadataVersion 0.1.0` 与版权年，不给编辑日期）。Material 侧唯一可打开的带日期面是 `sitemap.xml` 的 `<lastmod>`；Fluent 侧两轮都没有可打开的带日期面。三者的版本号一律保持 **UNKNOWN**，不猜。
- ~~WCAG 3~~ 已在第二轮直接取到（Working Draft 10 September 2026）。它进的是 A 档"可署名引用"，**不是**判据位。
