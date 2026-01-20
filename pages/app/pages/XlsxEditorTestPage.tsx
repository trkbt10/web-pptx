/**
 * @file XLSX Editor Test Page
 */

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { XlsxWorkbookEditor } from "@lib/xlsx-editor";
import type { XlsxWorkbook } from "@lib/xlsx/domain/workbook";
import { createDefaultStyleSheet } from "@lib/xlsx/domain/style/types";
import { borderId, colIdx, fillId, fontId, numFmtId, rowIdx, styleId, type ColIndex, type RowIndex } from "@lib/xlsx/domain/types";
import type { CellAddress } from "@lib/xlsx/domain/cell/address";
import { Button, Input } from "@lib/office-editor-components/primitives";
import { parseXlsxWorkbook } from "@lib/xlsx/parser";
import { exportXlsx } from "@lib/xlsx/exporter";
import { createGetZipTextFileContentFromBytes } from "@lib/files/ooxml-zip";

type XlsxEditorTestPageProps = {
  readonly onBack: () => void;
};

const pageStyle: CSSProperties = {
  height: "100vh",
  minHeight: 0,
  backgroundColor: "var(--bg-primary)",
  color: "var(--text-primary)",
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  paddingBottom: "16px",
  borderBottom: "1px solid var(--border-subtle)",
};

const titleStyle: CSSProperties = {
  fontSize: "24px",
  fontWeight: 600,
};

const controlsStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "12px",
};

const editorFrameStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  border: "1px solid var(--border-subtle)",
  borderRadius: "8px",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

async function parseWorkbookFromFile(file: File): Promise<XlsxWorkbook> {
  const data = await file.arrayBuffer();
  const getFileContent = await createGetZipTextFileContentFromBytes(data);
  return parseXlsxWorkbook(getFileContent);
}

