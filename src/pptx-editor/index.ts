/**
 * @file PPTX Editor - React-based editor components for PPTX domain types
 *
 * This module provides editor components for editing PPTX domain objects.
 * Each editor is designed to be context-agnostic and can be used in
 * various mounting contexts (inline, popup, sidebar, context menu, etc.).
 *
 * @example
 * ```tsx
 * import { TransformEditor, ColorEditor, EditorConfigProvider } from "@lib/pptx-editor";
 *
 * function ShapePanel({ shape, onUpdate }) {
 *   return (
 *     <EditorConfigProvider config={{ compactMode: true }}>
 *       <TransformEditor
 *         value={shape.transform}
 *         onChange={(t) => onUpdate({ ...shape, transform: t })}
 *       />
 *     </EditorConfigProvider>
 *   );
 * }
 * ```
 */

// Types
export type {
  EditorProps,
  EditorState,
  EditorAction,
  InputType,
  ButtonVariant,
  SelectOption,
} from "./types";

// Context - EditorConfig
export {
  EditorConfigProvider,
  useEditorConfig,
  type EditorConfig,
} from "./context/EditorConfigContext";

// Hooks
export {
  createEditorReducer,
  useEditorReducer,
  simpleUpdate,
  nestedUpdate,
  type UpdateFn,
} from "./hooks";

// UI Primitives
export {
  Button,
  Input,
  Popover,
  Select,
  Slider,
  Tabs,
  Toggle,
  type ButtonProps,
  type InputProps,
  type PopoverProps,
  type SelectProps,
  type SliderProps,
  type TabItem,
  type TabsProps,
  type ToggleProps,
} from "./ui/primitives";

// UI Layout
export {
  Accordion,
  FieldGroup,
  FieldRow,
  Panel,
  type AccordionProps,
  type FieldGroupProps,
  type FieldRowProps,
  type PanelProps,
} from "./ui/layout";

// UI Color
export {
  ColorSwatch,
  type ColorSwatchProps,
  type ColorSwatchSize,
} from "./ui/color";

// Editors
export {
  // Primitives
  PixelsEditor,
  DegreesEditor,
  PercentEditor,
  PointsEditor,
  TransformEditor,
  createDefaultTransform,
  type PixelsEditorProps,
  type DegreesEditorProps,
  type PercentEditorProps,
  type PointsEditorProps,
  type TransformEditorProps,
  // Color
  ColorSpecEditor,
  ColorTransformEditor,
  ColorEditor,
  FillEditor,
  LineEditor,
  createDefaultSrgbColor,
  createDefaultColor,
  createDefaultSolidFill,
  createNoFill,
  createDefaultLine,
  type ColorSpecEditorProps,
  type ColorTransformEditorProps,
  type ColorEditorProps,
  type FillEditorProps,
  type LineEditorProps,
  // Text
  RunPropertiesEditor,
  LineSpacingEditor,
  BulletStyleEditor,
  ParagraphPropertiesEditor,
  TextBodyEditor,
  createDefaultRunProperties,
  createDefaultLineSpacing,
  createDefaultBulletStyle,
  createDefaultParagraphProperties,
  createDefaultTextBody,
  type RunPropertiesEditorProps,
  type LineSpacingEditorProps,
  type BulletStyleEditorProps,
  type ParagraphPropertiesEditorProps,
  type TextBodyEditorProps,
  // Shape
  NonVisualPropertiesEditor,
  EffectsEditor,
  GeometryEditor,
  ShapePropertiesEditor,
  createDefaultNonVisualProperties,
  createDefaultEffects,
  createDefaultGeometry,
  createDefaultShapeProperties,
  type NonVisualPropertiesEditorProps,
  type EffectsEditorProps,
  type GeometryEditorProps,
  type ShapePropertiesEditorProps,
  // Table
  TableCellPropertiesEditor,
  TableCellEditor,
  TablePropertiesEditor,
  TableEditor,
  createDefaultCellBorders,
  createAllEdgeBorders,
  createDefaultCell3d,
  createDefaultBevel,
  createDefaultLightRig,
  createDefaultCellMargins,
  createDefaultTableCellProperties,
  createDefaultTableCell,
  createEmptyTableCell,
  createDefaultTableProperties,
  createDefaultTable,
  createTable,
  type TableCellPropertiesEditorProps,
  type TableCellEditorProps,
  type TablePropertiesEditorProps,
  type TableEditorProps,
  // Chart
  DataLabelsEditor,
  LegendEditor,
  AxisEditor,
  ChartSeriesEditor,
  ChartEditor,
  createDefaultDataLabels,
  createDefaultLegend,
  createDefaultAxis,
  createDefaultCategoryAxis,
  createDefaultValueAxis,
  createDefaultChartSeries,
  createDefaultBarChartSeries,
  createDefaultChart,
  type DataLabelsEditorProps,
  type LegendEditorProps,
  type AxisEditorProps,
  type ChartSeriesEditorProps,
  type ChartEditorProps,
  // Diagram
  DiagramEditor,
  DiagramPointEditor,
  DiagramConnectionEditor,
  createDefaultDiagramDataModel,
  createDefaultDiagramPoint,
  createDefaultDiagramConnection,
  type DiagramEditorProps,
  type DiagramPointEditorProps,
  type DiagramConnectionEditorProps,
  // Slide-level
  BackgroundEditor,
  TransitionEditor,
  createDefaultBackground,
  createDefaultTransition,
  type BackgroundEditorProps,
  type TransitionEditorProps,
  // OLE object
  OleObjectEditor,
  createDefaultOleReference,
  type OleObjectEditorProps,
} from "./editors";

