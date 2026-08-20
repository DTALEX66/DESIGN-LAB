# Temporary Knowledge Authority Policy

DESIGN-LAB temporarily governs design-knowledge records while ArcheAxis-Knowledge-OS lacks the documented compatible import, readback, rollback, idempotency, and query contract.

Every staged record must set:

- `authorityStatus: temporary-design-lab`
- `targetAuthority: ArcheAxis-Knowledge-OS`
- `migrationStatus: deferred`

No process may copy an original PSD, AI, INDD, video, font, client file, account data, or absolute asset path into Git. Candidate and quarantine records are prohibited from runtime production use. A real OS migration requires an explicit future user approval after its trigger gate is met.
