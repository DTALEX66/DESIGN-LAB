# NEXT-ROUND PLAN —— bundle / 交付列表路由（未知项已全部消除）

**状态：** **计划**，不是交付。本文件不声称任何实现已完成。
**基线：** `main` = `93534d5a22ff9e4fc12bdaed8700e87f4668e360`
**目的：** 该路由同时解决两件已记录的问题——

1. W03 的「**最近交付**」（包内 `01_RESEARCH_AND_PRODUCT §101` 点名的首页模块）；
2. **D-6**（`/assets` 语义）的一半：它证明「交付」不需要靠改 `/assets` 的语义来取得。

**为什么需要新路由**（已实测，非推测）：
- `/assets` **按构造是 raster-only**（`image_assets.py:48 _read` 在 WHERE 里硬过滤
  `asset_kind='raster'`）→ 它**永远不可能**返回 `design-bundle`；
- `/bundles/<id>/versions/<v>` 是**单条资源**，不是列表；
- 因此「我交付过什么」当前**没有任何路由能回答**。

---

## 1. 已核实的事实（无需再查）

| 事实 | 出处 |
|---|---|
| 交付 = `asset_kind='design-bundle'` 的资产 | `native_bundles.py:89`（`assets.record(... kind='design-bundle' ...)`） |
| bundle 落在**通用** `asset / asset_version / artifact` 表 | `native_bundles.py` 走 `asset_store` |
| 无需假设 id 前缀 | `asset_store.register_asset(conn, project_id, asset_id, asset_kind)` 是通用的 |
| helper 的构造方式 | `NativeAssets.__init__`: `self.service=service; self.paths=service.paths` |
| 可照抄的查询形状 | `native_assets.py:19 _rows`（ACTIVE + 最新 `version_no` + `LIMIT 101` 游标） |
| 可照抄的元数据形状 | `native_assets.py::_metadata`（`id/kind/version_id/version_no/byte_size/sha256/rights/verification`） |
| 路由注册形态 | `http_service.py:177`：`self.send_json(200, NativeAssets(service).list(match[1], match[2] or ''))` |

## 2. 为什么把类放进 `native_assets.py` 而不是 `native_bundles.py`

`native_assets.py` **已经导入** `sqlite3`、`closing`、`ImageAssetError`——把类放这里
**不需要任何 import 手术**；放进 `native_bundles.py` 则要新增导入，多一次出错机会。
（这一点在上一轮已经确定。）

## 3. 三步改动（用**精确编辑工具**，不要用 shell 字符串拼接）

> ⚠️ 本会话的教训：这套改动我曾用 PowerShell 字符串拼接做过三次，**全部失败**
> （两次破坏 harness 语法导致回滚、一次 PowerShell 解析错误）。
> **源码改动一律用精确编辑工具。**

### 3.1 `src/design_lab/native_assets.py` —— 在文件末尾追加

```python
class Bundles:
    """Read-only list of a project's design bundles -- i.e. its deliveries.

    A delivery IS an asset with asset_kind='design-bundle' (native_bundles.export_bundle).
    Neither existing route can answer "what did I deliver?": /assets is raster-only by
    construction, and /bundles/<id>/versions/<v> is a single resource, not a list.
    Read-only: it never writes, and it reuses the ACTIVE / latest-version rules.
    """

    def __init__(self, service):
        self.service = service
        self.paths = service.paths

    def list(self, project_id):
        if self.service.get_project(project_id) is None:
            raise ImageAssetError(404, 'PROJECT_NOT_FOUND')
        path = self.paths.database_path(self.service.database)
        with closing(sqlite3.connect(path.as_uri() + '?mode=ro', uri=True)) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                '''SELECT a.asset_id,a.asset_kind,v.version_id,v.version_no,f.sha256,f.byte_size
                   FROM asset a
                   JOIN asset_version v ON v.asset_id=a.asset_id
                   JOIN artifact f ON f.version_id=v.version_id
                   WHERE a.project_id=? AND a.asset_kind='design-bundle' AND v.state='ACTIVE'
                   AND v.version_no=(SELECT MAX(b.version_no) FROM asset_version b
                                     WHERE b.asset_id=a.asset_id AND b.state='ACTIVE')
                   ORDER BY a.asset_id LIMIT 101''', (project_id,)).fetchall()
        return {'bundles': [dict(id=r['asset_id'], kind=r['asset_kind'], version_id=r['version_id'],
                                 version_no=r['version_no'], byte_size=r['byte_size'],
                                 sha256='sha256:' + r['sha256'].removeprefix('sha256:'),
                                 rights='NOT_REVIEWED', verification='METADATA_ONLY')
                            for r in rows[:100]]}
```

### 3.2 `src/design_lab/http_service.py` —— 两处

1. import 行（现为 `from .native_assets import NativeAssets`）改为
   `from .native_assets import Bundles, NativeAssets`
2. 在 `do_GET` 里、紧随现有的 native-assets 列表路由之后加：
   ```python
   match = re.fullmatch(r'/api/projects/([0-9a-f]{32})/bundles', self.path)
   if match:
       return self.send_json(200, Bundles(service).list(match[1]))
   ```

### 3.3 先写测试（包内要求「先测试后改服务」）

`design-lab/tests/test_bundles_list.py`：
- 空项目 → `{'bundles': []}`（**不是** 404）；
- 跨项目 / 未知项目 → `404 PROJECT_NOT_FOUND`（沿用其它读面的 fail-closed 规则）；
- 有 bundle 时字段形状正确（用现有 fixture 造一条 `design-bundle` 资产，或用
  `asset_store.record_version` 直接写）；
- **raster 资产不出现在 bundles 列表里**（证明过滤生效，而不是把所有资产都倒出来）。

## 4. 之后的顺序

全量 Python 套件 → `verify_design_lab.py` → 归档（finding + 机读证据 + 可重跑 harness）
→ PR → 9 项必需 CI → merge → 双端核对。

## 5. 前端接续（下一轮或同一轮的后半）

`/projects/:id` 加「最近交付」面板，数据即该列表；harness **必须用新文件**
（本会话已两次因改动已验证的 harness 而回滚）。

---

**END —— 计划文件，未实现任何部分。**
