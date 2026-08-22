const { entrypoints } = require("uxp");

const REQUIRED_STAGES = ["create", "save", "reopen-readback", "export-preview", "restore-readback"];

function validateJob(job) {
  if (!job || job.schemaVersion !== "design-lab/adobe-fixture-job/v1") {
    throw new Error("Unsupported fixture job schema.");
  }
  if (!Number.isInteger(job.canvas?.width) || !Number.isInteger(job.canvas?.height)) {
    throw new Error("Fixture canvas dimensions must be integer pixels.");
  }
  if (job.canvas.width !== 1920 || job.canvas.height !== 1080) {
    throw new Error("Only the approved 1920x1080 fixture is supported.");
  }
  if (job.repetitions !== 3) {
    throw new Error("Fixture evidence requires exactly three repetitions.");
  }
  const missingStages = REQUIRED_STAGES.filter((stage) => !job.requiredStages?.includes(stage));
  if (missingStages.length) {
    throw new Error(`Fixture job omits required stages: ${missingStages.join(", ")}`);
  }
  return {
    schemaVersion: job.schemaVersion,
    taskId: job.taskId,
    canvas: job.canvas,
    repetitions: job.repetitions,
    requiredStages: REQUIRED_STAGES,
  };
}

// This command intentionally validates only. Host mutation and filesystem output
// stay disabled until a user explicitly grants a project-local output folder in
// the UXP permission prompt and the E3 fixture semantics are implemented/tested.
entrypoints.setup({
  commands: {
    validateFixtureJob: () => {
      const fixtureJob = {
        schemaVersion: "design-lab/adobe-fixture-job/v1",
        taskId: "DL-ADB-PS-E3-FIXTURE",
        canvas: { width: 1920, height: 1080 },
        repetitions: 3,
        requiredStages: REQUIRED_STAGES,
      };
      const validated = validateJob(fixtureJob);
      console.log(JSON.stringify({ result: "VALID", job: validated }));
      return validated;
    },
  },
});

module.exports = { validateJob };
