# Schema UX TODO

This checklist tracks usability problems where the dashboard already knows the
Admin API schema, but the create/edit experience does not fully use that
knowledge yet.

## Completed

- [x] Prefill plugin Add JSON with required fields, not only schema defaults.
- [x] Keep primitive `oneOf` / `anyOf` required fields from becoming `{}` when a
  plugin schema offers scalar alternatives.
- [x] Centralize JSON Schema template generation so plugin JSON and schema form
  defaults share the same placeholder rules.
- [x] Cover union required fields, conditional required fields, and required
  array items with regression tests.

## Next

- [ ] Audit complex plugin schemas in the live APISIX catalog:
  `openid-connect`, `ai-proxy`, `ai-proxy-multi`, `saml-auth`, `proxy-cache`,
  and Redis-backed `limit-count` variants.
- [ ] Verify Fields to JSON to Fields round trips for plugin schemas with
  nested `oneOf`, `anyOf`, `if` / `then`, and `minItems`.
- [ ] Expand save-failure recovery checks across create Raw JSON, resource Raw
  JSON, and plugin JSON drawers.
- [ ] Add clone-flow payload checks so cloned Routes, Services, and Upstreams
  never submit read-only fields such as `id`, `create_time`, or `update_time`.
- [ ] Compare conditional required markers with generated JSON templates for
  Routes, SSLs, Upstreams, Secrets, and plugin configs.
