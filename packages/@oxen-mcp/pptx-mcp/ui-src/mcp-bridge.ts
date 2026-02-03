/**
 * @file MCP Bridge for UI communication
 *
 * Handles JSON-RPC over postMessage communication with the MCP host.
 */

export type ToolResult = {
  readonly content: readonly { type: string; text: string }[];
  readonly _meta?: {
    readonly ui?: { resourceUri: string };
    readonly currentSlide?: number;
    readonly presentation?: {
      readonly slideCount: number;
      readonly width: number;
      readonly height: number;
    };
    readonly slideData?: {
      readonly number: number;
      readonly svg?: string;
    };
  };
};

export type ToolResultCallback = (result: ToolResult) => void;

type PendingRequest = {
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: unknown) => void;
};

type McpBridgeInstance = {
  readonly callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  readonly onToolResult: (callback: ToolResultCallback) => () => void;
  readonly notifyInteraction: (action: string, data: Record<string, unknown>) => void;
  readonly destroy: () => void;
};

type BridgeState = {
  requestId: number;
  toolResultCallbacks: ToolResultCallback[];
};

/**
 * Create an MCP Bridge for communicating with the host via postMessage.
 */
function createMcpBridge(): McpBridgeInstance {
  const pending = new Map<number, PendingRequest>();
  const state: BridgeState = {
    requestId: 0,
    toolResultCallbacks: [],
  };

  const handleMessage = (event: MessageEvent): void => {
    try {
      const data = event.data;

      // Handle JSON-RPC responses
      if (data?.jsonrpc === "2.0" && typeof data?.id === "number") {
        const handler = pending.get(data.id);
        if (handler) {
          pending.delete(data.id);
          if (data.error) {
            handler.reject(data.error);
          } else {
            handler.resolve(data.result);
          }
        }
      }

      // Handle tool result notifications
      if (data?.method === "toolResult" && data?.params) {
        for (const callback of state.toolResultCallbacks) {
          callback(data.params as ToolResult);
        }
      }
    } catch (error) {
      console.error("MCP Bridge message error:", error);
    }
  };

  window.addEventListener("message", handleMessage);

  return {
    /**
     * Call a tool on the MCP server.
     */
    callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
      state.requestId += 1;
      const id = state.requestId;

      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });

        window.parent.postMessage(
          {
            jsonrpc: "2.0",
            id,
            method: "tools/call",
            params: { name, arguments: args },
          },
          "*",
        );
      });
    },

    /**
     * Subscribe to tool result notifications.
     */
    onToolResult(callback: ToolResultCallback): () => void {
      state.toolResultCallbacks.push(callback);
      return () => {
        const index = state.toolResultCallbacks.indexOf(callback);
        if (index >= 0) {
          state.toolResultCallbacks.splice(index, 1);
        }
      };
    },

    /**
     * Notify the host about user interaction.
     */
    notifyInteraction(action: string, data: Record<string, unknown>): void {
      window.parent.postMessage(
        {
          jsonrpc: "2.0",
          method: "ui/interaction",
          params: { action, data },
        },
        "*",
      );
    },

    /**
     * Cleanup.
     */
    destroy(): void {
      window.removeEventListener("message", handleMessage);
      pending.clear();
      state.toolResultCallbacks = [];
    },
  };
}

// Singleton instance
export const bridge = createMcpBridge();
