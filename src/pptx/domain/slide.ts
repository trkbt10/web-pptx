/**
 * @file Slide domain types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 19.3 - Presentation ML
 */

import type { Color, Fill } from "./color";
import type { Shape } from "./shape";
import type { ParagraphProperties, RunProperties } from "./text";
import type { Pixels, ResourceId, ShapeId } from "./types";

// =============================================================================
// Slide Types
// =============================================================================

/**
 * Slide dimensions
 * @see ECMA-376 Part 1, Section 19.2.1.34 (sldSz)
 */
export type SlideSize = {
  readonly width: Pixels;
  readonly height: Pixels;
  readonly type?: SlideSizeType;
};

/**
 * Predefined slide size type
 * @see ECMA-376 Part 1, Section 19.7.24 (ST_SlideSizeType)
 */
export type SlideSizeType =
  | "screen4x3"
  | "letter"
  | "A4"
  | "35mm"
  | "overhead"
  | "banner"
  | "custom"
  | "ledger"
  | "A3"
  | "B4ISO"
  | "B5ISO"
  | "B4JIS"
  | "B5JIS"
  | "hagakiCard"
  | "screen16x9"
  | "screen16x10";

/**
 * Background properties
 * @see ECMA-376 Part 1, Section 19.3.1.1 (bg)
 */
export type Background = {
  readonly fill: Fill;
  readonly shadeToTitle?: boolean;
};

/**
 * Slide transition
 * @see ECMA-376 Part 1, Section 19.5 (transition)
 */
export type SlideTransition = {
  readonly type: TransitionType;
  readonly duration?: number; // milliseconds
  readonly advanceOnClick?: boolean;
  readonly advanceAfter?: number; // milliseconds
  readonly sound?: TransitionSound;
};

/**
 * Transition type
 * @see ECMA-376 Part 1, Section 19.7.27 (ST_TransitionType)
 */
export type TransitionType =
  | "blinds"
  | "checker"
  | "circle"
  | "comb"
  | "cover"
  | "cut"
  | "diamond"
  | "dissolve"
  | "fade"
  | "newsflash"
  | "plus"
  | "pull"
  | "push"
  | "random"
  | "randomBar"
  | "split"
  | "strips"
  | "wedge"
  | "wheel"
  | "wipe"
  | "zoom"
  | "none";

/**
 * Transition sound
 */
export type TransitionSound = {
  readonly resourceId: string;
  readonly name?: string;
  readonly loop?: boolean;
};

/**
 * Transition corner direction.
 * @see ECMA-376 Part 1, Section 19.7.50 (ST_TransitionCornerDirectionType)
 */
export type TransitionCornerDirectionType =
  | "ld"
  | "lu"
  | "rd"
  | "ru";

/**
 * Transition side direction.
 * @see ECMA-376 Part 1, Section 19.7.53 (ST_TransitionSideDirectionType)
 */
export type TransitionSideDirectionType =
  | "d"
  | "l"
  | "r"
  | "u";

/**
 * Transition eight direction.
 * @see ECMA-376 Part 1, Section 19.7.51 (ST_TransitionEightDirectionType)
 */
export type TransitionEightDirectionType =
  | TransitionCornerDirectionType
  | TransitionSideDirectionType;

/**
 * Transition in/out direction.
 * @see ECMA-376 Part 1, Section 19.7.52 (ST_TransitionInOutDirectionType)
 */
export type TransitionInOutDirectionType =
  | "in"
  | "out";

/**
 * Transition speed.
 * @see ECMA-376 Part 1, Section 19.7.54 (ST_TransitionSpeed)
 */
export type TransitionSpeed =
  | "fast"
  | "med"
  | "slow";

/**
 * Color map override
 * @see ECMA-376 Part 1, Section 19.3.1.6 (clrMapOvr)
 */
export type ColorMapOverride =
  | { readonly type: "none" }
  | { readonly type: "override"; readonly mappings: ColorMapping };

/**
 * Color mapping scheme
 * @see ECMA-376 Part 1, Section 20.1.6.3 (clrMap)
 */
