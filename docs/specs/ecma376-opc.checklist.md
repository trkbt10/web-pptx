# ECMA-376 Part 2: Open Packaging Conventions チェックリスト（章／節ベース）

このチェックリストは ECMA-376 の公式 PDF（章／節の見出し）から抽出したものです。
各項目は章番号・節名・参照ページ（判読できたもの）を保持し、網羅度測定のベースラインとして利用できます。

参照PDF: `reference/ecma376/ecma-376-2/Ecma Office Open XML Part 2 - Open Packaging Conventions.pdf`

## Checklist

### 1 Scope — p.1

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 1 Scope | [x] | - | Spec: ECMA-376-2 1 p.1 (spec only) |

### 2 Normative references — p.2

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 2 Normative references | [x] | - | Spec: ECMA-376-2 2 p.2 (spec only) |

### 3 Terms and definitions — p.4

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 3 Terms and definitions | [x] | - | Spec: ECMA-376-2 3 p.4 (spec only) |

### 4 Conformance — p.8

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 4 Conformance | [x] | - | Spec: ECMA-376-2 4 p.8 (spec only) |

### 5 Overview — p.9

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 5 Overview | [x] | - | Spec: ECMA-376-2 5 p.9 (spec only) |

### 6 Abstract package model — p.10

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 6 Abstract package model | [ ] | - | Spec: ECMA-376-2 6 p.10 (not implemented: no abstract OPC validation) |

### 6.1 General — p.10

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 6.1 General | [ ] | - | Spec: ECMA-376-2 6.1 p.10 (not implemented) |

### 6.2 Parts — p.10

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 6.2 Parts | [ ] | - | Spec: ECMA-376-2 6.2 p.10 (not implemented) |

### 6.2.1 General — p.10

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 6.2.1 General | [ ] | - | Spec: ECMA-376-2 6.2.1 p.10 (not implemented) |

### 6.2.2 Part names — p.10

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 6.2.2 Part names | [x] | src/pptx/core/content-types.ts, src/xml/string-utils.ts | Spec: ECMA-376-2 6.2.2 p.10 |

### 6.2.3 Media types — p.12

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 6.2.3 Media types | [x] | src/pptx/core/content-types.ts | Spec: ECMA-376-2 6.2.3 p.12 |

### 6.2.4 Growth hint — p.12

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 6.2.4 Growth hint | [ ] | - | Spec: ECMA-376-2 6.2.4 p.12 (not implemented) |

### 6.2.5 XML usage — p.12

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 6.2.5 XML usage | [ ] | - | Spec: ECMA-376-2 6.2.5 p.12 (not implemented) |

### 6.3 Part addressing — p.13

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 6.3 Part addressing | [x] | src/pptx/opc/pack-uri.ts, src/pptx/opc/part-name.ts | Spec: ECMA-376-2 6.3 p.13 |

### 6.3.1 General — p.13

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 6.3.1 General | [x] | src/pptx/opc/pack-uri.ts | Spec: ECMA-376-2 6.3.1 p.13 |

### 6.3.2 Pack scheme — p.13

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 6.3.2 Pack scheme | [x] | src/pptx/opc/pack-uri.ts | Spec: ECMA-376-2 6.3.2 p.13 |

### 6.3.3 Resolving a pack IRI to a resource — p.14

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 6.3.3 Resolving a pack IRI to a resource | [x] | src/pptx/opc/pack-uri.ts | Spec: ECMA-376-2 6.3.3 p.14 |

### 6.3.4 Composing a pack IRI — p.15

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 6.3.4 Composing a pack IRI | [x] | src/pptx/opc/pack-uri.ts | Spec: ECMA-376-2 6.3.4 p.15 |

### 6.3.5 Equivalence — p.16

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 6.3.5 Equivalence | [x] | src/pptx/opc/pack-uri.ts, src/pptx/opc/part-name.ts | Spec: ECMA-376-2 6.3.5 p.16 |

### 6.4 Resolving relative references — p.16

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 6.4 Resolving relative references | [x] | src/xml/string-utils.ts, src/pptx/core/relationships.ts | Spec: ECMA-376-2 6.4 p.16 |

### 6.4.1 General — p.16

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 6.4.1 General | [x] | src/xml/string-utils.ts, src/pptx/core/relationships.ts | Spec: ECMA-376-2 6.4.1 p.16 |

