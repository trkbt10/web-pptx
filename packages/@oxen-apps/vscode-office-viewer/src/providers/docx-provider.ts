/**
 * @file DOCX Custom Editor Provider
 *
 * Registers a read-only custom editor for .docx files.
 */

import * as vscode from "vscode";
import { renderDocxHtml } from "../renderers/docx-renderer";
import { buildDocxWebviewHtml } from "../webview/docx-template";
import { buildErrorHtml } from "./error-html";

export const DOCX_VIEW_TYPE = "oxen.docxViewer";

/**
 * Create a DOCX custom readonly editor provider.
 */
export function createDocxEditorProvider(): vscode.CustomReadonlyEditorProvider {
  return {
    async openCustomDocument(uri: vscode.Uri): Promise<vscode.CustomDocument> {
      return { uri, dispose: () => {} };
    },

    async resolveCustomEditor(
      document: vscode.CustomDocument,
      webviewPanel: vscode.WebviewPanel,
    ): Promise<void> {
      webviewPanel.webview.options = { enableScripts: true };

      try {
        const data = await vscode.workspace.fs.readFile(document.uri);
        const html = await renderDocxHtml(new Uint8Array(data));

        const fileName = document.uri.path.split("/").pop() ?? "document";
        webviewPanel.webview.html = buildDocxWebviewHtml({
          webview: webviewPanel.webview,
          html,
          fileName,
        });
      } catch (err) {
        webviewPanel.webview.html = buildErrorHtml(
          webviewPanel.webview,
          "Failed to load DOCX",
          err,
        );
      }
    },
  };
}
