# 「最近交付」为什么暂时不能实现（判定缺口）

**性质：** 只读调查 + 结论。**本轮没有实现该面板**，因为**无法诚实地判定什么算一次交付**。
**依据：** 包内 `01_RESEARCH_AND_PRODUCT §101` 要求首页显示「继续项目、待确认、失败待修、**最近交付**」。

---

## 1. 调查（实测）

| 问题 | 结果 | 证据 |
|---|---|---|
| 服务如何表达「一次交付」？ | 导出产生一个**资产**，`kind='design-bundle'` | `src/design_lab/native_bundles.py:89` |
| 导出入口 | `export_bundle(...)`；HTTP 面是 `/api/projects/{id}/bundles/bundle-native-…/versions/…` | `native_bundles.py:29`、`native_tasks.py:133`、`http_service.py:155` |
| 资产清单里能按 `kind` 过滤吗？ | **不能。** 实测 `/assets` 返回的字段是 `id / version_id / sha256 / byte_size / rights / width / height / media_type`——**没有 `kind`** | W04 记录（`findings/W04-REFERENCES.md` §3.1）与 `image_assets.py` 的列投影 |
| 能否用别的字段代替？ | 不能**验证**。`media_type` 可能对 bundle 是 zip 类，但那是**推断**；且要产生一个真实 bundle 需要**真实 native 宿主**（本会话无此条件） |
| 任务侧能否代替？ | 任务 `kind` 只有 `native-host-published` / `primary` 之类，**不等于**交付；把任务行标成「交付」就是给真实数据贴编造标签 | `native_tasks.py:169,181` |

## 2. 结论

> **在没有 `kind` 字段（或一个 bundles 列表路由）之前，任何「最近交付」面板都必须靠猜。**
> 猜出来的判定会把**非交付**的任务/资产显示成交付——这正是本项目一直在拒绝的那类谎报。

因此本轮**不做**该面板，**只记录缺口**。这与上一轮的处理一致（上一轮也明确写为「等判定明确后补」）。

## 3. 解除阻塞的两个（都需要改服务端，属独立工作）

1. **在 `/assets` 的读回投影里补上 `kind`**（`image_assets.py` 的 SELECT 已经能取到 `asset_kind`，
   只是没有投影出来）——最小改动，且能同时修掉 W04 §3.1 记录的**契约比实现宽**的问题
   （`contracts.ts` 的 `AssetRecord` 本就声明了 `kind`）。
2. 或新增一个**按项目列出 bundle 版本的路由**（现有 `/bundles/…/versions/…` 是单条资源，不是列表）。

两者都改服务端，**应作为独立一轮**（与 W06 Token 写 API 属同类：先写测试，再改服务，避免半验证的后端改动）。

## 4. 本轮未改任何产品代码

工作区与远端 `main` 保持不变（`93cb1cde54106d5ad07fa25e382a22a074c1f418`）。本轮产出**只有本文件**。