### 6.4.2 Base IRIs — p.16

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 6.4.2 Base IRIs | [x] | src/pptx/opc/pack-uri.ts | Spec: ECMA-376-2 6.4.2 p.16 |

### 6.4.3 Examples — p.17

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 6.4.3 Examples | [x] | - | Spec: ECMA-376-2 6.4.3 p.17 (spec example only) |

### 6.5 Relationships — p.19

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 6.5 Relationships | [x] | src/pptx/core/relationships.ts, src/pptx/reader/xml-reader.ts | Spec: ECMA-376-2 6.5 p.19 |

### 6.5.1 General — p.19

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 6.5.1 General | [x] | src/pptx/core/relationships.ts, src/pptx/reader/xml-reader.ts | Spec: ECMA-376-2 6.5.1 p.19 |

### 6.5.2 Relationships part — p.20

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 6.5.2 Relationships part | [x] | src/pptx/core/content-types.ts, src/pptx/reader/xml-reader.ts | Spec: ECMA-376-2 6.5.2 p.20 |

### 6.5.3 Relationship markup — p.21

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 6.5.3 Relationship markup | [x] | src/pptx/core/relationships.ts | Spec: ECMA-376-2 6.5.3 p.21 |

### 6.5.4 Examples — p.23

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 6.5.4 Examples | [x] | - | Spec: ECMA-376-2 6.5.4 p.23 (spec example only) |

### 7 Physical package model — p.27

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 7 Physical package model | [ ] | - | Spec: ECMA-376-2 7 p.27 (not implemented; relies on ZIP library) |

### 7.1 General — p.27

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 7.1 General | [ ] | - | Spec: ECMA-376-2 7.1 p.27 (not implemented) |

### 7.2 Physical mapping guidelines — p.27

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 7.2 Physical mapping guidelines | [ ] | - | Spec: ECMA-376-2 7.2 p.27 (not implemented) |

### 7.2.1 Using features of physical formats — p.27

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 7.2.1 Using features of physical formats | [ ] | - | Spec: ECMA-376-2 7.2.1 p.27 (not implemented) |

### 7.2.2 Mapped components — p.27

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 7.2.2 Mapped components | [ ] | - | Spec: ECMA-376-2 7.2.2 p.27 (not implemented) |

### 7.2.3 Mapping media types to parts — p.27

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 7.2.3 Mapping media types to parts | [ ] | - | Spec: ECMA-376-2 7.2.3 p.27 (not implemented) |

### 7.2.4 Interleaving — p.31

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 7.2.4 Interleaving | [ ] | - | Spec: ECMA-376-2 7.2.4 p.31 (not implemented) |

### 7.2.5 Mapping part names to physical package item names — p.32

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 7.2.5 Mapping part names to physical package item names | [ ] | - | Spec: ECMA-376-2 7.2.5 p.32 (not implemented) |

### 7.3 Mapping to a ZIP file — p.33

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 7.3 Mapping to a ZIP file | [ ] | - | Spec: ECMA-376-2 7.3 p.33 (read-only via JSZip; no validation) |

### 7.3.1 General — p.33

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 7.3.1 General | [ ] | - | Spec: ECMA-376-2 7.3.1 p.33 (not implemented) |

### 7.3.2 Mapping part data — p.34

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 7.3.2 Mapping part data | [ ] | - | Spec: ECMA-376-2 7.3.2 p.34 (not implemented) |

### 7.3.3 ZIP item names — p.34

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 7.3.3 ZIP item names | [ ] | - | Spec: ECMA-376-2 7.3.3 p.34 (not implemented) |

### 7.3.4 Mapping logical item names to ZIP item names — p.34

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 7.3.4 Mapping logical item names to ZIP item names | [ ] | - | Spec: ECMA-376-2 7.3.4 p.34 (not implemented) |

### 7.3.5 Mapping ZIP item names to logical item names — p.35

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 7.3.5 Mapping ZIP item names to logical item names | [ ] | - | Spec: ECMA-376-2 7.3.5 p.35 (not implemented) |

### 7.3.6 ZIP package limitations — p.35

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 7.3.6 ZIP package limitations | [ ] | - | Spec: ECMA-376-2 7.3.6 p.35 (not implemented) |

### 7.3.7 Mapping the Media Types stream — p.35

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 7.3.7 Mapping the Media Types stream | [ ] | - | Spec: ECMA-376-2 7.3.7 p.35 (not implemented) |

