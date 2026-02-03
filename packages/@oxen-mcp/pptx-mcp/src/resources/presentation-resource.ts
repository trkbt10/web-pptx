/**
 * @file Presentation resource
 *
 * Exposes current presentation state as a readable MCP resource.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PresentationSession } from "@oxen-cli/pptx-cli/core";

/**
 * Register presentation resource.
 */
export function registerPresentationResource(
  server: McpServer,
  session: PresentationSession,
): void {
  server.resource(
    "pptx://presentation/current",
    "Current Presentation",
    async () => {
      const info = session.getInfo();

      if (!info) {
        return {
          contents: [
            {
              uri: "pptx://presentation/current",
              mimeType: "application/json",
              text: JSON.stringify({
                error: "No active presentation",
                hint: "Use pptx_create_presentation tool first",
              }),
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri: "pptx://presentation/current",
            mimeType: "application/json",
            text: JSON.stringify({
              slideCount: info.slideCount,
              width: info.width,
              height: info.height,
              hasActivePresentation: true,
            }),
          },
        ],
      };
    },
  );
}
