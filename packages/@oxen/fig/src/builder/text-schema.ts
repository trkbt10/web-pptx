/**
 * @file Extended schema definitions for TEXT nodes
 *
 * This extends the base test schema with text-specific types.
 */

import type { KiwiSchema, KiwiDefinition } from "../types";
import { KIWI_TYPE } from "../kiwi/schema";

// =============================================================================
// Enum Helpers
// =============================================================================

function createEnumDef(
  name: string,
  values: [string, number][]
): KiwiDefinition {
  return {
    name,
    kind: "ENUM",
    fields: values.map(([fieldName, value]) => ({
      name: fieldName,
      type: "uint",
      typeId: KIWI_TYPE.UINT,
      isArray: false,
      value,
    })),
  };
}

function createStructDef(
  name: string,
  fields: { name: string; type: string; typeId: number }[]
): KiwiDefinition {
  return {
    name,
    kind: "STRUCT",
    fields: fields.map((f, i) => ({
      name: f.name,
      type: f.type,
      typeId: f.typeId,
      isArray: false,
      value: i + 1,
    })),
  };
}

// =============================================================================
// Text-Extended Schema
// =============================================================================

/**
 * Create a schema that supports TEXT nodes with all properties.
 *
 * Definition indices:
 * 0: MessageType
 * 1: NodeType
 * 2: NodePhase
 * 3: BlendMode
 * 4: GUID
 * 5: Vector
 * 6: Matrix
 * 7: Color
 * 8: TextAlignHorizontal
 * 9: TextAlignVertical
 * 10: TextAutoResize
 * 11: TextDecoration
 * 12: TextCase
 * 13: NumberUnits
 * 14: ValueWithUnits
 * 15: FontName
 * 16: Paint
 * 17: PaintType
 * 18: StrokeAlign
 * 19: NodeChange
 * 20: Message
 */
