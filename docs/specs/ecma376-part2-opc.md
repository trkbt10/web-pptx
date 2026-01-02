# ECMA-376 Part 2: Open Packaging Conventions

Implementation status tables are consolidated in `docs/specs/ecma376-opc.checklist.md`.
## Overview
This document describes Open Packaging Conventions (OPC) as specified in ECMA-376 Part 2, covering package structure, content types, and relationships.

Checklist source: `docs/specs/ecma376-opc.checklist.md`

**Sources:**
- [ECMA-376 Part 2 Specification](https://ecma-international.org/publications-and-standards/standards/ecma-376/)
- [MS-OE376: Office Implementation Information](https://learn.microsoft.com/en-us/openspecs/office_standards/ms-oe376/)

---
## Code Locations

| Feature | File | Function |
|---------|------|----------|
| ZIP reading | `src/pptx/reader/zip-adapter.ts` | Various |
| Content types | `src/pptx/core/content-types.ts` | `parseContentTypes()` |
| Relationships | `src/pptx/core/relationships.ts` | `parseRelationships()` |
| Path utilities | `src/pptx/core/content-types.ts` | `getRelationshipPath()` |

---
## References

1. ECMA-376 Part 2: Open Packaging Conventions
2. [MS-OE376]: Office Implementation Information for ECMA-376 Standards Support
3. [ISO/IEC 29500-2:2012]: Open Packaging Conventions
