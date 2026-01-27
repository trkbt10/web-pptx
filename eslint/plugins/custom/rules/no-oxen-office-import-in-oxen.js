/**
 * @file Custom rule: prohibit @oxen-office/* imports within @oxen/* packages.
 *
 * Utility/core packages (@oxen/*) should not depend on Office-domain packages (@oxen-office/*).
 * This maintains a clean architecture where office/domain depends on utilities, not vice versa.
 */

/**
 * Check if the file is within @oxen/* package (excluding @oxen-ui/* and @oxen-office/*)
 * @param {string} filename - The file path
 * @returns {boolean}
 */
function isInOxenPackage(filename) {
  if (!filename) return false;
  return (
    filename.includes("packages/@oxen/") ||
    filename.includes("packages\\@oxen\\")
  );
}

/**
 * Check if import source is from @oxen-office/*
 * @param {string} source - The import source path
 * @returns {boolean}
 */
function isOxenOfficeImport(source) {
  if (!source || typeof source !== "string") return false;
  return source.startsWith("@oxen-office/");
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow @oxen-office/* imports within @oxen/* packages to maintain clean architecture",
      recommended: true,
    },
    schema: [],
    messages: {
      noOxenOfficeImport:
        "@oxen/* packages cannot import from @oxen-office/*. " +
        "Utility packages should not depend on Office-domain packages. " +
        "Import source: '{{source}}'",
    },
  },

  create(context) {
    const filename = context.filename || context.getFilename();

    if (!isInOxenPackage(filename)) {
      return {};
    }

    function checkImport(node) {
      const source = node.source?.value;
      if (!source) return;

      if (isOxenOfficeImport(source)) {
        context.report({
          node: node.source,
          messageId: "noOxenOfficeImport",
          data: { source },
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

