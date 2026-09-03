/* SPDX-License-Identifier: MIT */
/* DESIGN-LAB bounded UXP entrypoint: all document changes are modal and job-bound. */
const { app, core } = require("photoshop");

function assertRunRelative(job) {
  if (!job || typeof job.runRoot !== "string" || !job.runRoot) throw new Error("missing run root");
  if (!Array.isArray(job.layers)) throw new Error("missing layer job payload");
}

async function prepareRunRelativeLayers(hostApp, job) {
  assertRunRelative(job);
  // DOM-first preparation is intentionally deferred until a host job and local output tokens are supplied.
  // No document is opened, saved, or modified by this structural adapter alone.
  return { status: "NOT_EXECUTED", documents: hostApp.documents.length };
}

async function executeJob(job) {
  return await core.executeAsModal(async (executionContext) => {
    if (executionContext.isCancelled) throw new Error("cancelled");
    return await prepareRunRelativeLayers(app, job);
  }, { commandName: "DESIGN-LAB Reconstruction Layer Preparation" });
}

module.exports = { executeJob, prepareRunRelativeLayers };
