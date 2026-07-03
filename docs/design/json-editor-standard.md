# JSON Editor Standard

The dashboard has four named JSON editing contexts:

- Payload JSON: edit the create payload that the Visual Editor will submit.
- Admin API JSON: PATCH an existing resource and verify the saved state.
- Plugin JSON: edit one plugin config inside the plugin Fields drawer.
- Request JSON and Response JSON: build direct Admin API requests and inspect
  responses in the API Console.

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

- Payload JSON submits the complete create payload through the form workflow.
- Admin API JSON editors show identity fields separately as values managed by the
  Admin API path. The editable JSON excludes read-only fields, sends changed
  editable fields with PATCH, and verifies the saved resource with a follow-up
  read.
- Plugin JSON edits only the selected plugin config object, not the full APISIX
  resource payload.
- Request JSON sends the selected method and payload exactly as configured.
- Read-only response editors use the same JSON presentation without editing
  controls.

Do not add a new standalone Monaco JSON configuration when one of these shared
surfaces can be used.
