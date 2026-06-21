# JSON Editor Standard

The dashboard has three JSON editing contexts:

- Create forms: edit the payload that the visual form will submit.
- Resource RAW editors: PATCH an existing resource and verify the saved state.
- API Console: build direct Admin API requests and inspect responses.

These contexts have different actions, but they share one editing standard.

## Shared Surface

- Use `JsonCodeEditor` for editable and read-only JSON.
- Use two-space indentation, line numbers, no minimap, strict JSON diagnostics,
  and the current dashboard light or dark theme.
- Use `JsonSchemaGuide` when a dashboard schema is available.
- Render field names as inline code and distinguish resource identity,
  unconditional requirements, and conditional requirements.
- Keep resource-specific conditional rules in `resourceJsonSchema.ts`.

## Contextual Actions

- Create forms submit the complete create payload through the form workflow.
- Resource RAW editors show identity fields separately as values managed by the
  Admin API path. The editable JSON excludes read-only fields, sends changed
  editable fields with PATCH, and verifies the saved resource with a follow-up
  read.
- API Console sends the selected method and payload exactly as configured.
- Read-only response editors use the same JSON presentation without editing
  controls.

Do not add a new standalone Monaco JSON configuration when one of these shared
surfaces can be used.
