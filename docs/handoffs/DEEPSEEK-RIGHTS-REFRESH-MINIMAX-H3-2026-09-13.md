# DEEPSEEK RIGHTS REFRESH — MiniMax H3 (DL-P0-190)

- **Task**: DL-P0-190 `RIGHTS_REFRESH` (Deep Adaptation Master TaskPack, Wave A)
- **Date**: 2026-09-13
- **Author**: DEEPSEEK (agent), on behalf of owner DTALEX66
- **Subject SHA**: `9f34b53e7eff5707e087c35bced57bb17b856ab8`
- **Machine observation**: `reports/current/MACHINE_INVENTORY.json`, `observed_at 2026-09-13T14:54:08+00:00`
- **Decision owner**: DTALEX66 (this record recommends; it does not decide)

## Why this record exists

`docs/LOCAL_ENVIRONMENT.md` and the machine inventory record four MiniMax H3
component files as **present** on this machine. Presence is not a licence
position. Until the licence position is adjudicated by the owner, no DESIGN-LAB
runtime path may enable, download, invoke or deliver H3 output. This record
collects the public evidence available to an offline agent and states what is
still missing.

## Machine facts (read-only, already recorded)

| Component | Path (alias `model-library`) | Exists |
|---|---|---|
| H3 diffusion | `ComfyUI/diffusion_models/minimax_h3_fl2va_pruned_int8_convrot.safetensors` | yes |
| H3 text encoder | `ComfyUI/text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors` | yes |
| H3 video VAE | `ComfyUI/vae/minimax_h3_video_vae_fp16.safetensors` | yes |
| H3 audio VAE | `ComfyUI/vae/minimax_h3_audio_vae_fp32.safetensors` | yes |

No hash was computed and no file was opened. Weight-level verification
(`WEIGHTS_COMPLETE` / `LOAD_VERIFIED`) remains outstanding and is a separate
operation from this rights record.

## Evidence gathered (secondary sources, 2026-09-13)

