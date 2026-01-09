/**
 * @file SearchableSelect event isolation tests
 */

// @vitest-environment jsdom

import { render, fireEvent } from "@testing-library/react";
import { SearchableSelect } from "./SearchableSelect";

function ensureScrollIntoView() {
  if (!HTMLElement.prototype.scrollIntoView) {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      value: () => undefined,
      writable: true,
    });
  }
}

describe("SearchableSelect", () => {
  it("does not bubble clicks from dropdown to parent handlers", () => {
    ensureScrollIntoView();

    const counters = { parentClicks: 0, changeCalls: 0 };
    const onParentClick = () => {
      counters.parentClicks += 1;
    };
    const onChange = () => {
      counters.changeCalls += 1;
    };

    const { getByRole, getByPlaceholderText } = render(
      <div onClick={onParentClick}>
        <SearchableSelect
          value="a"
          onChange={onChange}
          options={[
            { value: "a", label: "Alpha" },
            { value: "b", label: "Beta" },
          ]}
          searchPlaceholder="Search..."
        />
      </div>
    );

    fireEvent.click(getByRole("button"));
    counters.parentClicks = 0;
    counters.changeCalls = 0;
    const searchInput = getByPlaceholderText("Search...");
    fireEvent.pointerDown(searchInput);
    fireEvent.click(searchInput);

    expect(counters.parentClicks).toBe(0);
    expect(counters.changeCalls).toBe(0);
  });

  it("hides options marked hiddenWhenEmptySearch until searching", () => {
    ensureScrollIntoView();

    const { getByRole, getByPlaceholderText, queryByText, getByText } = render(
      <SearchableSelect
        value="a"
        onChange={() => undefined}
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta", hiddenWhenEmptySearch: true },
        ]}
        searchPlaceholder="Search..."
      />
    );

    fireEvent.click(getByRole("button"));
    expect(queryByText("Beta")).toBeNull();

    const searchInput = getByPlaceholderText("Search...");
    fireEvent.change(searchInput, { target: { value: "Be" } });
    expect(getByText("Beta")).toBeTruthy();
  });

  it("virtualizes large option lists", () => {
    ensureScrollIntoView();

    const options = Array.from({ length: 200 }, (_, index) => ({
      value: String(index),
      label: `Item ${index}`,
    }));

    const { getByRole, getByTestId, queryByText, getByText } = render(
      <SearchableSelect
        value="0"
        onChange={() => undefined}
        options={options}
        searchPlaceholder="Search..."
        maxHeight={140}
        virtualization={{ itemHeight: 28, headerHeight: 22, overscan: 2 }}
        listTestId="searchable-select-list"
      />
    );

    fireEvent.click(getByRole("button"));

    const list = getByTestId("searchable-select-list");
    const renderedOptions = list.querySelectorAll("[data-option-index]");
    expect(renderedOptions.length).toBeLessThan(80);

    // Scroll down and verify the rendered window updates.
    expect(queryByText("Item 150")).toBeNull();
    list.scrollTop = 150 * 28;
    fireEvent.scroll(list);
    expect(getByText("Item 150")).toBeTruthy();
  });

  it("filters tagged options via tagFilter chips", () => {
    ensureScrollIntoView();

    const { getByRole, getByText, queryByText } = render(
      <SearchableSelect
        value="a"
        onChange={() => undefined}
        options={[
          { value: "a", label: "Alpha", tags: ["sans-serif"] },
          { value: "b", label: "Beta", tags: ["serif"] },
          { value: "c", label: "UnTagged Utility" },
        ]}
        searchPlaceholder="Search..."
        tagFilter={{
          tags: [
            { id: "sans-serif", label: "Sans" },
            { id: "serif", label: "Serif" },
          ],
        }}
      />
    );

    fireEvent.click(getByRole("button"));
    expect(getByText("Alpha", { selector: "[data-option-index]" })).toBeTruthy();
    expect(getByText("Beta", { selector: "[data-option-index]" })).toBeTruthy();

    fireEvent.click(getByText("Serif"));
    expect(queryByText("Alpha", { selector: "[data-option-index]" })).toBeNull();
    expect(getByText("Beta", { selector: "[data-option-index]" })).toBeTruthy();
    expect(getByText("UnTagged Utility", { selector: "[data-option-index]" })).toBeTruthy();
  });
});
