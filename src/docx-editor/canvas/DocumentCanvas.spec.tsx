/**
 * @file DocumentCanvas and DocumentViewport unit tests
 */

// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { DocxDocument } from "../../docx/domain/document";
import { DocumentEditorProvider } from "../context/document/DocumentEditorContext";
import { DocumentCanvas } from "./DocumentCanvas";
import { DocumentViewport } from "./DocumentViewport";

// =============================================================================
// Test Fixtures
// =============================================================================

function createEmptyDocument(): DocxDocument {
  return {
    body: {
      content: [],
    },
  };
}

function createDocumentWithParagraphs(): DocxDocument {
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

// =============================================================================
// DocumentViewport Tests
// =============================================================================

describe("DocumentViewport", () => {
  it("renders children", () => {
    render(
      <DocumentViewport zoom={1}>
        <div data-testid="child">Content</div>
      </DocumentViewport>
    );

    expect(screen.getByTestId("child")).toBeDefined();
  });

  it("applies zoom transform", () => {
    const { container } = render(
      <DocumentViewport zoom={1.5}>
        <div>Content</div>
      </DocumentViewport>
    );

    // Find the content wrapper div (second child)
    const wrapper = container.firstChild?.firstChild as HTMLElement;
    expect(wrapper.style.transform).toContain("scale(1.5)");
  });

  it("calls onScroll when scrolled", () => {
    const onScroll = vi.fn();

    const { container } = render(
      <DocumentViewport zoom={1} onScroll={onScroll}>
        <div style={{ height: "2000px" }}>Content</div>
      </DocumentViewport>
    );

    const scrollContainer = container.firstChild as HTMLElement;
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 100, scrollLeft: 0 } });

    expect(onScroll).toHaveBeenCalled();
  });

  it("applies custom style", () => {
    const { container } = render(
      <DocumentViewport zoom={1} style={{ backgroundColor: "red" }}>
        <div>Content</div>
      </DocumentViewport>
    );

    const scrollContainer = container.firstChild as HTMLElement;
    expect(scrollContainer.style.backgroundColor).toBe("red");
  });

  it("applies custom className", () => {
    const { container } = render(
      <DocumentViewport zoom={1} className="custom-class">
        <div>Content</div>
      </DocumentViewport>
    );

    const scrollContainer = container.firstChild as HTMLElement;
    expect(scrollContainer.classList.contains("custom-class")).toBe(true);
  });
});

// =============================================================================
// DocumentCanvas Tests
// =============================================================================

