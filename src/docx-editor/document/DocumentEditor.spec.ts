import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

describe("DocumentEditor design tokens", () => {
  it("replaces hardcoded colors/spacing with CSS variables", () => {
    const documentEditorPath = fileURLToPath(
      new URL("./DocumentEditor.tsx", import.meta.url)
    );
    const source = readFileSync(documentEditorPath, "utf-8");

    expect(source).toContain(
      'borderBottom: "1px solid var(--border-subtle)"'
    );
    expect(source).toContain('backgroundColor: "var(--bg-secondary)"');
    expect(source).toContain('backgroundColor: "var(--bg-tertiary)"');
    expect(source).toContain('borderLeft: "1px solid var(--border-subtle)"');

    expect(source).toContain('borderTop: "1px dashed var(--border-strong)"');
    expect(source).toContain('margin: "var(--spacing-sm) 0"');
    expect(source).toContain('fontSize: "var(--font-size-xs)"');
    expect(source).toContain('color: "var(--text-secondary)"');

    expect(source).not.toContain("#e0e0e0");
    expect(source).not.toContain("#fafafa");
    expect(source).not.toContain("#e8e8e8");
    expect(source).not.toContain("#999");
    expect(source).not.toContain("#666");
    expect(source).not.toContain('"8px 0"');
    expect(source).not.toContain('"10px"');
  });
});

