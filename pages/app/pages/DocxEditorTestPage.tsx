/**
 * @file DOCX Editor Test Page
 *
 * Test page for visually verifying DOCX editor components.
 */

import { useState, type CSSProperties } from "react";
import {
  RunPropertiesEditor,
  createDefaultRunProperties,
  ParagraphPropertiesEditor,
  createDefaultParagraphProperties,
  StyleEditor,
  createDefaultStyle,
  NumberingLevelEditor,
  createDefaultLevel,
  TablePropertiesEditor,
  createDefaultTableProperties,
  TableCellPropertiesEditor,
  createDefaultTableCellProperties,
} from "@lib/docx-editor";
import type { DocxRunProperties } from "@lib/docx/domain/text";
import type { DocxParagraphProperties } from "@lib/docx/domain/paragraph";
import type { DocxStyle } from "@lib/docx/domain/styles";
import type { DocxLevel } from "@lib/docx/domain/numbering";
import type { DocxTableProperties, DocxTableCellProperties } from "@lib/docx/domain/table";
import { Button } from "@lib/office-editor-components/primitives";

type DocxEditorTestPageProps = {
  readonly onBack: () => void;
};

type TabId = "run" | "paragraph" | "style" | "numbering" | "table" | "cell";

type Tab = {
  readonly id: TabId;
  readonly label: string;
};

const tabs: readonly Tab[] = [
  { id: "run", label: "Run Properties" },
  { id: "paragraph", label: "Paragraph" },
  { id: "style", label: "Style" },
  { id: "numbering", label: "Numbering" },
  { id: "table", label: "Table" },
  { id: "cell", label: "Table Cell" },
];

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#1a1a1a",
  color: "#e5e5e5",
  padding: "24px",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "24px",
  paddingBottom: "16px",
  borderBottom: "1px solid #333",
};

const titleStyle: CSSProperties = {
  fontSize: "24px",
  fontWeight: 600,
};

const tabsContainerStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  marginBottom: "24px",
  flexWrap: "wrap",
};

const tabButtonStyle: CSSProperties = {
  padding: "8px 16px",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 500,
  transition: "all 150ms ease",
};

const tabButtonActiveStyle: CSSProperties = {
  ...tabButtonStyle,
  backgroundColor: "#0070f3",
  color: "white",
};

const tabButtonInactiveStyle: CSSProperties = {
  ...tabButtonStyle,
  backgroundColor: "#2a2a2a",
  color: "#999",
};

const contentStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "24px",
};

const panelStyle: CSSProperties = {
  backgroundColor: "#242424",
  borderRadius: "8px",
  padding: "20px",
  border: "1px solid #333",
};

const panelTitleStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  marginBottom: "16px",
  color: "#fff",
};

const jsonPreStyle: CSSProperties = {
  backgroundColor: "#1a1a1a",
  padding: "12px",
  borderRadius: "6px",
  fontSize: "12px",
  fontFamily: "monospace",
  overflow: "auto",
  maxHeight: "400px",
  color: "#8be9fd",
};

/**
 * Tab button component
 */
function TabButton({
  tab,
  isActive,
  onClick,
}: {
  tab: Tab;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      style={isActive ? tabButtonActiveStyle : tabButtonInactiveStyle}
      onClick={onClick}
    >
      {tab.label}
    </button>
  );
}

/**
 * Run Properties Editor Test
 */
function RunPropertiesTest() {
  const [value, setValue] = useState<DocxRunProperties>(createDefaultRunProperties());

  return (
    <div style={contentStyle}>
      <div style={panelStyle}>
        <h3 style={panelTitleStyle}>Run Properties Editor</h3>
        <RunPropertiesEditor value={value} onChange={setValue} />
      </div>
      <div style={panelStyle}>
        <h3 style={panelTitleStyle}>Current Value</h3>
        <pre style={jsonPreStyle}>{JSON.stringify(value, null, 2)}</pre>
      </div>
    </div>
  );
}

/**
 * Paragraph Properties Editor Test
 */