export type ColorMapping = {
  readonly bg1?: string;
  readonly tx1?: string;
  readonly bg2?: string;
  readonly tx2?: string;
  readonly accent1?: string;
  readonly accent2?: string;
  readonly accent3?: string;
  readonly accent4?: string;
  readonly accent5?: string;
  readonly accent6?: string;
  readonly hlink?: string;
  readonly folHlink?: string;
};

/**
 * Timing information
 * @see ECMA-376 Part 1, Section 19.5.87 (timing)
 */
export type SlideTiming = {
  readonly buildList?: readonly BuildEntry[];
  readonly sequences?: readonly AnimationSequence[];
};

/**
 * Build entry for incremental animations
 */
export type BuildEntry = {
  readonly shapeId: ShapeId;
  readonly groupId?: number;
  readonly order?: number;
};

/**
 * Animation sequence
 */
export type AnimationSequence = {
  readonly concurrent?: boolean;
  readonly prevAction?: "none" | "skip";
  readonly nextAction?: "none" | "seek";
  readonly animations: readonly Animation[];
};

/**
 * Animation definition
 */
export type Animation = {
  readonly shapeId: ShapeId;
  readonly preset: string;
  readonly duration: number;
  readonly delay?: number;
};

/**
 * Complete slide definition
 * @see ECMA-376 Part 1, Section 19.3.1.38 (sld)
 */
export type Slide = {
  readonly background?: Background;
  readonly shapes: readonly Shape[];
  readonly colorMapOverride?: ColorMapOverride;
  readonly customerData?: readonly CustomerData[];
  readonly transition?: SlideTransition;
  readonly timing?: SlideTiming;
  readonly showMasterShapes?: boolean;
  readonly showMasterPhAnim?: boolean;
};

/**
 * Slide layout definition
 * @see ECMA-376 Part 1, Section 19.3.1.39 (sldLayout)
 */
export type SlideLayout = {
  readonly type: SlideLayoutType;
  readonly name?: string;
  readonly matchingName?: string;
  readonly background?: Background;
  readonly shapes: readonly Shape[];
  readonly colorMapOverride?: ColorMapOverride;
  readonly customerData?: readonly CustomerData[];
  readonly transition?: SlideTransition;
  readonly timing?: SlideTiming;
  readonly showMasterShapes?: boolean;
  readonly showMasterPhAnim?: boolean;
  readonly preserve?: boolean;
  readonly userDrawn?: boolean;
};

/**
 * Slide layout type
 * @see ECMA-376 Part 1, Section 19.7.15 (ST_SlideLayoutType)
 */
export type SlideLayoutType =
  | "title"
  | "tx"
  | "twoColTx"
  | "tbl"
  | "txAndChart"
  | "chartAndTx"
  | "dgm"
  | "chart"
  | "txAndClipArt"
  | "clipArtAndTx"
  | "titleOnly"
  | "blank"
  | "txAndObj"
  | "objAndTx"
  | "objOnly"
  | "obj"
  | "txAndMedia"
  | "mediaAndTx"
  | "objOverTx"
  | "txOverObj"
  | "txAndTwoObj"
  | "twoObjAndTx"
  | "twoObjOverTx"
  | "fourObj"
  | "vertTx"
  | "clipArtAndVertTx"
  | "vertTitleAndTx"
  | "vertTitleAndTxOverChart"
  | "twoObj"
  | "objAndTwoObj"
  | "twoObjAndObj"
  | "cust"
  | "secHead"
  | "twoTxTwoObj"
  | "objTx"
  | "picTx";

/**
 * Slide layout ID entry.
 * @see ECMA-376 Part 1, Section 19.3.1.40 (sldLayoutId)
 */
export type SlideLayoutId = {
  readonly id: number;
  readonly rId: ResourceId;
};

/**
 * Slide master definition
 * @see ECMA-376 Part 1, Section 19.3.1.41 (sldMaster)
 */