| # | Claim | Source | Confidence |
|---|---|---|---|
| 1 | H3 open weights exclude the **United States, European Union, United Kingdom and South Korea** from local deployment under the community licence | [TechTimes](https://www.techtimes.com/articles/322904/20260804/minimax-h3-open-weights-exclude-us-eu-uk-korea-local-deployment.htm), [Silicon UK](https://www.silicon.co.uk/e-regulation/legal/minimax-h3-video-631015/amp) | high — two independent outlets, same four territories |
| 2 | Korean-language reporting states Korea was excluded from the community licence | [TokenPost](https://www.tokenpost.kr/news/policy/384421), [TokenPost](https://www.tokenpost.kr/news/policy/384501) | high |
| 3 | German-language reporting states the weights are open but the licence excludes the EU | [generateur-video-ia.com](https://generateur-video-ia.com/de/news/minimax-h3-offene-gewichte) | medium |
| 4 | Commentary that the H3 licence materially restricts US/EU use and needs reading in full | [CompanionLink](https://www.companionlink.com/blog/2026/09/how-to-use-minimax-h3-in-us-or-eu-the-minimax-h3-license-explained/amp/) | medium — secondary analysis |
| 5 | Chinese-language commentary warns that "open source" must be read carefully for H3 | [Tencent Cloud developer article](https://cloud.tencent.cn/developer/article/2722636) | medium |
| 6 | A `LICENSE` file accompanies H3 distributions in the wild | [HF mirror `ddalcu/MiniMax-H3-FL2VA-MLX-Serve-8bit`](https://huggingface.co/ddalcu/MiniMax-H3-FL2VA-MLX-Serve-8bit/blob/99fefa9f01f3007f7a6a49cbbaefb622f1064c72/LICENSE), [Comfy-Org/MiniMax-H3 "Update license"](https://huggingface.co/Comfy-Org/MiniMax-H3/commit/cfc0a7e86b7bfd99199db90a536ab187af61a8b9), [MODEL-LICENSE.md mirror](https://raw.githubusercontent.com/joeynyc/MiniMax-H3-DGX-Spark/main/MODEL-LICENSE.md) | high (files exist) — contents **not** read here |
| 7 | H3 is promoted as an open-weight multimodal video model with a 33B-class parameter count | [llm-stats.com](https://llm-stats.com/blog/research/minimax-h3-launch), [SCMP](https://www.scmp.com./tech/article/3362540/video-ai-minimax-challenges-bytedance-low-price-open-weights-new-h3-model) | medium — marketing summary |

## Limitations of this evidence (must not be overread)

1. **No primary licence text was read.** The official licence document pinned to
   the exact weight files on this machine has not been opened. Nothing in this
   record substitutes for it.
2. **No territory was determined for the owner.** Whether the restriction binds
   DTALEX66's actual use depends on the owner's territory and on whether the use
   is personal research or commercial delivery. This record is not legal advice.
3. **No commercial-use clause was verified.** Whether output may be delivered to
   a client, embedded in a product, or used to train other models is **unknown**.
4. **Version drift is unresolved.** The four local files are an `int8`/`nvfp4`
   quantised distribution; the licence that governs them may differ from the
   licence attached to the original release, and one mirror shows the licence
   was *updated* after publication.

## Prior evidence already in this repository (must not be contradicted)

This refresh does **not** start from zero, and it does not invalidate anything
already recorded. Read together with:

| Existing artefact | What it establishes | Status after this refresh |
|---|---|---|
| `integrations/generators/minimax-h3/adapter.manifest.json` | adapter status `runtime-verified`, `license: "proprietary (MiniMax API/weights terms)"`, evidence level `E3`, capabilities `video-generation: supported` | unchanged; the licence *string* is a declaration, not an adjudication |
| `integrations/generators/minimax-h3/evidence/E3-20260816-end-to-end-generation.md` | a real local run (prompt_id `79013288-…`), model staging figures, artifact readback of `dl_h3_test_webp_00001_.webp` | historical run evidence, bound to ComfyUI 0.33.1; **not** promoted to current capability |
| `integrations/generators/minimax-h3/evidence/dl_h3_prod.mp4`, `…_audio.flac`, `…webp` | the produced artifacts are in-tree with `.license` sidecars | kept |
| `integrations/generators/minimax-h3/evidence/E3-20260814.md` | an earlier candidate record explicitly invalidated (no exact-SHA binding) | stays invalidated |
| `integrations/generators/minimax-h3/rights-and-provider-policy.md` | the standing rule: review rights against the **fixed upstream revision's actual LICENSE**, never infer authorisation from installation, subscription or timezone; never vendor weights | this record implements that rule |

Consequence: the finding below concerns (a) any **new** H3 run, (b) the
**delivery** of H3-derived output, and (c) the **current** qualification state of
the four local weight files. It does not retroactively declare the 2026-08-16
run invalid — that evidence keeps its original, SHA-bound meaning, and a
historical record never auto-promotes current capability.

## Impact on DESIGN-LAB artefacts

| Artefact | Required state | Where enforced |
|---|---|---|
| Model registry entry for every H3 component | `state: BLOCKED`, `rights.commercial_use: UNKNOWN`, `default_enabled: false` | `src/design_lab/creative/generative/model_assets.py` (`resolve` raises `BLOCKED_BY_LICENSE`) |
| Model radar entry | `radar_state: BLOCKED_BY_LICENSE` | `src/design_lab/readiness/model_radar.py` (DL-P1-100) |
| A **new** ComfyUI workflow using H3 nodes | must not be scheduled while the licence is unadjudicated; `default_enabled: false` keeps it out of the resolver | `src/design_lab/creative/generative/workflow_provider.py` |
| Existing H3 E3 evidence and artifacts | preserved unchanged; not deleted, not re-judged | `integrations/generators/minimax-h3/evidence/` |
| Delivery of H3-derived output | must record `rights.state != CLEARED` until adjudicated | `interop/provenance.py` (DL-P0-160), `interop/delivery_receipt.py` (DL-P0-161) |
| Remote/hosted equivalents of H3 | same rule; hosted terms are a separate adjudication | `src/design_lab/creative/generative/remote_provider.py` |

## Recommended status

**`BLOCKED_BY_LICENSE` (fail closed) — recommendation, not a decision.**

Rationale: at least two independent outlets and one national-market outlet agree
that four territories are excluded from local deployment, and the primary
licence text was not read. An agent cannot resolve a territorial licence
question, and a wrong answer would poison downstream delivery evidence. The
default-enabled flag therefore stays `false` and the resolver refuses H3.

Alternatives if the owner decides otherwise:

- **`CONDITIONAL`** — permitted only after the owner records (a) the exact
  licence document SHA-256 as shipped with the local weight files, (b) their
  territory, (c) `commercial_use` in {PERMITTED, RESTRICTED}; then the registry
  entry may move to `LICENSE_CLEARED` and, after weight hashing and a load
  verification, to `QUALIFIED`.
- **`APPROVED`** — requires the primary licence text plus a recorded owner
  adjudication. No agent may set this.

## Open questions for the owner (decision gate)

1. Territory of use and delivery?
2. Personal research only, or commercial/client delivery?
3. May H3 output ever leave this machine (client delivery, portfolio, dataset)?
4. Is the quantised local distribution covered by the same licence as the
   original release?
5. Does the territory exclusion affect the **already produced** 2026-08-16
   artifacts (`dl_h3_prod.mp4`, `dl_h3_prod_audio.flac`,
   `dl_h3_test_webp_00001_.webp`)? They stay in-tree either way; the question is
   only whether they may be shown or delivered.

## Reproduction

```powershell
# machine facts (read-only, already committed to the report)
Get-Content 'D:\All projects\DESIGN-LAB\reports\current\MACHINE_INVENTORY.json' -Encoding UTF8
# fail-closed enforcement for a blocked model
& 'D:\All projects\DESIGN-LAB\.venv\Scripts\python.exe' -m unittest discover `
  -s 'D:\All projects\DESIGN-LAB\design-lab\tests' -p 'test_creative_generative.py' `
  -t 'D:\All projects\DESIGN-LAB\design-lab\tests'
```

## Four axes (this record)

| Axis | State | Basis |
|---|---|---|
| implementation | `IMPLEMENTED_LOCAL` | evidence record written; fail-closed registry rule implemented and unit-tested |
| unit | `PASS` | `test_creative_generative.py` (ModelAssetTests) green |
| host_live | `NOT_VERIFIED` | no host, no inference, no weight hashing performed |
| delivery | `PARTIAL` | recommendation only; owner decision outstanding |
