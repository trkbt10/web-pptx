/**
 * @file PPTX-specific type definitions
 * Types that don't belong to specific submodules
 */

/** Border style definition */
export type BorderStyle = {
  color: string;
  width: number;
  strokeDasharray: string;
  type?: string;
};

/** Processing result types */
export type ProcessResult = {
  type: "slide" | "pptx-thumb" | "slideSize" | "globalCSS" | "ExecutionTime" | "progress-update";
  data: string | number | { width: number; height: number };
  slide_num?: number;
  file_name?: string;
};

/** Font style properties */
export type FontStyle = {
  fontSize?: string;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  color?: string;
  vertAlign?: string;
};

/** Text paragraph properties */
export type ParagraphStyle = {
  marginLeft?: string;
  marginRight?: string;
  indent?: string;
  textAlign?: string;
  direction?: string;
  lineHeight?: string;
};

/** PPTX processing settings */
export type PptxSettings = {
  pptxFileUrl: string;
  fileInputId: string;
  slidesScale: string;
  slideMode: boolean;
  slideType: "divs2slidesjs" | "revealjs";
  revealjsPath: string;
  keyBoardShortCut: boolean;
  mediaProcess: boolean;
  jsZipV2: boolean | string;
  themeProcess: boolean | "colorsAndImageOnly";
  incSlide: {
    width: number;
    height: number;
  };
  slideModeConfig: SlideModeConfig;
  revealjsConfig: Record<string, unknown>;
};

/** Slide mode configuration */
export type SlideModeConfig = {
  first: number;
  nav: boolean;
  navTxtColor: string;
  keyBoardShortCut: boolean;
  showSlideNum: boolean;
  showTotalSlideNum: boolean;
  autoSlide: boolean | number;
  randomAutoSlide: boolean;
  loop: boolean;
  background: boolean | string;
  transition: "slid" | "fade" | "default" | "random";
  transitionTime: number;
};

/** Content types from [Content_Types].xml */
export type ContentTypes = {
  slides: string[];
  slideLayouts: string[];
};

/** Chart data extracted from chart XML */
export type ChartData = {
  key: string;
  values: Array<{ x: number | string; y: number }>;
};

/** Table cell parameters */
export type TableCellParams = {
  rowSpan?: number;
  colSpan?: number;
  hMerge?: boolean;
  vMerge?: boolean;
  fillColor?: string;
  border?: {
    left?: BorderStyle;
    right?: BorderStyle;
    top?: BorderStyle;
    bottom?: BorderStyle;
  };
};