export type SlideMaster = {
  readonly background?: Background;
  readonly shapes: readonly Shape[];
  readonly colorMap: ColorMapping;
  readonly slideLayoutIds?: readonly SlideLayoutId[];
  readonly customerData?: readonly CustomerData[];
  readonly textStyles?: MasterTextStyles;
  readonly timing?: SlideTiming;
  readonly transition?: SlideTransition;
  readonly preserve?: boolean;
};

/**
 * Handout master definition
 * @see ECMA-376 Part 1, Section 19.3.1.24 (handoutMaster)
 */
export type HandoutMaster = {
  readonly background?: Background;
  readonly shapes: readonly Shape[];
  readonly colorMap: ColorMapping;
  readonly customerData?: readonly CustomerData[];
  readonly preserve?: boolean;
};

/**
 * Notes master definition
 * @see ECMA-376 Part 1, Section 19.3.1.27 (notesMaster)
 */
export type NotesMaster = {
  readonly background?: Background;
  readonly shapes: readonly Shape[];
  readonly colorMap: ColorMapping;
  readonly customerData?: readonly CustomerData[];
  readonly notesStyle?: TextStyleLevels;
  readonly preserve?: boolean;
};

/**
 * Customer data reference.
 * @see ECMA-376 Part 1, Section 19.3.1.17 (custData)
 */
export type CustomerData = {
  readonly rId: ResourceId;
};

/**
 * Master text styles
 * @see ECMA-376 Part 1, Section 19.3.1.47 (txStyles)
 */
export type MasterTextStyles = {
  readonly titleStyle?: TextStyleLevels;
  readonly bodyStyle?: TextStyleLevels;
  readonly otherStyle?: TextStyleLevels;
};

/**
 * Text style levels (1-9)
 */
export type TextStyleLevels = {
  readonly defaultStyle?: TextLevelStyle;
  readonly level1?: TextLevelStyle;
  readonly level2?: TextLevelStyle;
  readonly level3?: TextLevelStyle;
  readonly level4?: TextLevelStyle;
  readonly level5?: TextLevelStyle;
  readonly level6?: TextLevelStyle;
  readonly level7?: TextLevelStyle;
  readonly level8?: TextLevelStyle;
  readonly level9?: TextLevelStyle;
};

/**
 * Text level style properties
 */
export type TextLevelStyle = {
  readonly defaultRunProperties?: RunProperties;
  readonly paragraphProperties?: ParagraphProperties;
};

/**
 * Custom show definition.
 * @see ECMA-376 Part 1, Section 19.2.1.5 (custShow)
 */
export type CustomShow = {
  readonly id: number;
  readonly name: string;
  readonly slideIds: string[];
};

/**
 * Slide show range definition.
 * @see ECMA-376 Part 1, Section 19.2.1.38 (sldRg)
 */
export type SlideShowRange =
  | { readonly type: "all" }
  | { readonly type: "range"; readonly start: number; readonly end: number }
  | { readonly type: "list"; readonly slideIds: string[] };

/**
 * Browse slide show settings.
 * @see ECMA-376 Part 1, Section 19.2.1.3 (browse)
 */
export type BrowseShowProperties = {
  readonly showScrollbar?: boolean;
};

/**
 * Kiosk slide show settings.
 * @see ECMA-376 Part 1, Section 19.2.1.18 (kiosk)
 */
export type KioskShowProperties = {
  readonly restart?: number;
};

/**
 * Presenter slide show settings.
 * @see ECMA-376 Part 1, Section 19.2.1.25 (present)
 */
export type PresentShowProperties = Record<string, never>;

/**
 * Presentation show properties.
 * @see ECMA-376 Part 1, Section 19.2.1.30 (showPr)
 */
export type ShowProperties = {
  readonly browse?: BrowseShowProperties;
  readonly kiosk?: KioskShowProperties;
  readonly present?: PresentShowProperties;
  readonly slideRange?: SlideShowRange;
  readonly penColor?: Color;
  readonly showNarration?: boolean;
  readonly useTimings?: boolean;
};

/**
 * Presentation properties (presProps.xml).
 * @see ECMA-376 Part 1, Section 19.2.1.27 (presentationPr)
 */
