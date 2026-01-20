/**
 * @file XlsxCellFormatPanel
 *
 * Sidebar panel for editing SpreadsheetML (styles.xml) formatting for the current selection.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  Button,
  FieldGroup,
  FieldRow,
  Input,
  Panel,
  Select,
  Toggle,
  ToggleButton,
  spacingTokens,
  type SelectOption,
} from "../../../office-editor-components";
import type { CellAddress, CellRange } from "../../../xlsx/domain/cell/address";
import type { XlsxFont } from "../../../xlsx/domain/style/font";
import type { XlsxFill } from "../../../xlsx/domain/style/fill";
import type { XlsxBorder, XlsxBorderEdge, XlsxBorderStyle } from "../../../xlsx/domain/style/border";
import type { XlsxAlignment } from "../../../xlsx/domain/style/types";
import { getCell } from "../../cell/query";
import { useXlsxWorkbookEditor } from "../../context/workbook/XlsxWorkbookEditorContext";
import { resolveCellStyleDetails } from "../../selectors/cell-style-details";
import { makeXlsxRgbColor, normalizeRgbHexInput, rgbHexFromXlsxColor } from "./color-utils";

export type XlsxCellFormatPanelProps = {
  readonly sheetIndex: number;
  readonly onClose?: () => void;
};

function getTargetRange(params: {
  readonly activeCell: CellAddress | undefined;
  readonly selectedRange: CellRange | undefined;
}): CellRange | undefined {
  if (params.selectedRange) {
    return params.selectedRange;
  }
  if (!params.activeCell) {
    return undefined;
  }
  return { start: params.activeCell, end: params.activeCell };
}

const HORIZONTAL_OPTIONS: readonly SelectOption<string>[] = [
  { value: "", label: "(auto)" },
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
  { value: "fill", label: "Fill" },
  { value: "justify", label: "Justify" },
  { value: "centerContinuous", label: "CenterContinuous" },
  { value: "distributed", label: "Distributed" },
];

const VERTICAL_OPTIONS: readonly SelectOption<string>[] = [
  { value: "", label: "(auto)" },
  { value: "top", label: "Top" },
  { value: "center", label: "Center" },
  { value: "bottom", label: "Bottom" },
  { value: "justify", label: "Justify" },
  { value: "distributed", label: "Distributed" },
];

function parseHorizontalAlignment(value: string): NonNullable<XlsxAlignment["horizontal"]> {
  switch (value) {
    case "left":
    case "center":
    case "right":
    case "fill":
    case "justify":
    case "centerContinuous":
    case "distributed":
      return value;
  }
  throw new Error(`Unknown horizontal alignment: ${value}`);
}

function parseVerticalAlignment(value: string): NonNullable<XlsxAlignment["vertical"]> {
  switch (value) {
    case "top":
    case "center":
    case "bottom":
    case "justify":
    case "distributed":
      return value;
  }
  throw new Error(`Unknown vertical alignment: ${value}`);
}

const BORDER_STYLE_OPTIONS: readonly SelectOption<XlsxBorderStyle | "">[] = [
  { value: "", label: "(none)" },
  { value: "thin", label: "Thin" },
  { value: "medium", label: "Medium" },
  { value: "thick", label: "Thick" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
  { value: "double", label: "Double" },
  { value: "hair", label: "Hair" },
  { value: "mediumDashed", label: "MediumDashed" },
  { value: "dashDot", label: "DashDot" },
  { value: "mediumDashDot", label: "MediumDashDot" },
  { value: "dashDotDot", label: "DashDotDot" },
  { value: "mediumDashDotDot", label: "MediumDashDotDot" },
  { value: "slantDashDot", label: "SlantDashDot" },
];

const BUILTIN_FORMAT_OPTIONS: readonly SelectOption<string>[] = [
  { value: "0", label: "General" },
  { value: "1", label: "0" },
  { value: "2", label: "0.00" },
  { value: "3", label: "#,##0" },
  { value: "4", label: "#,##0.00" },
  { value: "9", label: "0%" },
  { value: "10", label: "0.00%" },
  { value: "11", label: "0.00E+00" },
  { value: "49", label: "Text" },
];

function toggleFontFlag(font: XlsxFont, flag: "bold" | "italic" | "strikethrough", pressed: boolean): XlsxFont {
  if (flag === "bold") {
    return { ...font, bold: pressed ? true : undefined };
  }
  if (flag === "italic") {
    return { ...font, italic: pressed ? true : undefined };
  }
  return { ...font, strikethrough: pressed ? true : undefined };
}

function setUnderline(font: XlsxFont, pressed: boolean): XlsxFont {
  return { ...font, underline: pressed ? "single" : undefined };
}

function setSolidFill(hex: string): XlsxFill {
  const color = makeXlsxRgbColor(hex);
  return {
    type: "pattern",
    pattern: {
      patternType: "solid",
      fgColor: color,
    },
  };
}

function borderEdgeStyle(edge: XlsxBorderEdge | undefined): XlsxBorderStyle | "" {
  return edge?.style ?? "";
}

function updateBorderEdge(border: XlsxBorder, edge: "left" | "right" | "top" | "bottom", next: XlsxBorderEdge | undefined): XlsxBorder {
  return { ...border, [edge]: next };
}

function buildDecimalFormat(params: { readonly decimals: number; readonly thousands: boolean }): string {
  const decimals = Math.max(0, Math.min(20, Math.trunc(params.decimals)));
  const base = params.thousands ? "#,##0" : "0";
  if (decimals === 0) {
    return base;
  }
  return `${base}.${"0".repeat(decimals)}`;
}

export function XlsxCellFormatPanel({ sheetIndex, onClose }: XlsxCellFormatPanelProps) {
  const { workbook, selection, state, dispatch } = useXlsxWorkbookEditor();
  const sheet = workbook.sheets[sheetIndex];
  if (!sheet) {
    throw new Error(`Sheet not found: index=${sheetIndex}`);
  }

  const targetRange = useMemo(() => getTargetRange({ activeCell: selection.activeCell, selectedRange: selection.selectedRange }), [selection.activeCell, selection.selectedRange]);
  const disableInputs = state.editingCell !== undefined || !targetRange;

  const anchorCell = selection.activeCell ?? targetRange?.start;
  const details = useMemo(() => {
    if (!anchorCell) {
      return undefined;
    }
    const cell = getCell(sheet, anchorCell);
    return resolveCellStyleDetails({ styles: workbook.styles, sheet, address: anchorCell, cell });
  }, [anchorCell, sheet, workbook.styles]);

  const fontNameOptions = useMemo(() => {
    const names = new Set<string>();
    for (const font of workbook.styles.fonts) {
      names.add(font.name);
    }
    for (const extra of ["Calibri", "Arial", "Times New Roman", "Courier New"]) {
      names.add(extra);
    }
    return [...names].sort().map<SelectOption<string>>((name) => ({ value: name, label: name }));
  }, [workbook.styles.fonts]);

  const [fontSizeDraft, setFontSizeDraft] = useState<number>(details?.font.size ?? 11);
  const [fontColorDraft, setFontColorDraft] = useState<string>(() => rgbHexFromXlsxColor(details?.font.color) ?? "");
  const [fillColorDraft, setFillColorDraft] = useState<string>(() => {
    if (details?.fill.type === "pattern" && details.fill.pattern.patternType === "solid") {
      return rgbHexFromXlsxColor(details.fill.pattern.fgColor) ?? "";
    }
    return "";
  });
  const [borderColorDraft, setBorderColorDraft] = useState<string>(() => rgbHexFromXlsxColor(details?.border.left?.color) ?? "");
  const [customFormatDraft, setCustomFormatDraft] = useState<string>(details?.formatCode ?? "General");
  const [decimalPlaces, setDecimalPlaces] = useState<number>(2);
  const [useThousands, setUseThousands] = useState<boolean>(false);

  useEffect(() => {
    if (!details) {
      return;
    }
    setFontSizeDraft(details.font.size);
    setFontColorDraft(rgbHexFromXlsxColor(details.font.color) ?? "");
    let nextFillColor = "";
    if (details.fill.type === "pattern" && details.fill.pattern.patternType === "solid") {
      nextFillColor = rgbHexFromXlsxColor(details.fill.pattern.fgColor) ?? "";
    }
    setFillColorDraft(nextFillColor);
    setBorderColorDraft(rgbHexFromXlsxColor(details.border.left?.color) ?? "");
    setCustomFormatDraft(details.formatCode);
  }, [details?.styleId]);

  if (!details || !targetRange) {
    return (
      <Panel title="Format" width={320} style={{ height: "100%" }}>
        <div style={{ padding: spacingTokens.md, color: "var(--text-tertiary)" }}>Select a cell to edit formatting.</div>
      </Panel>
    );
  }

  const currentFont = details.font;
  const currentAlignment = details.xf.alignment;
  const currentBorder = details.border;

  const commitFontSize = () => {
    dispatch({
      type: "SET_SELECTION_FORMAT",
      range: targetRange,
      format: { font: { ...currentFont, size: fontSizeDraft } },
    });
  };

  const commitFontColor = () => {
    const hex = normalizeRgbHexInput(fontColorDraft);
    if (!hex) {
      window.alert("Font color must be a 6-digit hex value like #RRGGBB");
      return;
    }
    dispatch({
      type: "SET_SELECTION_FORMAT",
      range: targetRange,
      format: { font: { ...currentFont, color: makeXlsxRgbColor(hex) } },
    });
  };

  const clearFontColor = () => {
    const { color: removed, ...without } = currentFont;
    void removed;
    dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { font: without } });
  };

  const commitFillColor = () => {
    const hex = normalizeRgbHexInput(fillColorDraft);
    if (!hex) {
      window.alert("Fill color must be a 6-digit hex value like #RRGGBB");
      return;
    }
    dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { fill: setSolidFill(hex) } });
  };

  const clearFill = () => {
    dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { fill: { type: "none" } } });
  };

  const commitBorderColor = () => {
    const hex = normalizeRgbHexInput(borderColorDraft);
    if (!hex) {
      window.alert("Border color must be a 6-digit hex value like #RRGGBB");
      return;
    }
    const color = makeXlsxRgbColor(hex);
    const next: XlsxBorder = {
      ...currentBorder,
      left: currentBorder.left ? { ...currentBorder.left, color } : undefined,
      right: currentBorder.right ? { ...currentBorder.right, color } : undefined,
      top: currentBorder.top ? { ...currentBorder.top, color } : undefined,
      bottom: currentBorder.bottom ? { ...currentBorder.bottom, color } : undefined,
    };
    dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { border: next } });
  };

  const commitCustomFormat = () => {
    const trimmed = customFormatDraft.trim();
    if (trimmed.length === 0) {
      window.alert("Format code must not be empty");
      return;
    }
    dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { numberFormat: { type: "custom", formatCode: trimmed } } });
  };

  const applyDecimalFormat = () => {
    const formatCode = buildDecimalFormat({ decimals: decimalPlaces, thousands: useThousands });
    setCustomFormatDraft(formatCode);
    dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { numberFormat: { type: "custom", formatCode } } });
  };

  return (
    <Panel
      title="Format"
      width={320}
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      {onClose && (
        <div style={{ padding: spacingTokens.sm, borderBottom: "1px solid var(--border-subtle)" }}>
          <Button size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      )}

      <Accordion title="Font" defaultExpanded>
        <FieldGroup label="Family">
          <Select
            value={currentFont.name}
            options={fontNameOptions}
            disabled={disableInputs}
            onChange={(name) => {
              dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { font: { ...currentFont, name } } });
            }}
          />
        </FieldGroup>

        <FieldRow>
          <FieldGroup label="Size">
            <Input
              type="number"
              value={fontSizeDraft}
              disabled={disableInputs}
              min={1}
              max={200}
              onChange={(value) => setFontSizeDraft(Number(value))}
              suffix="pt"
              width={120}
            />
          </FieldGroup>
          <Button size="sm" disabled={disableInputs} onClick={commitFontSize}>
            Apply
          </Button>
        </FieldRow>

        <FieldRow>
          <ToggleButton
            label="B"
            pressed={currentFont.bold === true}
            disabled={disableInputs}
            onChange={(pressed) => {
              dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { font: toggleFontFlag(currentFont, "bold", pressed) } });
            }}
          />
          <ToggleButton
            label="I"
            pressed={currentFont.italic === true}
            disabled={disableInputs}
            onChange={(pressed) => {
              dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { font: toggleFontFlag(currentFont, "italic", pressed) } });
            }}
          />
          <ToggleButton
            label="U"
            pressed={currentFont.underline !== undefined && currentFont.underline !== "none"}
            disabled={disableInputs}
            onChange={(pressed) => {
              dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { font: setUnderline(currentFont, pressed) } });
            }}
          />
          <ToggleButton
            label="S"
            ariaLabel="Strikethrough"
            pressed={currentFont.strikethrough === true}
            disabled={disableInputs}
            onChange={(pressed) => {
              dispatch({
                type: "SET_SELECTION_FORMAT",
                range: targetRange,
                format: { font: toggleFontFlag(currentFont, "strikethrough", pressed) },
              });
            }}
          />
        </FieldRow>

        <FieldRow>
          <FieldGroup label="Color">
            <Input
              value={fontColorDraft}
              placeholder="#RRGGBB"
              disabled={disableInputs}
              onChange={(value) => setFontColorDraft(String(value))}
              width={160}
            />
          </FieldGroup>
          <Button size="sm" disabled={disableInputs} onClick={commitFontColor}>
            Apply
          </Button>
          <Button size="sm" disabled={disableInputs} onClick={clearFontColor}>
            Clear
          </Button>
        </FieldRow>
      </Accordion>

      <Accordion title="Fill" defaultExpanded>
        <FieldRow>
          <FieldGroup label="Background">
            <Input
              value={fillColorDraft}
              placeholder="#RRGGBB"
              disabled={disableInputs}
              onChange={(value) => setFillColorDraft(String(value))}
              width={160}
            />
          </FieldGroup>
          <Button size="sm" disabled={disableInputs} onClick={commitFillColor}>
            Apply
          </Button>
          <Button size="sm" disabled={disableInputs} onClick={clearFill}>
            None
          </Button>
        </FieldRow>
      </Accordion>

      <Accordion title="Alignment">
        <FieldGroup label="Horizontal">
          <Select
            value={currentAlignment?.horizontal ?? ""}
            options={HORIZONTAL_OPTIONS}
            disabled={disableInputs}
            onChange={(horizontal) => {
              const base: XlsxAlignment = { ...(currentAlignment ?? {}) };
              if (horizontal === "") {
                const { horizontal: removed, ...rest } = base;
                void removed;
                dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { alignment: rest } });
                return;
              }
              dispatch({
                type: "SET_SELECTION_FORMAT",
                range: targetRange,
                format: { alignment: { ...base, horizontal: parseHorizontalAlignment(horizontal) } },
              });
            }}
          />
        </FieldGroup>
        <FieldGroup label="Vertical">
          <Select
            value={currentAlignment?.vertical ?? ""}
            options={VERTICAL_OPTIONS}
            disabled={disableInputs}
            onChange={(vertical) => {
              const base: XlsxAlignment = { ...(currentAlignment ?? {}) };
              if (vertical === "") {
                const { vertical: removed, ...rest } = base;
                void removed;
                dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { alignment: rest } });
                return;
              }
              dispatch({
                type: "SET_SELECTION_FORMAT",
                range: targetRange,
                format: { alignment: { ...base, vertical: parseVerticalAlignment(vertical) } },
              });
            }}
          />
        </FieldGroup>
        <FieldRow>
          <Toggle
            label="Wrap text"
            checked={currentAlignment?.wrapText === true}
            disabled={disableInputs}
            onChange={(checked) => {
              dispatch({
                type: "SET_SELECTION_FORMAT",
                range: targetRange,
                format: { alignment: { ...(currentAlignment ?? {}), wrapText: checked } },
              });
            }}
          />
          <Button
            size="sm"
            disabled={disableInputs}
            onClick={() => dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { alignment: null } })}
          >
            Clear
          </Button>
        </FieldRow>
      </Accordion>

      <Accordion title="Border">
        <FieldGroup label="Left">
          <Select
            value={borderEdgeStyle(currentBorder.left)}
            options={BORDER_STYLE_OPTIONS}
            disabled={disableInputs}
            onChange={(value) => {
              const nextEdge = value === "" ? undefined : ({ style: value } satisfies XlsxBorderEdge);
              dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { border: updateBorderEdge(currentBorder, "left", nextEdge) } });
            }}
          />
        </FieldGroup>
        <FieldGroup label="Right">
          <Select
            value={borderEdgeStyle(currentBorder.right)}
            options={BORDER_STYLE_OPTIONS}
            disabled={disableInputs}
            onChange={(value) => {
              const nextEdge = value === "" ? undefined : ({ style: value } satisfies XlsxBorderEdge);
              dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { border: updateBorderEdge(currentBorder, "right", nextEdge) } });
            }}
          />
        </FieldGroup>
        <FieldGroup label="Top">
          <Select
            value={borderEdgeStyle(currentBorder.top)}
            options={BORDER_STYLE_OPTIONS}
            disabled={disableInputs}
            onChange={(value) => {
              const nextEdge = value === "" ? undefined : ({ style: value } satisfies XlsxBorderEdge);
              dispatch({ type: "SET_SELECTION_FORMAT", range: targetRange, format: { border: updateBorderEdge(currentBorder, "top", nextEdge) } });
            }}
          />
        </FieldGroup>
        <FieldGroup label="Bottom">
          <Select
            value={borderEdgeStyle(currentBorder.bottom)}
            options={BORDER_STYLE_OPTIONS}
            disabled={disableInputs}
            onChange={(value) => {
              const nextEdge = value === "" ? undefined : ({ style: value } satisfies XlsxBorderEdge);
              dispatch({
                type: "SET_SELECTION_FORMAT",
                range: targetRange,
                format: { border: updateBorderEdge(currentBorder, "bottom", nextEdge) },
              });
            }}
          />
        </FieldGroup>

        <FieldRow>
          <FieldGroup label="Color">
            <Input
              value={borderColorDraft}
              placeholder="#RRGGBB"
              disabled={disableInputs}
              onChange={(value) => setBorderColorDraft(String(value))}
              width={160}
            />
          </FieldGroup>
          <Button size="sm" disabled={disableInputs} onClick={commitBorderColor}>
            Apply
          </Button>
        </FieldRow>
      </Accordion>

      <Accordion title="Number">
        <FieldGroup label="Built-in">
          <Select
            value={String(details.xf.numFmtId)}
            options={BUILTIN_FORMAT_OPTIONS}
            disabled={disableInputs}
            onChange={(value) => {
              dispatch({
                type: "SET_SELECTION_FORMAT",
                range: targetRange,
                format: { numberFormat: { type: "builtin", numFmtId: Number.parseInt(value, 10) } },
              });
            }}
          />
        </FieldGroup>

        <FieldRow>
          <FieldGroup label="Decimals">
            <Input
              type="number"
              value={decimalPlaces}
              min={0}
              max={20}
              disabled={disableInputs}
              onChange={(value) => setDecimalPlaces(Number(value))}
              width={120}
            />
          </FieldGroup>
          <Toggle label="Thousands" checked={useThousands} disabled={disableInputs} onChange={setUseThousands} />
          <Button size="sm" disabled={disableInputs} onClick={applyDecimalFormat}>
            Apply
          </Button>
        </FieldRow>

        <FieldRow>
          <FieldGroup label="Format code">
            <Input
              value={customFormatDraft}
              disabled={disableInputs}
              onChange={(value) => setCustomFormatDraft(String(value))}
              width={220}
            />
          </FieldGroup>
          <Button size="sm" disabled={disableInputs} onClick={commitCustomFormat}>
            Apply
          </Button>
        </FieldRow>
      </Accordion>
    </Panel>
  );
}
