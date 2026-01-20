import { Accordion, Button, FieldGroup, FieldRow, Input } from "../../../../office-editor-components";

export type FillSectionProps = {
  readonly disabled: boolean;
  readonly fillColorDraft: string;
  readonly onFillColorDraftChange: (hex: string) => void;
  readonly onApplyFillColor: () => void;
  readonly onClearFill: () => void;
};

export function FillSection(props: FillSectionProps) {
  return (
    <Accordion title="Fill" defaultExpanded>
      <FieldRow>
        <FieldGroup label="Background">
          <Input
            value={props.fillColorDraft}
            placeholder="#RRGGBB"
            disabled={props.disabled}
            onChange={(value) => props.onFillColorDraftChange(String(value))}
            width={160}
          />
        </FieldGroup>
        <Button size="sm" disabled={props.disabled} onClick={props.onApplyFillColor}>
          Apply
        </Button>
        <Button size="sm" disabled={props.disabled} onClick={props.onClearFill}>
          None
        </Button>
      </FieldRow>
    </Accordion>
  );
}

