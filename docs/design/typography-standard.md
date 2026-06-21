# Typography Standard

The dashboard uses a compact administrative interface, but text that affects
navigation, configuration, or decisions must remain comfortably readable.

## Shared Scale

- `26px`: page titles.
- `22px`: resource overview titles.
- `16px`: drawer, modal, and major panel titles.
- `15px`: section and card titles.
- `14px`: body text, controls, buttons, table values, and editor text.
- `12px`: help text, field metadata, IDs, code, and table headers.
- `11px`: short badges, timestamps, counters, and tertiary metadata only.
- `9-10px`: decorative group labels and keyboard hints only.

Do not use text below `12px` for a value the user must read to configure,
identify, compare, or troubleshoot a resource.

## Common Components

- Page headings use `PageHeader`.
- Form labels and descriptions use `InputWrapper`.
- Resource collection tables use the shared `.ant-pro-table` rules.
- IDs remain at least `12px`, including search results and truncated values.
- Drawer and modal titles use the Ant Design `16px` title scale.
- JSON schema field names use at least `12px` even inside compact guidance.

Compact layouts should reduce padding, margins, and repeated wording before
reducing essential text below this scale.