export type PresentationProperties = {
  readonly showProperties?: ShowProperties;
  readonly recentColors?: Color[];
  readonly printProperties?: PrintProperties;
};

/**
 * Slide synchronization properties.
 * @see ECMA-376 Part 1, Section 19.6.1 (sldSyncPr)
 */
export type SlideSyncProperties = {
  readonly clientInsertedTime?: string;
  readonly serverSldId?: string;
  readonly serverSldModifiedTime?: string;
};

/**
 * View scale ratio.
 * @see ECMA-376 Part 1, Section 19.2.2.13 (scale)
 */
export type ViewScaleRatio = {
  readonly n: number;
  readonly d: number;
  readonly value: number;
};

/**
 * View scale.
 * @see ECMA-376 Part 1, Section 19.2.2.13 (scale)
 */
export type ViewScale = {
  readonly x: ViewScaleRatio;
  readonly y: ViewScaleRatio;
};

/**
 * View origin.
 * @see ECMA-376 Part 1, Section 19.2.2.9 (origin)
 */
export type ViewOrigin = {
  readonly x: number;
  readonly y: number;
};

/**
 * Common view properties.
 * @see ECMA-376 Part 1, Section 19.2.2.2 (cViewPr)
 */
export type CommonViewProperties = {
  readonly varScale?: boolean;
  readonly scale?: ViewScale;
  readonly origin?: ViewOrigin;
};

/**
 * Guide definition.
 * @see ECMA-376 Part 1, Section 19.2.2.4 (guide)
 */
export type Guide = {
  readonly orient?: Direction;
  readonly pos?: number;
};

/**
 * Direction (horizontal/vertical).
 * @see ECMA-376 Part 1, Section 19.7.2 (ST_Direction)
 */
export type Direction = "horz" | "vert";

/**
 * Guide list.
 * @see ECMA-376 Part 1, Section 19.2.2.5 (guideLst)
 */
export type GuideList = {
  readonly guides: Guide[];
};

/**
 * Common slide view properties.
 * @see ECMA-376 Part 1, Section 19.2.2.1 (cSldViewPr)
 */
export type CommonSlideViewProperties = {
  readonly showGuides?: boolean;
  readonly snapToGrid?: boolean;
  readonly snapToObjects?: boolean;
  readonly commonView?: CommonViewProperties;
  readonly guideList?: GuideList;
};

/**
 * Normal view portion.
 * @see ECMA-376 Part 1, Section 19.2.2.11/12 (restoredLeft/restoredTop)
 */
export type NormalViewPortion = {
  readonly autoAdjust?: boolean;
  readonly size?: number;
};

/**
 * Splitter bar state.
 * @see ECMA-376 Part 1, Section 19.7.19 (ST_SplitterBarState)
 */
export type SplitterBarState = "maximized" | "minimized" | "restored";

/**
 * Normal view properties.
 * @see ECMA-376 Part 1, Section 19.2.2.6 (normalViewPr)
 */
export type NormalViewProperties = {
  readonly horzBarState?: SplitterBarState;
  readonly vertBarState?: SplitterBarState;
  readonly preferSingleView?: boolean;
  readonly showOutlineIcons?: boolean;
  readonly snapVertSplitter?: boolean;
  readonly restoredLeft?: NormalViewPortion;
  readonly restoredTop?: NormalViewPortion;
};

/**
 * Outline view slide entry.
 * @see ECMA-376 Part 1, Section 19.2.2.14 (sld)
 */
export type OutlineViewSlide = {
  readonly rId: string;
  readonly collapse?: boolean;
};

/**
 * Outline view slide list.
 * @see ECMA-376 Part 1, Section 19.2.2.15 (sldLst)
 */
export type OutlineViewSlideList = {
  readonly slides: OutlineViewSlide[];
};

/**
 * Outline view properties.
 * @see ECMA-376 Part 1, Section 19.2.2.10 (outlineViewPr)
 */
export type OutlineViewProperties = {
  readonly commonView?: CommonViewProperties;
  readonly slideList?: OutlineViewSlideList;
};