### 7.3.8 Mapping the growth hint — p.36

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 7.3.8 Mapping the growth hint | [ ] | - | Spec: ECMA-376-2 7.3.8 p.36 (not implemented) |

### 8 Core properties — p.37

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 8 Core properties | [ ] | - | Spec: ECMA-376-2 8 p.37 (not implemented) |

### 8.1 General — p.37

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 8.1 General | [ ] | - | Spec: ECMA-376-2 8.1 p.37 (not implemented) |

### 8.2 Core Properties part — p.38

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 8.2 Core Properties part | [ ] | - | Spec: ECMA-376-2 8.2 p.38 (not implemented) |

### 8.3 Core properties markup — p.38

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 8.3 Core properties markup | [ ] | - | Spec: ECMA-376-2 8.3 p.38 (not implemented) |

### 8.3.1 General — p.38

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 8.3.1 General | [ ] | - | Spec: ECMA-376-2 8.3.1 p.38 (not implemented) |

### 8.3.2 Support for versioning and extensibility — p.39

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 8.3.2 Support for versioning and extensibility | [ ] | - | Spec: ECMA-376-2 8.3.2 p.39 (not implemented) |

### 8.3.3 coreProperties element — p.39

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 8.3.3 coreProperties element | [ ] | - | Spec: ECMA-376-2 8.3.3 p.39 (not implemented) |

### 8.3.4 Core property elements — p.39

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 8.3.4 Core property elements | [ ] | - | Spec: ECMA-376-2 8.3.4 p.39 (not implemented) |

### 9 Thumbnails — p.44

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 9 Thumbnails | [x] | src/pptx/presentation.ts, src/pptx/presentation.spec.ts | Spec: ECMA-376-2 9 p.44 |

### 10 Digital signatures — p.45

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10 Digital signatures | [ ] | - | Spec: ECMA-376-2 10 p.45 (not implemented) |

### 10.1 General — p.45

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.1 General | [ ] | - | Spec: ECMA-376-2 10.1 p.45 (not implemented) |

### 10.3 Choosing content to sign — p.45

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.3 Choosing content to sign | [ ] | - | Spec: ECMA-376-2 10.3 p.45 (not implemented) |

### 10.4 Digital signature parts — p.45

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.4 Digital signature parts | [ ] | - | Spec: ECMA-376-2 10.4 p.45 (not implemented) |

### 10.4.1 General — p.45

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.4.1 General | [ ] | - | Spec: ECMA-376-2 10.4.1 p.45 (not implemented) |

### 10.4.2 Digital Signature Origin part — p.46

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.4.2 Digital Signature Origin part | [ ] | - | Spec: ECMA-376-2 10.4.2 p.46 (not implemented) |

### 10.4.3 Digital Signature XML Signature part — p.46

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.4.3 Digital Signature XML Signature part | [ ] | - | Spec: ECMA-376-2 10.4.3 p.46 (not implemented) |

### 10.4.4 Digital Signature Certificate part — p.46

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.4.4 Digital Signature Certificate part | [ ] | - | Spec: ECMA-376-2 10.4.4 p.46 (not implemented) |

### 10.5 Digital signature markup — p.47

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.5 Digital signature markup | [ ] | - | Spec: ECMA-376-2 10.5 p.47 (not implemented) |

### 10.5.1 General — p.47

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.5.1 General | [ ] | - | Spec: ECMA-376-2 10.5.1 p.47 (not implemented) |

### 10.5.2 Support for versioning and extensibility — p.47

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.5.2 Support for versioning and extensibility | [ ] | - | Spec: ECMA-376-2 10.5.2 p.47 (not implemented) |

### 10.5.3 Signature element — p.47

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.5.3 Signature element | [ ] | - | Spec: ECMA-376-2 10.5.3 p.47 (not implemented) |

### 10.5.4 SignedInfo element — p.48

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.5.4 SignedInfo element | [ ] | - | Spec: ECMA-376-2 10.5.4 p.48 (not implemented) |

### 10.5.5 CanonicalizationMethod element — p.48

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.5.5 CanonicalizationMethod element | [ ] | - | Spec: ECMA-376-2 10.5.5 p.48 (not implemented) |

### 10.5.6 SignatureMethod element — p.48

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.5.6 SignatureMethod element | [ ] | - | Spec: ECMA-376-2 10.5.6 p.48 (not implemented) |

### 10.5.7 Reference element — p.49

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.5.7 Reference element | [ ] | - | Spec: ECMA-376-2 10.5.7 p.49 (not implemented) |

