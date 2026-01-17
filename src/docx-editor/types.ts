/**
 * @file Editor-specific types for DOCX Editor
 *
 * Common types used across all editor components.
 */

/**
 * Common props for all editor components.
 */
export type EditorProps<T> = {
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly disabled?: boolean;
  readonly className?: string;
};

/**
 * Editor state for useReducer pattern.
 */
export type EditorState<T> = {
  readonly value: T;
  readonly originalValue: T;
  readonly isDirty: boolean;
};

/**
 * Editor actions for useReducer.
 */
export type EditorAction<T> =
  | { readonly type: "SET_VALUE"; readonly payload: T }
  | { readonly type: "UPDATE_FIELD"; readonly path: string; readonly value: unknown }
  | { readonly type: "RESET" };

/**
 * Input types for primitive components.
 */
export type InputType = "text" | "number";

/**
 * Button variants.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost";

/**
 * Mixed value type for properties that may have multiple values across selection.
 */
export type MixedValue<T> = {
  readonly value: T | undefined;
  readonly isMixed: boolean;
};

/**
 * Create a single (non-mixed) value.
 */
export function singleValue<T>(value: T): MixedValue<T> {
  return { value, isMixed: false };
}

/**
 * Create a mixed value marker.
 */
export function mixedValue<T>(): MixedValue<T> {
  return { value: undefined, isMixed: true };
}

/**
 * Check if a value is mixed.
 */
export function isMixed<T>(mv: MixedValue<T>): boolean {
  return mv.isMixed;
}