function downloadXlsx(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function createAddress(col: ColIndex, row: RowIndex): CellAddress {
  return { col, row, colAbsolute: false, rowAbsolute: false };
}

function createTestWorkbook(): XlsxWorkbook {
  const styles = createDefaultStyleSheet();

  const redBoldFontIndex = styles.fonts.length;
  const yellowFillIndex = styles.fills.length;
  const thinBorderIndex = styles.borders.length;

  const cellXfs = [
    ...styles.cellXfs,
    // styleId(1): yellow fill
    { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(yellowFillIndex), borderId: borderId(0), applyFill: true },
    // styleId(2): red + bold font
    { numFmtId: numFmtId(0), fontId: fontId(redBoldFontIndex), fillId: fillId(0), borderId: borderId(0), applyFont: true },
    // styleId(3): thin border
    { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(0), borderId: borderId(thinBorderIndex), applyBorder: true },
    // styleId(4): wrap + alignment
    {
      numFmtId: numFmtId(0),
      fontId: fontId(0),
      fillId: fillId(0),
      borderId: borderId(0),
      alignment: { wrapText: true, horizontal: "left", vertical: "top" },
      applyAlignment: true,
    },
  ];

  return {
    sheets: [
      {
        name: "Sheet1",
        sheetId: 1,
        state: "visible",
        sheetView: { showGridLines: true, showRowColHeaders: true },
        rows: [
          {
            rowNumber: rowIdx(1),
            cells: [
              { address: createAddress(colIdx(1), rowIdx(1)), value: { type: "number", value: 10 }, styleId: styleId(1) },
              { address: createAddress(colIdx(2), rowIdx(1)), value: { type: "number", value: 20 }, styleId: styleId(2) },
              { address: createAddress(colIdx(3), rowIdx(1)), value: { type: "empty" }, formula: "A1+B1", styleId: styleId(3) },
            ],
          },
          {
            rowNumber: rowIdx(2),
            cells: [
              { address: createAddress(colIdx(1), rowIdx(2)), value: { type: "number", value: 1 } },
              { address: createAddress(colIdx(2), rowIdx(2)), value: { type: "empty" }, formula: 'IF(A2>0,"OK","NG")' },
              { address: createAddress(colIdx(3), rowIdx(2)), value: { type: "empty" }, formula: "SUM(A1:B1)" },
            ],
          },
          {
            rowNumber: rowIdx(3),
            cells: [
              { address: createAddress(colIdx(1), rowIdx(3)), value: { type: "number", value: 1 } },
              { address: createAddress(colIdx(2), rowIdx(3)), value: { type: "empty" }, formula: "SUM(A3:A4)" },
            ],
          },
          {
            rowNumber: rowIdx(4),
            cells: [{ address: createAddress(colIdx(1), rowIdx(4)), value: { type: "number", value: 2 } }],
          },
          {
            rowNumber: rowIdx(5),
            cells: [
              { address: createAddress(colIdx(1), rowIdx(5)), value: { type: "empty" }, formula: "Sheet2!A1+1" },
              { address: createAddress(colIdx(2), rowIdx(5)), value: { type: "empty" }, formula: "NoSuchSheet!A1" },
              {
                address: createAddress(colIdx(3), rowIdx(5)),
                value: { type: "string", value: "Long text wraps onto multiple lines if wrapText is applied." },
                styleId: styleId(4),
              },
            ],
          },
        ],
        xmlPath: "xl/worksheets/sheet1.xml",
      },
      {
        name: "Sheet2",
        sheetId: 2,
        state: "visible",
        sheetView: { showGridLines: true, showRowColHeaders: true },
        rows: [
          {
            rowNumber: rowIdx(1),
            cells: [{ address: createAddress(colIdx(1), rowIdx(1)), value: { type: "number", value: 41 } }],
          },
        ],
        xmlPath: "xl/worksheets/sheet2.xml",
      },
    ],
    styles: {
      ...styles,
      fonts: [
        ...styles.fonts,
        { name: "Calibri", size: 11, scheme: "minor", bold: true, color: { type: "rgb", value: "FFFF0000" } },
      ],
      fills: [
        ...styles.fills,
        { type: "pattern", pattern: { patternType: "solid", fgColor: { type: "rgb", value: "FFFFFF00" } } },
      ],
      borders: [
        ...styles.borders,
        {
          left: { style: "thin", color: { type: "rgb", value: "FF000000" } },
          right: { style: "thin", color: { type: "rgb", value: "FF000000" } },
          top: { style: "thin", color: { type: "rgb", value: "FF000000" } },
          bottom: { style: "thin", color: { type: "rgb", value: "FF000000" } },
        },
      ],
      cellXfs,
    },
    sharedStrings: [],
  };
}

export function XlsxEditorTestPage({ onBack }: XlsxEditorTestPageProps) {
  const [sourceName, setSourceName] = useState<string>("test-workbook.xlsx");
  const [workbook, setWorkbook] = useState<XlsxWorkbook>(() => createTestWorkbook());
  const [currentWorkbook, setCurrentWorkbook] = useState<XlsxWorkbook>(workbook);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computeInitialGridSize = useCallback((wb: XlsxWorkbook): { rowCount: number; colCount: number } => {
    const MAX_ROWS = 1_048_576;
    const MAX_COLS = 16_384;

    void wb;
    return { rowCount: MAX_ROWS, colCount: MAX_COLS };
  }, []);

  const [{ rowCount, colCount }, setGridSize] = useState(() => computeInitialGridSize(workbook));

  const loadFile = useCallback(async (file: File) => {
    setIsBusy(true);
    setError(null);
    try {
      const parsed = await parseWorkbookFromFile(file);
      setSourceName(file.name);
      setWorkbook(parsed);
      setCurrentWorkbook(parsed);
      setGridSize(computeInitialGridSize(parsed));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsBusy(false);
    }
  }, [computeInitialGridSize]);

  const defaultSaveName = useMemo(() => {
    if (sourceName.toLowerCase().endsWith(".xlsx")) {
      return sourceName;
    }
    if (sourceName.toLowerCase().endsWith(".xlsm")) {
      return sourceName.replace(/\.xlsm$/i, ".xlsx");
    }
    return `${sourceName}.xlsx`;
  }, [sourceName]);

  const saveXlsx = useCallback(async () => {
    setIsBusy(true);
    setError(null);
    try {
      const bytes = await exportXlsx(currentWorkbook);
      downloadXlsx(bytes, defaultSaveName);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsBusy(false);
    }
  }, [currentWorkbook, defaultSaveName]);

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div style={titleStyle}>XLSX Editor Test</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button onClick={onBack}>Back</Button>
        </div>
      </div>

      <div style={controlsStyle}>
        <Button
          disabled={isBusy}
          onClick={() => {
            const demo = createTestWorkbook();
            setSourceName("test-workbook.xlsx");
            setWorkbook(demo);
            setCurrentWorkbook(demo);
            setGridSize(computeInitialGridSize(demo));
          }}
        >
          Load demo (formulas)
        </Button>

        <input
          type="file"
          accept=".xlsx,.xlsm"
          disabled={isBusy}
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            if (!file) {
              return;
            }
            void loadFile(file);
          }}
        />

        <Button
          disabled={isBusy}
          onClick={() => {
            void saveXlsx();
          }}
        >
          Save XLSX
        </Button>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Rows</div>
          <Input
            type="number"
            value={rowCount}
            min={1}
            onChange={(v) => setGridSize((prev) => ({ ...prev, rowCount: Number(v) }))}
            width={90}
          />
          <div style={{ fontSize: 12, opacity: 0.8 }}>Cols</div>
          <Input
            type="number"
            value={colCount}
            min={1}
            onChange={(v) => setGridSize((prev) => ({ ...prev, colCount: Number(v) }))}
            width={90}
          />
        </div>

        {isBusy && <div style={{ fontSize: 12, opacity: 0.8 }}>Working…</div>}
        {error && <div style={{ fontSize: 12, color: "var(--danger)" }}>{error}</div>}
      </div>

      <div style={editorFrameStyle}>
        <XlsxWorkbookEditor
          workbook={workbook}
          onWorkbookChange={setCurrentWorkbook}
          grid={{
            rowCount,
            colCount,
            rowHeightPx: 22,
            colWidthPx: 120,
            headerSizePx: 32,
            colHeaderHeightPx: 22,
            rowHeaderWidthPx: 56,
            overscanRows: 4,
            overscanCols: 2,
          }}
        />
      </div>
    </div>
  );
}