function ParagraphPropertiesTest() {
  const [value, setValue] = useState<DocxParagraphProperties>(createDefaultParagraphProperties());

  return (
    <div style={contentStyle}>
      <div style={panelStyle}>
        <h3 style={panelTitleStyle}>Paragraph Properties Editor</h3>
        <ParagraphPropertiesEditor value={value} onChange={setValue} />
      </div>
      <div style={panelStyle}>
        <h3 style={panelTitleStyle}>Current Value</h3>
        <pre style={jsonPreStyle}>{JSON.stringify(value, null, 2)}</pre>
      </div>
    </div>
  );
}

/**
 * Style Editor Test
 */
function StyleEditorTest() {
  const [value, setValue] = useState<DocxStyle>(createDefaultStyle("custom1", "paragraph"));

  const availableStyles = [
    { id: "Normal" as const, name: "Normal", type: "paragraph" as const },
    { id: "Heading1" as const, name: "Heading 1", type: "paragraph" as const },
    { id: "Heading2" as const, name: "Heading 2", type: "paragraph" as const },
  ];

  return (
    <div style={contentStyle}>
      <div style={panelStyle}>
        <h3 style={panelTitleStyle}>Style Editor</h3>
        <StyleEditor
          value={value}
          onChange={setValue}
          availableStyles={availableStyles}
          showAdvanced
        />
      </div>
      <div style={panelStyle}>
        <h3 style={panelTitleStyle}>Current Value</h3>
        <pre style={jsonPreStyle}>{JSON.stringify(value, null, 2)}</pre>
      </div>
    </div>
  );
}

/**
 * Numbering Level Editor Test
 */
function NumberingLevelTest() {
  const [value, setValue] = useState<DocxLevel>(createDefaultLevel(0));

  return (
    <div style={contentStyle}>
      <div style={panelStyle}>
        <h3 style={panelTitleStyle}>Numbering Level Editor</h3>
        <NumberingLevelEditor value={value} onChange={setValue} />
      </div>
      <div style={panelStyle}>
        <h3 style={panelTitleStyle}>Current Value</h3>
        <pre style={jsonPreStyle}>{JSON.stringify(value, null, 2)}</pre>
      </div>
    </div>
  );
}

/**
 * Table Properties Editor Test
 */
function TablePropertiesTest() {
  const [value, setValue] = useState<DocxTableProperties>(createDefaultTableProperties());

  return (
    <div style={contentStyle}>
      <div style={panelStyle}>
        <h3 style={panelTitleStyle}>Table Properties Editor</h3>
        <TablePropertiesEditor value={value} onChange={setValue} />
      </div>
      <div style={panelStyle}>
        <h3 style={panelTitleStyle}>Current Value</h3>
        <pre style={jsonPreStyle}>{JSON.stringify(value, null, 2)}</pre>
      </div>
    </div>
  );
}

/**
 * Table Cell Properties Editor Test
 */
function TableCellPropertiesTest() {
  const [value, setValue] = useState<DocxTableCellProperties>(createDefaultTableCellProperties());

  return (
    <div style={contentStyle}>
      <div style={panelStyle}>
        <h3 style={panelTitleStyle}>Table Cell Properties Editor</h3>
        <TableCellPropertiesEditor value={value} onChange={setValue} />
      </div>
      <div style={panelStyle}>
        <h3 style={panelTitleStyle}>Current Value</h3>
        <pre style={jsonPreStyle}>{JSON.stringify(value, null, 2)}</pre>
      </div>
    </div>
  );
}

/**
 * Tab content renderer
 */
function TabContent({ activeTab }: { activeTab: TabId }) {
  switch (activeTab) {
    case "run":
      return <RunPropertiesTest />;
    case "paragraph":
      return <ParagraphPropertiesTest />;
    case "style":
      return <StyleEditorTest />;
    case "numbering":
      return <NumberingLevelTest />;
    case "table":
      return <TablePropertiesTest />;
    case "cell":
      return <TableCellPropertiesTest />;
  }
}

/**
 * DOCX Editor test page main component
 */
export function DocxEditorTestPage({ onBack }: DocxEditorTestPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>("run");

  return (
    <div style={pageStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <h1 style={titleStyle}>DOCX Editor Components Test</h1>
        <Button variant="secondary" onClick={onBack}>
          ← Back
        </Button>
      </header>

      {/* Tab Navigation */}
      <nav style={tabsContainerStyle}>
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </nav>

      {/* Tab Content */}
      <TabContent activeTab={activeTab} />
    </div>
  );
}
