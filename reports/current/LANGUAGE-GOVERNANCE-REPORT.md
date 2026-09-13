# Language Governance Report

Subject: `73c861b0986c6c81e29c08ac1ffd3c6326d00c2f`

## Language Governance Report

Language inventory: 1904 tracked files, 15 languages, unmapped extension files: 131.
Language boundary gate verdict: PASS; forbidden language files: 0.
Python owns the runtime; the fixture owns the only Node manifest; Java is scoped to an inert fixture blob; Rust is conditional and absent.
JSON Schema remains the cross-language contract truth: canonical vocabularies are read from the owning schemas and every detected hand-written copy must agree with them.
The copy count is a lower bound measured by a line-level detector; it is not a completeness audit and a fall in the number is not evidence that a copy was lost.