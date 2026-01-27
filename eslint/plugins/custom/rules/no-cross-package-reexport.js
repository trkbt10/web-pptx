/**
 * @file Custom rule: prohibit re-exporting from other packages.
 *
 * Packages should not re-export symbols from other packages.
 * Each package should expose only its own implementation.
 *
 * Disallows:
 *   export * from '@oxen/core'
 *   export { Foo } from '@oxen-ui/components'
 *   import { Bar } from '@oxen/utils'; export { Bar }
 *
 * Allowed:
 *   export * from './local'        // re-export from same package
 *   export { foo } from '../utils' // relative re-export within same package
 *   import { Bar } from '@oxen/utils'; const baz = Bar; export { baz } // transform then export
 */

/**
 * Check if a source is an external package import (starts with @)
 * @param {string} source - The import/export source path
 * @returns {boolean}
 */
function isPackageImport(source) {
  if (!source || typeof source !== "string") return false;
  // Matches @scope/package-name patterns
  return source.startsWith("@");
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow re-exporting symbols from other packages to maintain clear package boundaries",
      recommended: true,
    },
    schema: [],
    messages: {
      noPackageReexport:
        "Re-exporting from another package is not allowed. " +
        "Each package should expose only its own implementation. " +
        "Source: '{{source}}'",
      noIndirectPackageReexport:
        "Re-exporting '{{name}}' that was imported from package '{{source}}' is not allowed. " +
        "Each package should expose only its own implementation.",
    },
  },

  create(context) {
    // Track imports from other packages: Map<localName, { source }>
    const packageImports = new Map();

    function checkDirectReexport(node) {
      const source = node.source?.value;
      if (!source) return;

      if (isPackageImport(source)) {
        context.report({
          node: node.source,
          messageId: "noPackageReexport",
          data: {
            source,
          },
        });
      }
    }

    function trackImport(node) {
      const source = node.source?.value;
      if (!source) return;

      if (!isPackageImport(source)) return;

      // Track all imported names from package imports
      for (const specifier of node.specifiers || []) {
        const localName = specifier.local?.name;
        if (localName) {
          packageImports.set(localName, { source });
        }
      }
    }

    function checkIndirectReexport(node) {
      // Skip if this is a direct re-export (export { x } from '...')
      if (node.source != null) return;

      // Check each exported specifier
      for (const specifier of node.specifiers || []) {
        const localName = specifier.local?.name;
        if (!localName) continue;

        const importInfo = packageImports.get(localName);
        if (importInfo) {
          context.report({
            node: specifier,
            messageId: "noIndirectPackageReexport",
            data: {
              name: localName,
              source: importInfo.source,
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
