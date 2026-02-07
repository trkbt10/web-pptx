/**
 * @file XLSX Custom Editor Provider
 *
 * Registers a read-only custom editor for .xlsx and .xls files.
 */

import * as vscode from "vscode";
import { renderXlsxHtml } from "../renderers/xlsx-renderer";
import { buildXlsxWebviewHtml } from "../webview/xlsx-template";
import { buildErrorHtml } from "./error-html";

export const XLSX_VIEW_TYPE = "oxen.xlsxViewer";

/**
 * Create an XLSX custom readonly editor provider.
 */
export function createXlsxEditorProvider(): vscode.CustomReadonlyEditorProvider {
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
        const result = await renderXlsxHtml(new Uint8Array(data));

        const fileName = document.uri.path.split("/").pop() ?? "spreadsheet";
        webviewPanel.webview.html = buildXlsxWebviewHtml({
          webview: webviewPanel.webview,
          sheets: result.sheets,
          fileName,
        });
      } catch (err) {
        webviewPanel.webview.html = buildErrorHtml(
          webviewPanel.webview,
          "Failed to load XLSX",
          err,
        );
      }
    },
  };
}
