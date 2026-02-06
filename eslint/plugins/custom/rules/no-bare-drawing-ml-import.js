/**
 * @file Custom rule: prohibit bare @oxen-renderer/drawing-ml imports.
 *
 * After reorganization, @oxen-renderer/drawing-ml has no root export.
 * Consumers must use explicit sub-path imports:
 *   - @oxen-renderer/drawing-ml/react
 *   - @oxen-renderer/drawing-ml/ascii
 *
 * Disallows:
 *   import { Foo } from '@oxen-renderer/drawing-ml'
 *
 * Allowed:
 *   import { Foo } from '@oxen-renderer/drawing-ml/react'
 *   import { bar } from '@oxen-renderer/drawing-ml/ascii'
 */

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow bare @oxen-renderer/drawing-ml imports; use /react or /ascii sub-paths",
      recommended: true,
    },
    schema: [],
    messages: {
      noBareImport:
        "Bare '@oxen-renderer/drawing-ml' import is not allowed. " +
        "Use '@oxen-renderer/drawing-ml/react' or '@oxen-renderer/drawing-ml/ascii' instead.",
    },
  },

  create(context) {
    function checkImport(node) {
      const source = node.source?.value;
      if (source !== "@oxen-renderer/drawing-ml") return;

      context.report({
        node: node.source,
        messageId: "noBareImport",
      });
    }

    return {
      ImportDeclaration: checkImport,
      ExportAllDeclaration: checkImport,
      ExportNamedDeclaration(node) {
        if (node.source) {
          checkImport(node);
        }
      },
    };
  },
};
