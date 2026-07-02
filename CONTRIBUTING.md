# Contributing

Small, reviewable changes are preferred.

## Before opening a pull request

```bash
npm install
npm run typecheck
npm test
npm run build
```

For interface changes, run the Netlify development server and verify the login page, queue, setup view, and mobile layout.

## Ground rules

- Keep scheduled Reddit access read-only.
- Do not add a posting path outside the authenticated Send reply endpoint.
- Do not commit `.dispatch.env`, operator voice files, product briefs, API keys, access tokens, or screenshots containing private comments.
- Use focused TypeScript types instead of expanding `any`.
- Keep product copy direct. Avoid generated-sounding filler, decorative labels, and unnecessary abstraction.
- Explain changes to the security boundary in the pull request.

## Commit messages

Use a short conventional prefix when it helps: `feat:`, `fix:`, `docs:`, `refactor:`, or `test:`.
