// SPDX-License-Identifier: MIT
// DESIGN-LAB Workbench — product entry (Lane-C split of the D002 monolith). Owns only
// the mount guard; all behavior + handler wiring lives in the workbench/design/shell
// modules. Vite inlines them into ONE flat classic-script bundle (D003 Build Output
// Truth / D004 classic-script loadability): `export let` state emits as bare top-level
// globals so the native-UI vm contract tests keep driving the bundle. Entry module has
// no exports, so the emitted bundle keeps ZERO top-level import/export.

import { byId, errMsg, setStatus } from './workbench.js';
import { bindDesignSystem, submitBrief, submitBriefRevision, submitDirection, submitDirectionRevision } from './design.js';
import { mountAppShell } from './shell.js';

byId<HTMLFormElement>('design-brief-form').onsubmit = (event) => {
  event.preventDefault();
  void submitBrief().catch((e) => setStatus(errMsg(e), true));
};
byId<HTMLFormElement>('brief-revision-form').onsubmit = (event) => {
  event.preventDefault();
  void submitBriefRevision().catch((e) => setStatus(errMsg(e), true));
};
byId<HTMLFormElement>('direction-revision-form').onsubmit = (event) => {
  event.preventDefault();
  void submitDirectionRevision().catch((e) => setStatus(errMsg(e), true));
};
byId<HTMLFormElement>('design-direction-form').onsubmit = (event) => {
  event.preventDefault();
  void submitDirection().catch((e) => setStatus(errMsg(e), true));
};
byId<HTMLButtonElement>('design-system-bind').onclick = () => {
  void bindDesignSystem().catch((e) => setStatus(errMsg(e), true));
};

if (typeof document !== 'undefined'
    && document.body !== undefined
    && typeof window !== 'undefined'
    && document.getElementById('login') !== null
    && (document as Document & { __dlShellMounted?: boolean }).__dlShellMounted !== true) {
  (document as Document & { __dlShellMounted?: boolean }).__dlShellMounted = true;
  mountAppShell();
}