/**
 * Notes text view properties.
 * @see ECMA-376 Part 1, Section 19.2.2.7 (notesTextViewPr)
 */
export type NotesTextViewProperties = {
  readonly commonView?: CommonViewProperties;
};

/**
 * Notes view properties.
 * @see ECMA-376 Part 1, Section 19.2.2.8 (notesViewPr)
 */
export type NotesViewProperties = {
  readonly commonView?: CommonViewProperties;
};

/**
 * Slide view properties.
 * @see ECMA-376 Part 1, Section 19.2.2.16 (slideViewPr)
 */
export type SlideViewProperties = {
  readonly commonSlideView?: CommonSlideViewProperties;
};

/**
 * Slide sorter view properties.
 * @see ECMA-376 Part 1, Section 19.2.2.17 (sorterViewPr)
 */
export type SorterViewProperties = {
  readonly commonView?: CommonViewProperties;
  readonly showFormatting?: boolean;
};

/**
 * Grid spacing.
 * @see ECMA-376 Part 1, Section 19.2.2.3 (gridSpacing)
 */
export type GridSpacing = {
  readonly cx?: number;
  readonly cy?: number;
};

/**
 * View properties.
 * @see ECMA-376 Part 1, Section 19.2.2.18 (viewPr)
 */
export type ViewProperties = {
  readonly lastView?: ViewType;
  readonly showComments?: boolean;
  readonly normalView?: NormalViewProperties;
  readonly slideView?: SlideViewProperties;
  readonly outlineView?: OutlineViewProperties;
  readonly notesTextView?: NotesTextViewProperties;
  readonly notesView?: NotesViewProperties;
  readonly sorterView?: SorterViewProperties;
  readonly gridSpacing?: GridSpacing;
};

/**
 * View types.
 * @see ECMA-376 Part 1, Section 19.7.55 (ST_ViewType)
 */
export type ViewType =
  | "handoutView"
  | "notesMasterView"
  | "notesView"
  | "outlineView"
  | "sldMasterView"
  | "sldSorterView"
  | "sldThumbnailView"
  | "sldView";

/**
 * Modification verifier for write protection.
 * @see ECMA-376 Part 1, Section 19.2.1.19 (modifyVerifier)
 */
export type ModifyVerifier = {
  readonly algorithmName?: string;
  readonly hashValue?: string;
  readonly saltValue?: string;
  readonly spinCount?: number;
};

/**
 * Photo album settings.
 * @see ECMA-376 Part 1, Section 19.2.1.24 (photoAlbum)
 */
export type PhotoAlbum = {
  readonly blackAndWhite?: boolean;
  readonly frame?: PhotoAlbumFrameShape;
  readonly layout?: PhotoAlbumLayout;
  readonly showCaptions?: boolean;
};

/**
 * Photo album frame shape.
 * @see ECMA-376 Part 1, Section 19.7.7 (ST_PhotoAlbumFrameShape)
 */
export type PhotoAlbumFrameShape =
  | "frameStyle1"
  | "frameStyle2"
  | "frameStyle3"
  | "frameStyle4"
  | "frameStyle5"
  | "frameStyle6"
  | "frameStyle7";

/**
 * Photo album layout.
 * @see ECMA-376 Part 1, Section 19.7.8 (ST_PhotoAlbumLayout)
 */
export type PhotoAlbumLayout =
  | "1pic"
  | "1picTitle"
  | "2pic"
  | "2picTitle"
  | "4pic"
  | "4picTitle"
  | "fitToSlide";

/**
 * Smart tags reference.
 * @see ECMA-376 Part 1, Section 19.2.1.40 (smartTags)
 */
export type SmartTags = {
  readonly rId: string;
};

/**
 * Programmable tag entry.
 * @see ECMA-376 Part 1, Section 19.3.3.1 (tag)
 */
export type ProgrammableTag = {
  readonly name: string;
  readonly value?: string;
};

/**
 * Programmable tag list.
 * @see ECMA-376 Part 1, Section 19.3.3.2 (tagLst)
 */