describe("DocumentCanvas", () => {
  describe("without provider (standalone)", () => {
    it("renders empty document message", () => {
      render(<DocumentCanvas />);

      expect(screen.getByText("Empty document")).toBeDefined();
    });

    it("applies custom className", () => {
      const { container } = render(<DocumentCanvas className="test-class" />);

      const canvas = container.firstChild as HTMLElement;
      expect(canvas.classList.contains("test-class")).toBe(true);
    });
  });

  describe("with provider", () => {
    it("renders empty document message when document is empty", () => {
      const document = createEmptyDocument();

      render(
        <DocumentEditorProvider initialDocument={document}>
          <DocumentCanvas />
        </DocumentEditorProvider>
      );

      expect(screen.getByText("Empty document")).toBeDefined();
    });

    it("renders paragraphs from document", () => {
      const document = createDocumentWithParagraphs();

      render(
        <DocumentEditorProvider initialDocument={document}>
          <DocumentCanvas />
        </DocumentEditorProvider>
      );

      expect(screen.getByText("First paragraph")).toBeDefined();
      expect(screen.getByText("Second paragraph")).toBeDefined();
    });

    it("renders table placeholder", () => {
      const document = createDocumentWithTable();

      render(
        <DocumentEditorProvider initialDocument={document}>
          <DocumentCanvas />
        </DocumentEditorProvider>
      );

      expect(screen.getByText("[Table: 1 rows]")).toBeDefined();
    });

    it("calls onElementClick when element is clicked", () => {
      const document = createDocumentWithParagraphs();
      const onElementClick = vi.fn();

      render(
        <DocumentEditorProvider initialDocument={document}>
          <DocumentCanvas onElementClick={onElementClick} />
        </DocumentEditorProvider>
      );

      const paragraph = screen.getByText("First paragraph").parentElement;
      if (paragraph) {
        fireEvent.click(paragraph);
      }

      expect(onElementClick).toHaveBeenCalledWith("0", expect.any(Object));
    });

    it("calls onElementDoubleClick when element is double-clicked", () => {
      const document = createDocumentWithParagraphs();
      const onDoubleClick = vi.fn();

      render(
        <DocumentEditorProvider initialDocument={document}>
          <DocumentCanvas onElementDoubleClick={onDoubleClick} />
        </DocumentEditorProvider>
      );

      const paragraph = screen.getByText("First paragraph").parentElement;
      if (paragraph) {
        fireEvent.doubleClick(paragraph);
      }

      expect(onDoubleClick).toHaveBeenCalledWith("0");
    });

    it("calls onCanvasClick when background is clicked", () => {
      const document = createDocumentWithParagraphs();
      const onCanvasClick = vi.fn();

      const { container } = render(
        <DocumentEditorProvider initialDocument={document}>
          <DocumentCanvas onCanvasClick={onCanvasClick} />
        </DocumentEditorProvider>
      );

      // Click directly on the outer container
      const canvas = container.firstChild as HTMLElement;
      fireEvent.click(canvas);

      expect(onCanvasClick).toHaveBeenCalled();
    });

    it("does not call onCanvasClick when element is clicked", () => {
      const document = createDocumentWithParagraphs();
      const onCanvasClick = vi.fn();

      render(
        <DocumentEditorProvider initialDocument={document}>
          <DocumentCanvas onCanvasClick={onCanvasClick} />
        </DocumentEditorProvider>
      );

      const paragraph = screen.getByText("First paragraph").parentElement;
      if (paragraph) {
        fireEvent.click(paragraph);
      }

      expect(onCanvasClick).not.toHaveBeenCalled();
    });
  });

  describe("page breaks", () => {
    it("shows page break indicator when showPageBreaks is true", () => {
      const document = createDocumentWithParagraphs();

      render(
        <DocumentEditorProvider initialDocument={document}>
          <DocumentCanvas showPageBreaks={true} />
        </DocumentEditorProvider>
      );

      expect(screen.getByText("Page Break")).toBeDefined();
    });

    it("hides page break indicator when showPageBreaks is false", () => {
      const document = createDocumentWithParagraphs();

      render(
        <DocumentEditorProvider initialDocument={document}>
          <DocumentCanvas showPageBreaks={false} />
        </DocumentEditorProvider>
      );

      expect(screen.queryByText("Page Break")).toBeNull();
    });
  });

  describe("custom page dimensions", () => {
    it("applies custom pageWidth", () => {
      const document = createEmptyDocument();

      const { container } = render(
        <DocumentEditorProvider initialDocument={document}>
          <DocumentCanvas pageWidth={600} />
        </DocumentEditorProvider>
      );

      // Find the page div (second level child)
      const page = container.querySelector("[style*='width: 600px']");
      expect(page).not.toBeNull();
    });
  });

  describe("custom render function", () => {
    it("uses custom renderBlockContent when provided", () => {
      const document = createDocumentWithParagraphs();
      const renderBlockContent = vi.fn((element, index) => (
        <div key={index} data-testid={`custom-${index}`}>
          Custom render
        </div>
      ));

      render(
        <DocumentEditorProvider initialDocument={document}>
          <DocumentCanvas renderBlockContent={renderBlockContent} />
        </DocumentEditorProvider>
      );

      expect(screen.getByTestId("custom-0")).toBeDefined();
      expect(screen.getByTestId("custom-1")).toBeDefined();
      expect(renderBlockContent).toHaveBeenCalledTimes(2);
    });
  });
});
