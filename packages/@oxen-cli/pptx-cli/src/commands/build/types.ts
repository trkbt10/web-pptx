/**
 * @file Build command type definitions
 */

/**
 * All supported preset shape types
 */
export type PresetShapeType =
  // Basic shapes
  | "rectangle" | "ellipse" | "triangle" | "diamond" | "pentagon" | "hexagon"
  | "heptagon" | "octagon" | "decagon" | "dodecagon" | "parallelogram" | "trapezoid"
  // Rounded rectangles
  | "roundRect" | "round1Rect" | "round2SameRect" | "round2DiagRect"
  | "snip1Rect" | "snip2SameRect" | "snip2DiagRect" | "snipRoundRect"
  // Arrows
  | "rightArrow" | "leftArrow" | "upArrow" | "downArrow"
  | "leftRightArrow" | "upDownArrow" | "bentArrow" | "uturnArrow"
  | "chevron" | "notchedRightArrow" | "stripedRightArrow"
  // Stars
  | "star4" | "star5" | "star6" | "star7" | "star8" | "star10" | "star12" | "star16" | "star24" | "star32"
  // Callouts
  | "wedgeRectCallout" | "wedgeRoundRectCallout" | "wedgeEllipseCallout" | "cloudCallout"
  // Flow chart
  | "flowChartProcess" | "flowChartDecision" | "flowChartTerminator"
  | "flowChartDocument" | "flowChartData" | "flowChartConnector"
  // Misc
  | "heart" | "lightning" | "sun" | "moon" | "cloud" | "arc" | "donut" | "pie"
  | "frame" | "cube" | "can" | "foldedCorner" | "smileyFace" | "noSmoking"
  | "plus" | "cross" | "ribbon" | "ribbon2" | "homePlate" | "plaque";

/**
 * Shape specification for building
 */
export type ShapeSpec = {
  readonly type: PresetShapeType;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly text?: string;
  readonly fill?: string;
  readonly lineColor?: string;
  readonly lineWidth?: number;
};

/**
 * Image specification for building
 */
export type ImageSpec = {
  readonly type: "image";
  readonly path: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/**
 * Connector specification for building
 */
export type ConnectorSpec = {
  readonly type: "connector";
  readonly preset?: "straightConnector1" | "bentConnector3" | "curvedConnector3";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly startShapeId?: string;
  readonly startSiteIndex?: number;
  readonly endShapeId?: string;
  readonly endSiteIndex?: number;
  readonly lineColor?: string;
  readonly lineWidth?: number;
};

/**
 * Group specification for building
 */
export type GroupSpec = {
  readonly type: "group";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly children: readonly (ShapeSpec | GroupSpec)[];
  readonly fill?: string;
};

/**
 * Table cell specification
 */
export type TableCellSpec = {
  readonly text: string;
};

/**
 * Table specification
 */
export type TableSpec = {
  readonly type: "table";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rows: readonly (readonly TableCellSpec[])[];
};

/**
 * Slide modification specification
 */
export type SlideModSpec = {
  readonly slideNumber: number;
  readonly addShapes?: readonly ShapeSpec[];
  readonly addImages?: readonly ImageSpec[];
  readonly addConnectors?: readonly ConnectorSpec[];
  readonly addGroups?: readonly GroupSpec[];
  readonly addTables?: readonly TableSpec[];
};

/**
 * Build specification
 */
export type BuildSpec = {
  readonly template: string;
  readonly output: string;
  readonly slides?: readonly SlideModSpec[];
};

/**
 * Build result
 */
export type BuildData = {
  readonly outputPath: string;
  readonly slideCount: number;
  readonly shapesAdded: number;
};
