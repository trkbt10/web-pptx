/**
 * @file Chart serialization helpers for CLI output
 */

import type { Chart, DataReference } from "@oxen-office/chart/domain/types";

export type ChartDataRefJson = {
  readonly formula?: string;
  readonly values?: readonly (string | number)[];
};

export type ChartSeriesItemJson = {
  readonly name?: string;
  readonly categories?: ChartDataRefJson;
  readonly values?: ChartDataRefJson;
};

export type ChartSummaryJson = {
  readonly types: readonly string[];
  readonly series: readonly {
    readonly type: string;
    readonly items: readonly ChartSeriesItemJson[];
  }[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function pointsToDenseArray<T extends string | number>(
  points: readonly { idx: number; value: T }[],
): readonly T[] {
  const sorted = [...points].sort((a, b) => a.idx - b.idx);
  return sorted.map((p) => p.value);
}

function serializeDataReference(ref: DataReference): ChartDataRefJson | undefined {
  if (ref.strLit?.points) {
    return {
      values: pointsToDenseArray(ref.strLit.points),
    };
  }
  if (ref.strRef?.cache?.points) {
    return {
      formula: ref.strRef.formula,
      values: pointsToDenseArray(ref.strRef.cache.points),
    };
  }
  if (ref.numLit?.points) {
    return {
      values: pointsToDenseArray(ref.numLit.points),
    };
  }
  if (ref.numRef?.cache?.points) {
    return {
      formula: ref.numRef.formula,
      values: pointsToDenseArray(ref.numRef.cache.points),
    };
  }
  // multiLvlStrRef and other variants are intentionally omitted for now
  return undefined;
}

type SeriesItemLike = {
  readonly tx?: { readonly value?: string };
  readonly categories: DataReference;
  readonly values: DataReference;
};

function isSeriesItemLike(value: unknown): value is SeriesItemLike {
  if (!isObject(value)) {
    return false;
  }
  return "categories" in value && "values" in value;
}

/**
 * Create a light-weight summary of a parsed Chart.
 *
 * Intended for inspection/debugging; not a full ChartML JSON representation.
 */
export function summarizeChart(chart: Chart): ChartSummaryJson {
  const plotCharts = chart.plotArea.charts;

  const series = plotCharts.map((s) => {
    const items = (s.series as readonly unknown[])
      .filter(isSeriesItemLike)
      .map((item) => ({
        name: item.tx?.value,
        categories: serializeDataReference(item.categories),
        values: serializeDataReference(item.values),
      }));

    return {
      type: s.type,
      items,
    };
  });

  return {
    types: plotCharts.map((s) => s.type),
    series,
  };
}