export function createTextSchema(): KiwiSchema {
  return {
    definitions: [
      // 0: MessageType enum
      createEnumDef("MessageType", [
        ["JOIN_START", 0],
        ["NODE_CHANGES", 1],
        ["USER_CHANGES", 2],
      ]),

      // 1: NodeType enum (extended)
      createEnumDef("NodeType", [
        ["NONE", 0],
        ["DOCUMENT", 1],
        ["CANVAS", 2],
        ["FRAME", 3],
        ["GROUP", 4],
        ["VECTOR", 5],
        ["BOOLEAN_OPERATION", 6],
        ["STAR", 7],
        ["LINE", 8],
        ["ELLIPSE", 9],
        ["REGULAR_POLYGON", 10],
        ["RECTANGLE", 11],
        ["ROUNDED_RECTANGLE", 12],
        ["TEXT", 13],
        ["SLICE", 14],
        ["SYMBOL", 15],
        ["INSTANCE", 16],
        ["STICKY", 17],
        ["CONNECTOR", 18],
        ["SHAPE_WITH_TEXT", 19],
        ["CODE_BLOCK", 20],
        ["STAMP", 21],
        ["WIDGET", 22],
        ["EMBED", 23],
        ["LINK_UNFURL", 24],
        ["MEDIA", 25],
        ["SECTION", 26],
        ["TABLE", 27],
        ["TABLE_CELL", 28],
        ["COMPONENT", 29],
        ["COMPONENT_SET", 30],
      ]),

      // 2: NodePhase enum
      createEnumDef("NodePhase", [
        ["CREATED", 0],
        ["REMOVED", 1],
      ]),

      // 3: BlendMode enum
      createEnumDef("BlendMode", [
        ["PASS_THROUGH", 0],
        ["NORMAL", 1],
        ["MULTIPLY", 2],
        ["DARKEN", 3],
        ["LIGHTEN", 4],
        ["SCREEN", 5],
        ["OVERLAY", 6],
        ["SOFT_LIGHT", 7],
        ["HARD_LIGHT", 8],
        ["DIFFERENCE", 9],
        ["EXCLUSION", 10],
        ["HUE", 11],
        ["SATURATION", 12],
        ["COLOR", 13],
        ["LUMINOSITY", 14],
      ]),

      // 4: GUID struct
      createStructDef("GUID", [
        { name: "sessionID", type: "uint", typeId: KIWI_TYPE.UINT },
        { name: "localID", type: "uint", typeId: KIWI_TYPE.UINT },
      ]),

      // 5: Vector struct
      createStructDef("Vector", [
        { name: "x", type: "float", typeId: KIWI_TYPE.FLOAT },
        { name: "y", type: "float", typeId: KIWI_TYPE.FLOAT },
      ]),

      // 6: Matrix struct
      createStructDef("Matrix", [
        { name: "m00", type: "float", typeId: KIWI_TYPE.FLOAT },
        { name: "m01", type: "float", typeId: KIWI_TYPE.FLOAT },
        { name: "m02", type: "float", typeId: KIWI_TYPE.FLOAT },
        { name: "m10", type: "float", typeId: KIWI_TYPE.FLOAT },
        { name: "m11", type: "float", typeId: KIWI_TYPE.FLOAT },
        { name: "m12", type: "float", typeId: KIWI_TYPE.FLOAT },
      ]),

      // 7: Color struct
      createStructDef("Color", [
        { name: "r", type: "float", typeId: KIWI_TYPE.FLOAT },
        { name: "g", type: "float", typeId: KIWI_TYPE.FLOAT },
        { name: "b", type: "float", typeId: KIWI_TYPE.FLOAT },
        { name: "a", type: "float", typeId: KIWI_TYPE.FLOAT },
      ]),

      // 8: TextAlignHorizontal enum
      createEnumDef("TextAlignHorizontal", [
        ["LEFT", 0],
        ["CENTER", 1],
        ["RIGHT", 2],
        ["JUSTIFIED", 3],
      ]),

      // 9: TextAlignVertical enum
      createEnumDef("TextAlignVertical", [
        ["TOP", 0],
        ["CENTER", 1],
        ["BOTTOM", 2],
      ]),

      // 10: TextAutoResize enum
      createEnumDef("TextAutoResize", [
        ["NONE", 0],
        ["WIDTH_AND_HEIGHT", 1],
        ["HEIGHT", 2],
      ]),

      // 11: TextDecoration enum
      createEnumDef("TextDecoration", [
        ["NONE", 0],
        ["UNDERLINE", 1],
        ["STRIKETHROUGH", 2],
      ]),

      // 12: TextCase enum
      createEnumDef("TextCase", [
        ["ORIGINAL", 0],
        ["UPPER", 1],
        ["LOWER", 2],
        ["TITLE", 3],
        ["SMALL_CAPS", 4],
        ["SMALL_CAPS_FORCED", 5],
      ]),

      // 13: NumberUnits enum
      createEnumDef("NumberUnits", [
        ["RAW", 0],
        ["PIXELS", 1],
        ["PERCENT", 2],
      ]),

      // 14: ValueWithUnits struct
      createStructDef("ValueWithUnits", [
        { name: "value", type: "float", typeId: KIWI_TYPE.FLOAT },
        { name: "units", type: "NumberUnits", typeId: 13 },
      ]),

      // 15: FontName struct
      createStructDef("FontName", [
        { name: "family", type: "string", typeId: KIWI_TYPE.STRING },
        { name: "style", type: "string", typeId: KIWI_TYPE.STRING },
        { name: "postscript", type: "string", typeId: KIWI_TYPE.STRING },
      ]),

      // 16: Paint message (simplified)
      {
        name: "Paint",
        kind: "MESSAGE",
        fields: [
          { name: "type", type: "PaintType", typeId: 17, isArray: false, value: 1 },
          { name: "color", type: "Color", typeId: 7, isArray: false, value: 2 },
          { name: "opacity", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 3 },
          { name: "visible", type: "bool", typeId: KIWI_TYPE.BOOL, isArray: false, value: 4 },
          { name: "blendMode", type: "BlendMode", typeId: 3, isArray: false, value: 5 },
        ],
      },

      // 17: PaintType enum
      createEnumDef("PaintType", [
        ["SOLID", 0],
        ["GRADIENT_LINEAR", 1],
        ["GRADIENT_RADIAL", 2],
        ["GRADIENT_ANGULAR", 3],
        ["GRADIENT_DIAMOND", 4],
        ["IMAGE", 5],
      ]),

      // 18: StrokeAlign enum
      createEnumDef("StrokeAlign", [
        ["CENTER", 0],
        ["INSIDE", 1],
        ["OUTSIDE", 2],
      ]),

      // 19: TextData message
      {
        name: "TextData",
        kind: "MESSAGE",
        fields: [
          { name: "characters", type: "string", typeId: KIWI_TYPE.STRING, isArray: false, value: 1 },
          { name: "characterStyleIDs", type: "uint", typeId: KIWI_TYPE.UINT, isArray: true, value: 2 },
        ],
      },

      // 20: NodeChange message (extended for TEXT)
      {
        name: "NodeChange",
        kind: "MESSAGE",
        fields: [
          { name: "guid", type: "GUID", typeId: 4, isArray: false, value: 1 },
          { name: "phase", type: "NodePhase", typeId: 2, isArray: false, value: 2 },
          { name: "parentIndex", type: "ParentIndex", typeId: 22, isArray: false, value: 3 },
          { name: "type", type: "NodeType", typeId: 1, isArray: false, value: 4 },
          { name: "name", type: "string", typeId: KIWI_TYPE.STRING, isArray: false, value: 5 },
          { name: "visible", type: "bool", typeId: KIWI_TYPE.BOOL, isArray: false, value: 6 },
          { name: "opacity", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 8 },
          { name: "blendMode", type: "BlendMode", typeId: 3, isArray: false, value: 9 },
          { name: "size", type: "Vector", typeId: 5, isArray: false, value: 11 },
          { name: "transform", type: "Matrix", typeId: 6, isArray: false, value: 12 },
          // Text-specific fields
          { name: "fontSize", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 20 },
          { name: "fontName", type: "FontName", typeId: 15, isArray: false, value: 21 },
          { name: "textAlignHorizontal", type: "TextAlignHorizontal", typeId: 8, isArray: false, value: 22 },
          { name: "textAlignVertical", type: "TextAlignVertical", typeId: 9, isArray: false, value: 23 },
          { name: "textAutoResize", type: "TextAutoResize", typeId: 10, isArray: false, value: 24 },
          { name: "textDecoration", type: "TextDecoration", typeId: 11, isArray: false, value: 25 },
          { name: "textCase", type: "TextCase", typeId: 12, isArray: false, value: 26 },
          { name: "lineHeight", type: "ValueWithUnits", typeId: 14, isArray: false, value: 27 },
          { name: "letterSpacing", type: "ValueWithUnits", typeId: 14, isArray: false, value: 28 },
          { name: "textData", type: "TextData", typeId: 19, isArray: false, value: 29 },
          { name: "fillPaints", type: "Paint", typeId: 16, isArray: true, value: 30 },
          { name: "strokeWeight", type: "float", typeId: KIWI_TYPE.FLOAT, isArray: false, value: 31 },
          { name: "strokeAlign", type: "StrokeAlign", typeId: 18, isArray: false, value: 32 },
        ],
      },

      // 21: Message (root type)
      {
        name: "Message",
        kind: "MESSAGE",
        fields: [
          { name: "type", type: "MessageType", typeId: 0, isArray: false, value: 1 },
          { name: "sessionID", type: "uint", typeId: KIWI_TYPE.UINT, isArray: false, value: 2 },
          { name: "ackID", type: "uint", typeId: KIWI_TYPE.UINT, isArray: false, value: 3 },
          { name: "nodeChanges", type: "NodeChange", typeId: 20, isArray: true, value: 4 },
        ],
      },

      // 22: ParentIndex struct
      createStructDef("ParentIndex", [
        { name: "guid", type: "GUID", typeId: 4 },
        { name: "position", type: "string", typeId: KIWI_TYPE.STRING },
      ]),
    ],
  };
}

// =============================================================================
// Type Indices (for reference)
// =============================================================================

export const TEXT_SCHEMA_INDICES = {
  MessageType: 0,
  NodeType: 1,
  NodePhase: 2,
  BlendMode: 3,
  GUID: 4,
  Vector: 5,
  Matrix: 6,
  Color: 7,
  TextAlignHorizontal: 8,
  TextAlignVertical: 9,
  TextAutoResize: 10,
  TextDecoration: 11,
  TextCase: 12,
  NumberUnits: 13,
  ValueWithUnits: 14,
  FontName: 15,
  Paint: 16,
  PaintType: 17,
  StrokeAlign: 18,
  TextData: 19,
  NodeChange: 20,
  Message: 21,
  ParentIndex: 22,
} as const;
