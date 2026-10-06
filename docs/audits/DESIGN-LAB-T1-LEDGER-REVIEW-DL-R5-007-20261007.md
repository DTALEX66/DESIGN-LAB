# T1 账本逐任务复核 · 第七项：DL-R5-007

**复核对象**：`design-lab/config/task-ledger-r3.json` → `DL-R5-007`「Doctor 与本机证据接续」
**观测 exact SHA**：`main` = `b7f82ac0`（`gh api commits/main` 实读；#250 合并后）
**观察窗口**：2026-10-06T22:05Z–22:07Z（本机直测，命令与退出码见下）
**结论**：A1 对**工具**成立、对**模型**不成立；A2 成立；A3 成立但没有正向守卫；A4 成立。
**`host_live` 与 `delivery` 两条轴证据为空且 `host_live` 属 required_axes → 本任务不可能 PASS。**

| 轴 | 现状 | 证据 | required |
|---|---|---|---|
| `implementation` | PARTIAL | `r5-007-static-unit-20260928` | 是 |
| `unit` | PARTIAL | `r5-007-static-unit-20260928` | 是 |
| `host_live` | PARTIAL | **空** | **是** |
| `delivery` | PARTIAL | 空 | 否 |

---

## A1「不重复报已登记软件未安装」— 工具成立（本轮闭环），模型**不成立**

工具这一半在 `b7f82ac0` 上第一次有了当期直测证据（PR #250 的 `path_source` 绑定）：

```
python -X utf8 -B -m design_lab.runtime.doctor   →  rc=0
  uv      found=true  VERSION_VERIFIED  path_source=shutil.which                    drift=[]
  git     found=true  VERSION_VERIFIED  path_source=shutil.which                    drift=[]
  ffmpeg  found=true  VERSION_VERIFIED  path_source=declared:.project/paths.json#tools.ffmpeg   drift=[]
  node    found=true  VERSION_VERIFIED  path_source=declared:.project/paths.json#tools.node     drift=[]
```

`ffmpeg`/`node` 的 `path` 落在声明共享根 `D:/All projects/OS External Configuration/10-toolchains/…`
的真实版本目录，`search_scope` 明写 `declared binding, then current process PATH`。
这条正是验收句要的：不再把已登记的东西报成未安装，且**声明优先**而不是 PATH 撞运气。

模型这一半不成立，原因是探测根与登记根不是同一个：

1. `src/design_lab/analysis/model_cache.py:33-38` —— `ModelCacheProbe` 默认根取
   `layout.model_cache / "huggingface"`，即**项目内** `.project-local/cache/models/huggingface`；
   `probe_hf` 只在 `…/hub/models--<org>--<name>` 这个 HF-hub 布局下找（同文件 `:55-57`）。
2. 策略其实**允许**声明库：`analysis/model_manifest.py:57-62` 把
   `shared_inputs['model-library']` 加进 `allowed`，措辞就是
   `cache root must be project-local or the declared read-only model library`（`:61`）。
   也就是说 A1 的缺口是**没人把这条允许的根接到候选探测上**，不是策略禁止。
3. 实盘对照（本机直读，非推断）：声明库 `D:/All projects/Model library` 有
   `whisper/faster-whisper-large-v3-turbo/`、`sherpa-onnx/sense-voice.tar.bz2` +
   `sherpa-onnx-streaming-zipformer-zh-14M-2023-02-23/`、`Qwen/`、`ggml-org/`、`ollama/blobs`、
   `plain-gguf/`、`ComfyUI/{diffusion_models,text_encoders,vae}`；
   而代码里的候选 ID 是 `ASR_CANDIDATES = ("Systran/faster-whisper-base", "Systran/faster-whisper-tiny")`
   （`model_cache.py:72-75`）与 `MODELSCOPE_CANDIDATES = ("iic/SenseVoiceSmall",)`（`:76-78`）——
   **既不是同一版本，也不是同一布局**，所以库里存在的权重在探测里永远是 `ABSENT`。
4. 后果可测：`ocr_backend_ready()` 实跑返回
   `PP-OCRv6_medium_det/rec、PP-LCNet_x1_0_doc_ori/textline_ori、UVDoc → ABSENT`，
   `ready=False`。OCR 这一项是真的没有（全库 `find` 无 `*OCR*`/`*paddle*`），
   但 ASR 的 `ABSENT` 是**探测根**造成的，不是本机没有。

> 记一条本会话踩过的口径纪律：`ABSENT` 有两种成因——"确实没有"与"没去登记的根看"。
> 把二者都写成 `ABSENT`，就会把 A1 的反面（重复报未安装）从工具侧赶到了模型侧。

## A2「config-only 不就绪」— 成立