export type ProgrammableTagList = {
  readonly tags: readonly ProgrammableTag[];
};

/**
 * Comment author.
 * @see ECMA-376 Part 1, Section 19.4.2 (cmAuthor)
 */
export type CommentAuthor = {
  readonly id: number;
  readonly name?: string;
  readonly initials?: string;
  readonly lastIdx?: number;
  readonly colorIndex?: number;
};

/**
 * Comment author list.
 * @see ECMA-376 Part 1, Section 19.4.3 (cmAuthorLst)
 */
export type CommentAuthorList = {
  readonly authors: readonly CommentAuthor[];
};

/**
 * Comment position.
 * @see ECMA-376 Part 1, Section 19.4.5 (pos)
 */
export type CommentPosition = {
  readonly x: Pixels;
  readonly y: Pixels;
};

/**
 * Comment.
 * @see ECMA-376 Part 1, Section 19.4.1 (cm)
 */
export type Comment = {
  readonly authorId?: number;
  readonly dateTime?: string;
  readonly idx?: number;
  readonly position?: CommentPosition;
  readonly text?: string;
};

/**
 * Comment list.
 * @see ECMA-376 Part 1, Section 19.4.4 (cmLst)
 */
export type CommentList = {
  readonly comments: readonly Comment[];
};

/**
 * Print properties for presentation.
 * @see ECMA-376 Part 1, Section 19.2.1.28 (prnPr)
 */
export type PrintColorMode =
  | "bw"
  | "gray"
  | "clr";

export type PrintWhat =
  | "slides"
  | "handouts1"
  | "handouts2"
  | "handouts3"
  | "handouts4"
  | "handouts6"
  | "handouts9"
  | "notes"
  | "outline";

export type PrintProperties = {
  readonly colorMode?: PrintColorMode;
  readonly frameSlides?: boolean;
  readonly hiddenSlides?: boolean;
  readonly printWhat?: PrintWhat;
  readonly scaleToFitPaper?: boolean;
};

/**
 * Embedded font reference.
 * @see ECMA-376 Part 1, Section 19.2.1.9 (embeddedFont)
 */
export type EmbeddedFontReference = {
  readonly rId: string;
};

/**
 * Embedded font typeface details.
 * @see ECMA-376 Part 1, Section 19.2.1.13 (font)
 */
export type EmbeddedFontTypeface = {
  readonly typeface?: string;
  readonly panose?: string;
  readonly pitchFamily?: string;
  readonly charset?: string;
};

/**
 * Embedded font entry.
 * @see ECMA-376 Part 1, Section 19.2.1.9 (embeddedFont)
 */
export type EmbeddedFont = {
  readonly font?: EmbeddedFontTypeface;
  readonly regular?: EmbeddedFontReference;
  readonly bold?: EmbeddedFontReference;
  readonly italic?: EmbeddedFontReference;
  readonly boldItalic?: EmbeddedFontReference;
};

// =============================================================================
// Presentation Types
// =============================================================================

/**
 * Complete presentation definition
 * @see ECMA-376 Part 1, Section 19.2.1.26 (presentation)
 */
export type Presentation = {
  readonly slideSize: SlideSize;
  readonly noteSize?: SlideSize;
  readonly defaultTextStyle?: TextStyleLevels;
  readonly embeddedFonts?: EmbeddedFont[];
  readonly customShows?: CustomShow[];
  readonly photoAlbum?: PhotoAlbum;
  readonly modifyVerifier?: ModifyVerifier;
  readonly smartTags?: SmartTags;
  readonly embedTrueTypeFonts?: boolean;
  readonly saveSubsetFonts?: boolean;
  readonly autoCompressPictures?: boolean;
  readonly bookmarkIdSeed?: number;
  readonly firstSlideNum?: number;
  readonly showSpecialPlsOnTitleSld?: boolean;
  readonly rtl?: boolean;
  readonly removePersonalInfoOnSave?: boolean;
  readonly compatMode?: boolean;
  readonly strictFirstAndLastChars?: boolean;
  readonly serverZoom?: number;
};