### 10.5.8 Transform element — p.49

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.5.8 Transform element | [ ] | - | Spec: ECMA-376-2 10.5.8 p.49 (not implemented) |

### 10.5.9 RelationshipReference element — p.50

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.5.9 RelationshipReference element | [ ] | - | Spec: ECMA-376-2 10.5.9 p.50 (not implemented) |

### 10.5.10 RelationshipsGroupReference element — p.50

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.5.10 RelationshipsGroupReference element | [ ] | - | Spec: ECMA-376-2 10.5.10 p.50 (not implemented) |

### 10.5.11 DigestMethod element — p.51

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.5.11 DigestMethod element | [ ] | - | Spec: ECMA-376-2 10.5.11 p.51 (not implemented) |

### 10.5.12 Object element — p.51

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.5.12 Object element | [ ] | - | Spec: ECMA-376-2 10.5.12 p.51 (not implemented) |

### 10.5.13 Manifest element — p.51

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.5.13 Manifest element | [ ] | - | Spec: ECMA-376-2 10.5.13 p.51 (not implemented) |

### 10.5.14 SignatureProperty element — p.52

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.5.14 SignatureProperty element | [ ] | - | Spec: ECMA-376-2 10.5.14 p.52 (not implemented) |

### 10.5.15 SignatureTime element — p.52

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.5.15 SignatureTime element | [ ] | - | Spec: ECMA-376-2 10.5.15 p.52 (not implemented) |

### 10.5.16 Format element — p.52

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.5.16 Format element | [ ] | - | Spec: ECMA-376-2 10.5.16 p.52 (not implemented) |

### 10.5.17 Value element — p.52

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.5.17 Value element | [ ] | - | Spec: ECMA-376-2 10.5.17 p.52 (not implemented) |

### 10.5.18 XPath element — p.52

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.5.18 XPath element | [ ] | - | Spec: ECMA-376-2 10.5.18 p.52 (not implemented) |

### 10.6 Relationships transform algorithm — p.52

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.6 Relationships transform algorithm | [ ] | - | Spec: ECMA-376-2 10.6 p.52 (not implemented) |

### 10.7 Digital signature example — p.54

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.7 Digital signature example | [x] | - | Spec: ECMA-376-2 10.7 p.54 (spec example only) |

### 10.8 Generating signatures — p.56

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.8 Generating signatures | [ ] | - | Spec: ECMA-376-2 10.8 p.56 (not implemented) |

### 10.9 Validating signatures — p.58

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| 10.9 Validating signatures | [ ] | - | Spec: ECMA-376-2 10.9 p.58 (not implemented) |

### Annex A (informative) Preprocessing for generating relative references — p.61

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| Annex A (informative) Preprocessing for generating relative references | [x] | - | Spec: ECMA-376-2 Annex A p.61 (informative) |

### Annex B (normative) Constraints and clarifications on the use of ZIP features — p.63

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| Annex B (normative) Constraints and clarifications on the use of ZIP features | [ ] | - | Spec: ECMA-376-2 Annex B p.63 (not implemented) |

### Annex C (normative) Schemas - W3C XML — p.74

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| Annex C (normative) Schemas - W3C XML | [x] | - | Spec: ECMA-376-2 Annex C p.74 (schemas reference only) |

### Annex D (informative) Schemas - RELAX NG — p.75

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| Annex D (informative) Schemas - RELAX NG | [x] | - | Spec: ECMA-376-2 Annex D p.75 (informative) |

### Annex E (normative) Standard namespaces and media types — p.76

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| Annex E (normative) Standard namespaces and media types | [x] | - | Spec: ECMA-376-2 Annex E p.76 (reference list) |

### Annex F (informative) Physical package model design considerations — p.78

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| Annex F (informative) Physical package model design considerations | [x] | - | Spec: ECMA-376-2 Annex F p.78 (informative) |

### Annex G (informative) Differences between ECMA-376-2021 and ECMA-376:2006 — p.82

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| Annex G (informative) Differences between ECMA-376-2021 and ECMA-376:2006 | [x] | - | Spec: ECMA-376-2 Annex G p.82 (informative) |

### Annex H (informative) Package example — p.83

| Item | Status | Implementation | Notes |
|------|--------|----------------|-------|
| Annex H (informative) Package example | [x] | - | Spec: ECMA-376-2 Annex H p.83 (spec example only) |
