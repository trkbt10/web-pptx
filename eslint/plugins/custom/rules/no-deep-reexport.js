/**
 * @file Custom rule: prohibit re-exports that cross module boundaries.
 *
 * Disallows patterns like:
 *   export * from '../../something'
 *   export { foo } from '../../../bar'
 *
 * Also disallows indirect re-exports (import then export):
 *   import { foo } from '../domain/bar'
 *   export { foo }  // <-- This is also prohibited!
 *
 * These "boundary-crossing re-exports" violate module boundaries
 * and make the codebase harder to understand and refactor.
 *
 * Allowed:
 *   export * from './local'           // same directory
 *   export { foo } from '../sibling'  // one level up is OK by default
 *
 * Configurable threshold via options.maxParentDepth (default: 1)
 */

/**
 * Count how many parent directory traversals (..) are in a path
 * @param {string} path - The import/export path
 * @returns {number} - Number of parent traversals
 */
function countParentTraversals(path) {
  if (!path || typeof path !== "string") return 0;
  if (!path.startsWith(".")) return 0; // not a relative path

  const parts = path.split("/");
  let count = 0;
  for (const part of parts) {
    if (part === "..") {
      count++;
    } else if (part !== ".") {
      break; // stop counting after non-.. part
    }
  }
  return count;
}

/**
 * Check if this is a re-export (export from) statement
 * @param {object} node - AST node
 * @returns {boolean}
 */
function isReexport(node) {
  // ExportAllDeclaration: export * from '...'
  // ExportNamedDeclaration with source: export { x } from '...'
  return node.source != null;
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow re-exports that traverse multiple parent directories, including indirect import-then-export patterns",
      recommended: true,
    },
    schema: [
      {
        type: "object",
        properties: {
          maxParentDepth: {
            type: "integer",
            minimum: 0,
            default: 1,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      deepReexport:
        "Re-export crosses {{depth}} parent directories (max allowed: {{max}}). " +
        "Deep re-exports violate module boundaries. Consider importing and re-exporting from a closer module, " +
        "or restructure the module hierarchy.",
      indirectReexport:
        "Re-exporting '{{name}}' that was imported from '{{source}}' ({{depth}} parent dirs). " +
        "Indirect re-exports violate module boundaries. Import directly from the source instead.",
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const maxParentDepth = options.maxParentDepth ?? 1;

    // Track imports that cross boundaries: Map<localName, { source, depth }>
    const boundaryImports = new Map();

    function checkDirectReexport(node) {
      if (!isReexport(node)) return;

      const sourcePath = node.source?.value;
      if (!sourcePath) return;

      const depth = countParentTraversals(sourcePath);

      if (depth > maxParentDepth) {
        context.report({
          node: node.source,
          messageId: "deepReexport",
          data: {
            depth: String(depth),
            max: String(maxParentDepth),
          },
        });
      }
    }

    function trackImport(node) {
      const sourcePath = node.source?.value;
      if (!sourcePath) return;

      const depth = countParentTraversals(sourcePath);
      if (depth <= maxParentDepth) return; // Within allowed boundary

      // Track all imported names from boundary-crossing imports
      for (const specifier of node.specifiers || []) {
        const localName = specifier.local?.name;
        if (localName) {
          boundaryImports.set(localName, { source: sourcePath, depth });
        }
      }
    }

    function checkIndirectReexport(node) {
      // Skip if this is a direct re-export (export { x } from '...')
      if (node.source != null) return;

      // Check each exported specifier
      for (const specifier of node.specifiers || []) {
        // For `export { foo }`, local is `foo` (what we're exporting)
        const localName = specifier.local?.name;
        if (!localName) continue;

        const importInfo = boundaryImports.get(localName);
        if (importInfo) {
          context.report({
            node: specifier,
            messageId: "indirectReexport",
            data: {
              name: localName,
              source: importInfo.source,
              depth: String(importInfo.depth),
            },
          });
        }
      }
    }

    return {
      ImportDeclaration: trackImport,
      ExportAllDeclaration: checkDirectReexport,
      ExportNamedDeclaration(node) {
        checkDirectReexport(node);
        checkIndirectReexport(node);
      },
    };
  },
};
