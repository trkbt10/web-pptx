/**
 * @file XlsxSheetGridCellViewport tests
 */

// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import type { XlsxWorkbook, XlsxWorksheet } from "../../../xlsx/domain/workbook";
import { createDefaultStyleSheet } from "../../../xlsx/domain/style/types";
import { createSheetLayout } from "../../selectors/sheet-layout";
import type { XlsxEditorAction } from "../../context/workbook/editor/types";
import { XlsxSheetGridCellViewport } from "./cell-viewport";

describe("xlsx-editor/components/sheet-grid/cell-viewport", () => {
  it("shows gridlines by default when sheetView is omitted", () => {
    const sheet: XlsxWorksheet = {
      name: "Sheet1",
      sheetId: 1,
      state: "visible",
      rows: [],
      xmlPath: "xl/worksheets/sheet1.xml",
    };
    const workbook: XlsxWorkbook = {
      sheets: [sheet],
      styles: createDefaultStyleSheet(),
      sharedStrings: [],
    };
    const layout = createSheetLayout(sheet, { rowCount: 10, colCount: 10, defaultRowHeightPx: 20, defaultColWidthPx: 50 });
    const dispatch = (action: XlsxEditorAction): void => {
      void action;
    };

    render(
      <div style={{ position: "relative", width: 320, height: 200 }}>
        <XlsxSheetGridCellViewport
          sheet={sheet}
          workbookStyles={workbook.styles}
          layout={layout}
          metrics={{ rowCount: 10, colCount: 10, rowHeaderWidthPx: 56, colHeaderHeightPx: 22 }}
          rowRange={{ start: 0, end: 2 }}
          colRange={{ start: 0, end: 2 }}
          scrollTop={0}
          scrollLeft={0}
          viewportWidth={320}
          viewportHeight={200}
          selection={{ selectedRange: undefined, activeCell: undefined }}
          state={{ editingCell: undefined }}
          activeSheetIndex={0}
          normalizedMerges={[]}
          dispatch={dispatch}
        >
          <div data-testid="cells" />
        </XlsxSheetGridCellViewport>
      </div>,
    );

    expect(screen.getByTestId("xlsx-gridlines")).toBeDefined();
    expect(screen.getByTestId("cells")).toBeDefined();
  });
});
