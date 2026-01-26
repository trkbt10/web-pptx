/**
 * @file Rule group: Catch clause must use error parameter
 */

export default {
  "@typescript-eslint/no-unused-vars": [
    "error",
    {
      // Default settings
      args: "after-used",
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
      // Catch clause: require error variable to be used
      caughtErrors: "all",
      // No ignore pattern for caught errors - must be used
    },
  ],
};
