/**
 * @file OOXML (Office Open XML) type definitions
 *
 * These types represent the structure of OOXML elements as defined in ECMA-376.
 * Elements are parsed into XmlElement AST nodes.
 *
 * ## Namespaces
 *
 * - **PresentationML (p:)**: Slides, shapes, placeholders
 *   @see ./presentationml.ts
 *
 * - **DrawingML (a:)**: Text, fills, transforms, geometry
 *   @see ./drawingml.ts
 *   @see ./color.ts
 *
 * - **Charts (c:)**: Chart structures and data
 *   @see ./chart.ts
 *
 * ## XML AST Structure
 *
 * XML is parsed into XmlElement nodes:
 * ```typescript
 * {
 *   type: "element",
 *   name: "a:srgbClr",
 *   attrs: { val: "FF0000" },
 *   children: [
 *     { type: "element", name: "a:alpha", attrs: { val: "50000" }, children: [] }
 *   ]
 * }
 * ```
 *
 * Text content is in XmlText children:
 * ```xml
 * <c:v>8.2</c:v>
 * ```
 * Becomes:
 * ```typescript
 * {
 *   type: "element",
 *   name: "c:v",
 *   attrs: {},
 *   children: [{ type: "text", value: "8.2" }]
 * }
 * ```
 *
 * @see src/xml/ast.ts - XmlElement, XmlText types
 * @see src/xml/types.ts - getXmlText for text extraction
 */

// Base types for all OOXML elements
export * from "./base";

// DrawingML color types (a: namespace - fills and colors)
export * from "./color";

// DrawingML text and transform types (a: namespace)
export * from "./drawingml";

// PresentationML types (p: namespace - slides and shapes)
export * from "./presentationml";

// Chart types (c: namespace)
export * from "./chart";

// Helper functions for common element access patterns
export * from "./helpers";

// Type guards for OOXML elements
export * from "./guards";

// ECMA-376 compliant type system
export * from "./ecma376";
