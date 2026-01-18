/**
 * @file DocumentEditor tests
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { JSDOM } from "jsdom";
import { DocumentEditor } from "./DocumentEditor";
import type { DocxDocument } from "../../docx/domain/document";

// Setup DOM environment for Bun/Node
if (typeof document === "undefined") {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  const win = dom.window as unknown as Window &
    typeof globalThis & {
      readonly HTMLElement: typeof HTMLElement;
      readonly Node: typeof Node;
    };
  globalThis.window = win;
  globalThis.document = win.document;
  globalThis.navigator = win.navigator;
  globalThis.HTMLElement = win.HTMLElement;
  globalThis.Node = win.Node;
  globalThis.getComputedStyle = win.getComputedStyle.bind(win);
}

// Mock ResizeObserver for jsdom
if (typeof window !== "undefined" && !window.ResizeObserver) {
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (window as typeof globalThis).ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
}

// =============================================================================
// Test Fixtures
// =============================================================================

function createEmptyDocument(): DocxDocument {
  return {
    body: { content: [] },
  };
}

function createDocumentWithParagraph(text: string): DocxDocument {
  return {
    body: {
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "run",
              content: [{ type: "text", value: text }],
            },
          ],
        },
      ],
    },
  };
}

function createDocumentWithTable(): DocxDocument {
  return {
    body: {
      content: [
        {
          type: "table",
          rows: [
            {
              type: "tableRow",
              cells: [
                {
                  type: "tableCell",
                  content: [],
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

function createMultiParagraphDocument(): DocxDocument {
  return {
    body: {
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "run",
              content: [{ type: "text", value: "First paragraph" }],
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "run",
              content: [{ type: "text", value: "Second paragraph" }],
            },
          ],
        },
      ],
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("DocumentEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty document", () => {
    const document = createEmptyDocument();
    const { getByText } = render(
      <DocumentEditor initialDocument={document} />
    );

    expect(getByText("Empty document")).toBeTruthy();
  });

  it("renders document with paragraph", () => {
    const document = createDocumentWithParagraph("Hello World");
    const { getByText } = render(
      <DocumentEditor initialDocument={document} />
    );

    expect(getByText("Hello World")).toBeTruthy();
  });

  it("renders document with table", () => {
    const document = createDocumentWithTable();
    const { container } = render(
      <DocumentEditor initialDocument={document} />
    );

    expect(container.querySelector("table")).toBeTruthy();
  });

  it("shows toolbar by default", () => {
    const document = createEmptyDocument();
    const { container } = render(
      <DocumentEditor initialDocument={document} />
    );

    // DocumentToolbar contains undo/redo buttons
    const undoButton = container.querySelector('[title*="Undo"]');
    expect(undoButton).toBeTruthy();
  });

  it("hides toolbar when showToolbar=false", () => {
    const document = createEmptyDocument();
    const { container } = render(
      <DocumentEditor initialDocument={document} showToolbar={false} />
    );

    const undoButton = container.querySelector('[title*="Undo"]');
    expect(undoButton).toBeNull();
  });

  it("shows inspector by default", () => {
    const document = createDocumentWithParagraph("Test");
    const { getByText } = render(
      <DocumentEditor initialDocument={document} />
    );

    // DocumentInfoPanel shows statistics
    expect(getByText(/段落数|Paragraph/i)).toBeTruthy();
  });

  it("hides inspector when showInspector=false", () => {
    const document = createDocumentWithParagraph("Test");
    const { queryByText } = render(
      <DocumentEditor initialDocument={document} showInspector={false} />
    );

    // DocumentInfoPanel should not be rendered
    expect(queryByText(/段落数/)).toBeNull();
  });

  it("selects element on click", () => {
    const document = createDocumentWithParagraph("Click me");
    const { getByText, container } = render(
      <DocumentEditor initialDocument={document} />
    );

    const paragraph = getByText("Click me");
    fireEvent.click(paragraph);

    // Element should have selection styling
    const elementContainer = container.querySelector('[data-element-id="0"]');
    expect(elementContainer).toBeTruthy();
  });

  it("calls onDocumentChange when document changes", () => {
    const document = createDocumentWithParagraph("Initial");
    const onChange = vi.fn();

    render(
      <DocumentEditor
        initialDocument={document}
        onDocumentChange={onChange}
      />
    );

    // Initial render should trigger change callback
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.any(Object),
      })
    );
  });

  it("applies custom className and style", () => {
    const document = createEmptyDocument();
    const { container } = render(
      <DocumentEditor
        initialDocument={document}
        className="custom-editor"
        style={{ border: "1px solid red" }}
      />
    );

    const editor = container.querySelector(".custom-editor");
    expect(editor).toBeTruthy();
    expect(editor?.getAttribute("style")).toContain("border");
  });
});
