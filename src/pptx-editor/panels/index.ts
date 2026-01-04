/**
 * @file Panel components for PPTX editor
 *
 * Mountable panel/toolbar components:
 * - PropertyPanel: Shape/slide property editor (right panel)
 * - LayerPanel: Shape hierarchy view (right panel)
 * - SlideThumbnailPanel: Slide navigation (left panel)
 * - CreationToolbar: Shape creation tools (toolbar)
 * - ShapeToolbar: Shape editing tools (toolbar)
 */

export { PropertyPanel } from "./PropertyPanel";
export type { PropertyPanelProps } from "./PropertyPanel";

export { LayerPanel } from "./LayerPanel";
export type { LayerPanelProps } from "./LayerPanel";

export { SlideThumbnailPanel } from "./SlideThumbnailPanel";
export type { SlideThumbnailPanelProps } from "./SlideThumbnailPanel";

export { CreationToolbar } from "./CreationToolbar";
export type { CreationToolbarProps } from "./CreationToolbar";

export { ShapeToolbar } from "./ShapeToolbar";
export type { ShapeToolbarProps } from "./ShapeToolbar";

// Property sub-panels (internal components used by PropertyPanel)
export { SlidePropertiesPanel } from "./property/SlidePropertiesPanel";
export { MultiSelectState } from "./property/MultiSelectState";
export { SpShapePanel } from "./property/SpShapePanel";
export { PicShapePanel } from "./property/PicShapePanel";
export { CxnShapePanel } from "./property/CxnShapePanel";
export { GrpShapePanel } from "./property/GrpShapePanel";
export { TableFramePanel } from "./property/TableFramePanel";
export { ChartFramePanel } from "./property/ChartFramePanel";
export { DiagramFramePanel } from "./property/DiagramFramePanel";
export { OleFramePanel } from "./property/OleFramePanel";
export { UnknownShapePanel } from "./property/UnknownShapePanel";
