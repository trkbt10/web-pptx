/**
 * @file Presentation module entry point
 *
 * Presentation-level editor for managing slides within a PPTX document.
 */

// =============================================================================
// Types
// =============================================================================
export type {
  SlideId,
  PresentationDocument,
  SlideWithId,
  PresentationEditorState,
  PresentationEditorAction,
  PresentationEditorContextValue,
} from "./types";

// =============================================================================
// Document Operations
// =============================================================================
export {
  generateSlideId,
  findSlideById,
  getSlideIndex,
  addSlide,
  deleteSlide,
  duplicateSlide,
  moveSlide,
  updateSlide,
  createDocumentFromPresentation,
  createEmptyDocument,
} from "./document-ops";

// =============================================================================
// State Management
// =============================================================================
export {
  createPresentationEditorState,
  presentationEditorReducer,
} from "./reducer/reducer";

// =============================================================================
// Context
// =============================================================================
export {
  PresentationEditorProvider,
  usePresentationEditor,
  usePresentationEditorOptional,
} from "./context";

// =============================================================================
// Components
// =============================================================================
export { PresentationEditor } from "./PresentationEditor";
export type { PresentationEditorProps } from "./PresentationEditor";
export { SlideThumbnailPanel } from "../panels/SlideThumbnailPanel";
export type { SlideThumbnailPanelProps } from "../panels/SlideThumbnailPanel";
