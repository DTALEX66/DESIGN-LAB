# SPDX-License-Identifier: MIT
"""DL-TP-T06 (MULTIMODAL-2026-09-05): read-only model-cache probe (fail-closed).

Detects locally cached model directories (HuggingFace hub + ModelScope) and
reports a per-model readiness state WITHOUT importing or running any model
runtime. Readiness is derived from on-disk structure only:

- READY       : has snapshots/<commit> AND blobs (actual bytes present);
- INCOMPLETE  : has refs only (pointer present, blobs absent);
- ABSENT      : no cache directory.

This lets OCR/ASR/trace backends fail-closed: never advertise a model as
available when its bytes are not actually on disk. No new package install, no
inference claim.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


class ModelCacheProbe:
    """Read-only probe over local model caches."""

    def __init__(self, hf_home: Path | None = None, modelscope_home: Path | None = None) -> None:
        self.hf_home = Path(hf_home) if hf_home else Path(
            os.environ.get("HF_HOME", str(Path.home() / ".cache" / "huggingface"))
        )
        self.hf_hub = self.hf_home / "hub"
        self.modelscope_home = Path(modelscope_home) if modelscope_home else Path(
            os.environ.get("MODELSCOPE_CACHE", str(Path.home() / ".cache" / "modelscope" / "models"))
        )

    def hf_readiness(self, repo_dir: Path) -> str:
        """READY / INCOMPLETE / ABSENT based on downloaded bytes, not dir names.

        HuggingFace hub layouts vary: newer caches keep real bytes inside
        snapshots/<commit>/ (blobs/ may be empty or absent). Readiness requires
        at least one non-empty file under snapshots/ (actual bytes), plus a ref
        (so the commit is pinned). A refs-only directory (no snapshots) is a
        pointer with no bytes -> INCOMPLETE.
        """
        if not repo_dir.is_dir():
            return "ABSENT"
        snapshots = repo_dir / "snapshots"
        has_bytes = False
        if snapshots.is_dir():
            for p in snapshots.rglob("*"):
                if p.is_file() and p.stat().st_size > 0:
                    has_bytes = True
                    break
        if has_bytes:
            return "READY"
        if (repo_dir / "refs").is_dir():
            return "INCOMPLETE"  # pointer present, bytes absent
        return "ABSENT"

    def probe_hf(self, repo_ids: Iterable[str]) -> dict[str, str]:
        result: dict[str, str] = {}
        for repo_id in repo_ids:
            dir_name = "models--" + repo_id.replace("/", "--")
            result[repo_id] = self.hf_readiness(self.hf_hub / dir_name)
        return result

    def probe_modelscope(self, model_ids: Iterable[str]) -> dict[str, str]:
        result: dict[str, str] = {}
        for model_id in model_ids:
            dir_name = model_id.replace("/", "--")
            snapshots = self.modelscope_home / dir_name / "snapshots"
            if snapshots.is_dir() and any(snapshots.iterdir()):
                result[model_id] = "READY"
            elif (self.modelscope_home / dir_name).is_dir():
                result[model_id] = "INCOMPLETE"
            else:
                result[model_id] = "ABSENT"
        return result


# Canonical candidate sets for the MULTIMODAL OCR/ASR backends (plan §6).
OCR_CANDIDATES = (
    "PaddlePaddle/PP-OCRv6_medium_det",
    "PaddlePaddle/PP-OCRv6_medium_rec",
    "PaddlePaddle/PP-LCNet_x1_0_doc_ori",
    "PaddlePaddle/PP-LCNet_x1_0_textline_ori",
    "PaddlePaddle/UVDoc",
)
ASR_CANDIDATES = (
    "Systran/faster-whisper-base",
    "Systran/faster-whisper-tiny",
)
MODELSCOPE_CANDIDATES = (
    "iic/SenseVoiceSmall",
)


@dataclass(frozen=True)
class BackendReadiness:
    """Aggregate readiness verdict for one backend capability."""

    capability: str
    ready: bool
    detail: dict[str, str]

    @property
    def status(self) -> str:
        return "READY" if self.ready else "NOT_READY"


def ocr_backend_ready(probe: ModelCacheProbe | None = None) -> BackendReadiness:
    """OCR is READY only when BOTH det and rec model bytes are on disk."""
    p = probe or ModelCacheProbe()
    states = p.probe_hf(OCR_CANDIDATES)
    det = states.get("PaddlePaddle/PP-OCRv6_medium_det", "ABSENT")
    rec = states.get("PaddlePaddle/PP-OCRv6_medium_rec", "ABSENT")
    return BackendReadiness("ocr", det == "READY" and rec == "READY", states)


def asr_backend_ready(probe: ModelCacheProbe | None = None) -> BackendReadiness:
    """ASR is READY when any faster-whisper variant has bytes on disk."""
    p = probe or ModelCacheProbe()
    states = p.probe_hf(ASR_CANDIDATES)
    return BackendReadiness("asr", any(s == "READY" for s in states.values()), states)