五段状态机是显式的，不是含糊 `READY`：`analysis/model_manifest.py:19`
`STAGES = ('ABSENT','METADATA_ONLY','WEIGHTS_COMPLETE','LOAD_VERIFIED','INFERENCE_VERIFIED')`，
`model_manifest.py:154` 在目录存在但无审阅清单位时给 `METADATA_ONLY`，只有清单全中才 `:254` 抬 `WEIGHTS_COMPLETE`；
`readiness/model_radar.py:44` 与 `creative/generative/model_assets.py:28` 各自复制了同一元组
（**三处同义字面量**，属可合并的单一词表候选，此处只记录不改动）。

`analysis/model_cache.py:89-96` 的 OCR 判定要求 det 与 rec **双双** `INFERENCE_VERIFIED`，
且模块 docstring 自我限定 `Structural bytes never imply model inference`。

## A3「ASR 不计 TTS」— 成立，但成立方式是"无从可计"

`model_radar.py:5` 把 TTS 与 ASR 并列为不同能力域，但代码里**没有** `TTS_CANDIDATES`／
`tts_backend_ready`（全仓 `--include=*.py src design-lab/tests` 检索：ASR 只有
`model_cache.py:72/99/101` 与 `test_model_cache.py:72-77`）。
即"ASR 冒充 TTS"这条路径当前**不存在可走的路**，所以不会被违反——这是结构性事实，
不是断言保护。真正的断言在流水线侧：`design-lab/tests/test_media_audio.py:132` 断言
`AUDIO_STAGE_UNSUPPORTED_NO_MEASURED_EVIDENCE` 落在 `plan["blocked_by"]`。

顺带记一处命名与行为相反的坑：`test_model_cache.py:72` 的函数名是
`test_asr_ready_when_any_variant_ready`，但断言是 `assertFalse(asr_backend_ready(p).ready)`
——名字承诺"就绪"，代码证明"字节≠推理"。改名或补一条真正的 ready 用例，别留反义标题。

## A4「仅本机实测可提升推理状态」— 成立（有硬门）

`readiness/model_radar.py:115-116`：任何条目要写 `INFERENCE_VERIFIED`，
`evidence_ref` 必须非空，否则 `ReadinessError(f"{model_id}: INFERENCE_VERIFIED requires a non-empty evidence_ref")`。
`creative/generative/model_assets.py:78` 进一步要求 `LOAD_VERIFIED/INFERENCE_VERIFIED` 才可继续。
账本原文与此一致（`task-ledger-r3.json:1103`「只有本机推理完成且输出校验通过，才 LOCAL_INFERENCE_VERIFIED」）。

---

## 为什么仍然不抬升任何轴

1. **`host_live` 属 `required_axes` 且证据为空**。007 的 `implementation` 句要求"完成 OCR 加载/识别"，
   而 OCR 权重在本机**两个根里都不存在**（声明库 `find` 为空、项目内缓存 `ABSENT`），
   加载/推理从未执行 → 没有合法当期证据。
2. 本轮**没有**把 `doctor` 的默认模式接到模型上：`runtime/doctor.py:193` 默认只 `probe_tools()`，
   模型侧必须 `--model-root` 与 `--model-manifest` **成对**给出（`:156` 的 `parser.error`），
   而仓内**没有**任何库内模型的可审阅清单（检索命中的 5 个 json 是历史需求矩阵/账本自身，不是清单）。
   所以"本机证据接续"卡在清单缺失，而不是探测能力缺失。
3. 007 自身证据仍绑 `2026-09-28` 的 `r5-007-static-unit-20260928`；历史证据不自动提升当前 SHA。

## 抬升 007 所需的最小动作（按序，均可本机脚本化）

1. 给 `ModelCacheProbe` 增加**声明库布局**的只读探测（把 `model_manifest.py:56-62` 已允许的根接进来），
   并让 `probe_*` 的返回值区分 `ABSENT`（两个登记根都查过仍无）与 `NOT_PROBED`（根未接）——
   否则 A1 的模型半边永远写不成立。
2. 让 `doctor` 默认模式输出一条 `model_roots` 段（声明库 + 项目内缓存 + 各自状态），
   使"已登记的模型"和"已登记的软件"一样不再被报成不存在。
3. 为**一个**库内模型建可审阅清单（首选 `whisper/faster-whisper-large-v3-turbo`，
   其上游文件表可得），拿到 `WEIGHTS_COMPLETE` 当期证据；`LOAD_VERIFIED/INFERENCE_VERIFIED`
   需要真跑推理，属需人/需宿主项，**本轮不做**（也不得用字节完整冒充）。
4. 候选 ID 与本机实盘对齐（`faster-whisper-base/tiny` vs 实有 `large-v3-turbo`）——
   改 ID 前先确认它不会把某个 `ABSENT` 静默变成 `PASS`。
5. 三处 `MACHINE_STATES` 字面量若合并，须同时保留 `model_radar.py:115` 的 evidence_ref 硬门。