// Slide Editor Types
export type { ShapeId } from "./slide/types";
export {
  type SelectionState,
  type ResizeHandlePosition,
  type DragState,
  type UndoRedoHistory,
  type ClipboardContent,
  type SlideEditorState,
  type SlideEditorAction,
  type SlideEditorContextValue,
  createEmptySelection,
  createIdleDragState,
  createHistory,
  pushHistory,
  undoHistory,
  redoHistory,
  createSlideEditorState,
} from "./slide/types";

// Slide Editor Context
export {
  SlideEditorProvider,
  useSlideEditor,
  useSlideEditorOptional,
} from "./slide/context";

// Slide Editor Hooks
export { useSlideState, type UseSlideStateResult, type MultiShapeTransformUpdate } from "./slide/hooks/useSlideState";
export { useSelection, type UseSelectionResult } from "./slide/hooks/useSelection";
export { useDragMove, type UseDragMoveOptions, type UseDragMoveResult } from "./slide/hooks/useDragMove";
export { useDragResize, type UseDragResizeOptions, type UseDragResizeResult } from "./slide/hooks/useDragResize";
export { useDragRotate, type UseDragRotateOptions, type UseDragRotateResult } from "./slide/hooks/useDragRotate";
export { useClipboard, type UseClipboardResult } from "./slide/hooks/useClipboard";
export { useKeyboardShortcuts, type UseKeyboardShortcutsOptions, type UseKeyboardShortcutsResult } from "./slide/hooks/useKeyboardShortcuts";

// Slide Editor Components
export { SlideEditor, type SlideEditorProps } from "./slide/SlideEditor";
export { SlideCanvas, type SlideCanvasProps } from "./slide/SlideCanvas";
export { ShapeSelector, type ShapeSelectorProps } from "./slide/ShapeSelector";
export { PropertyPanel, type PropertyPanelProps } from "./slide/PropertyPanel";
export { ShapeToolbar, type ShapeToolbarProps } from "./slide/ShapeToolbar";
export { LayerPanel, type LayerPanelProps } from "./slide/LayerPanel";

// Slide Editor Sub-components
export { SelectionBox, type SelectionBoxProps } from "./slide/components/SelectionBox";
export { ResizeHandle, type ResizeHandleProps } from "./slide/components/ResizeHandle";
export { RotateHandle, type RotateHandleProps } from "./slide/components/RotateHandle";
export { MultiSelectionBox, type MultiSelectionBoxProps } from "./slide/components/MultiSelectionBox";

// Shape identity utilities
export { getShapeId, hasShapeId } from "./slide/shape/identity";

// Shape query utilities
export { findShapeById, findShapeByIdWithParents, getTopLevelShapeIds, isTopLevelShape } from "./slide/shape/query";

// Shape bounds utilities
export { getShapeBounds, getCombinedBounds } from "./slide/shape/bounds";

// Shape transform utilities
export {
  getShapeTransform,
  withUpdatedTransform,
  hasEditableTransform,
  getAbsoluteBounds,
  type AbsoluteBounds,
} from "./slide/shape/transform";

// Shape coordinate utilities
export { clientToSlideCoords } from "./slide/shape/coords";

// Shape capabilities
export { getShapeCapabilities, type ShapeCapabilities } from "./slide/shape/capabilities";
