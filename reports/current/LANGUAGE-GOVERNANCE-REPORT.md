# Language Governance Report

Subject: `a279b24e4499536edb49cebd9d855377fc94ce50`

## Language Governance Report

Language inventory: 1891 tracked files, 15 languages, unmapped extension files: 131.
Language boundary gate verdict: PASS; forbidden language files: 0.
Python owns the runtime; the fixture owns the only Node manifest; Java is scoped to an inert fixture blob; Rust is conditional and absent.
JSON Schema remains the cross-language contract truth: canonical vocabularies are read from the owning schemas and every detected hand-written copy must agree with them.
The copy count is a lower bound measured by a line-level detector; it is not a completeness audit and a fall in the number is not evidence that a copy was lost.