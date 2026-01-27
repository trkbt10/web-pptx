/**
 * @file Custom rule: prohibit @oxen-ui/* imports within @oxen/* packages.
 *
 * Core packages (@oxen/*) should not depend on UI packages (@oxen-ui/*).
 * This maintains a clean architecture where UI depends on core, not vice versa.
 *
 * Disallows:
 *   import { Foo } from '@oxen-ui/components'  // within @oxen/* package
 *   import * as UI from '@oxen-ui/editor'
 *
 * Allowed:
 *   import { Foo } from '@oxen-ui/components'  // within @oxen-ui/* or other packages
 *   import { Bar } from '@oxen/core'           // @oxen/* importing other @oxen/*
 */

/**
 * Check if the file is within @oxen/* package (excluding @oxen-ui/*)
 * @param {string} filename - The file path
 * @returns {boolean}
 */
function isInOxenPackage(filename) {
  if (!filename) return false;
  // Match packages/@oxen/ but not packages/@oxen-ui/
  return (
    filename.includes("packages/@oxen/") ||
    filename.includes("packages\\@oxen\\")
  );
}

/**
 * Check if import source is from @oxen-ui/*
 * @param {string} source - The import source path
 * @returns {boolean}
 */
function isOxenUiImport(source) {
  if (!source || typeof source !== "string") return false;
  return source.startsWith("@oxen-ui/");
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow @oxen-ui/* imports within @oxen/* packages to maintain clean architecture",
      recommended: true,
    },
    schema: [],
    messages: {
      noOxenUiImport:
        "@oxen/* packages cannot import from @oxen-ui/*. " +
        "Core packages should not depend on UI packages. " +
        "Import source: '{{source}}'",
    },
  },

  create(context) {
    const filename = context.filename || context.getFilename();

    // Only apply this rule within @oxen/* packages
    if (!isInOxenPackage(filename)) {
      return {};
    }

    function checkImport(node) {
      const source = node.source?.value;
      if (!source) return;

      if (isOxenUiImport(source)) {
        context.report({
          node: node.source,
          messageId: "noOxenUiImport",
          data: {
            source,
          },
        });
      }
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
