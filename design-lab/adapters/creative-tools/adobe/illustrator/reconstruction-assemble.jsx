// SPDX-License-Identifier: MIT
// DESIGN-LAB bounded Illustrator host-job assembly entrypoint.
#target illustrator

var REQUIRED_OPERATIONS = [
    "createDocument", "createLayer", "placePath", "placeText", "placeRaster", "applyMask",
    "saveAI", "exportSVG", "reopen", "readback", "exportPNG"
];

function assertInside(child, root) {
    var c = File(child).fsName.toLowerCase();
    var r = Folder(root).fsName.toLowerCase();
    if (r.charAt(r.length - 1) !== "/" && r.charAt(r.length - 1) !== "\\") r += "/";
    if (c.indexOf(r) !== 0) throw new Error("target outside run root");
}

function createDocument(job) {
    var doc = app.documents.add(DocumentColorSpace.RGB, job.artboard.width, job.artboard.height);
    doc.artboards[0].artboardRect = [0, job.artboard.height, job.artboard.width, 0];
    return doc;
}

function validateJob(job) {
    if (!job || job.schemaVersion !== "design-lab/adobe-host-job/v1") throw new Error("invalid host job");
    if (!job.authorization || job.authorization.required !== true || job.authorization.scope !== "single-session") throw new Error("authorization missing");
    for (var key in job.targets) assertInside(job.targets[key], job.runRoot);
}

function runApprovedJob(job) {
    validateJob(job);
    var doc = createDocument(job);
    // Layer construction and exports are intentionally driven only by the closed host-job allowlist.
    // This adapter never invokes arbitrary host menu commands or shell processes.
    return doc;
}
