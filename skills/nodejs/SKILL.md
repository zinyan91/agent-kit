---
name: nodejs
description: >-
  Decisions for Node.js and TypeScript backends and scripts: framework and runtime choice, module
  system, layering, errors, async work, validation, secrets and tests. Use when starting or changing a
  Node API, route handler, server action, CLI or script, or when reviewing one.
---

# Node.js

Decide for this project, not by habit. When the repo already chose a framework, runtime or library,
follow it; this skill is for the choices it has not made yet.

## Framework and runtime

- **Inside a full-stack app** (Next.js, SvelteKit, Nuxt): use its route handlers or server actions. Do
  not add a second server.
- **A standalone API**: Hono for serverless and edge-like targets (small, fast cold start), Fastify for
  a long-running service that needs throughput and schemas, Express only to extend existing Express
  code, NestJS only when the team already uses it.
- **Runtime**: Node LTS by default. Bun or Deno only when the project already uses them.
- **Modules**: ESM (`"type": "module"`, `.mjs`) for new code; CommonJS only to match an existing
  codebase.
- **TypeScript**: compile with the project's build, or run scripts directly with Node's type stripping
  (Node 22.6+ behind a flag, default in later releases) when no build exists.
- Ask the user only when the choice is expensive to reverse and nothing in the repo decides it.

## Layers

Four layers, each with one reason to change:

1. **Interface**: route handler, controller, CLI entry. Parses input, calls a use case, shapes the
   response. No business rules.
2. **Orchestration**: services or use cases that coordinate a job (load, decide, save, notify).
3. **Domain**: pure functions for rules, formulas, parsers and validation. No framework, no I/O, no
   `process.env`. Unit-tested without a server or database.
4. **Infrastructure**: database clients, repositories, storage, HTTP clients, queues.

A small script can collapse layers. A file that grows past one job is the signal to split it, while
you are changing it.

## Errors

- Throw typed errors from any layer (`NotFoundError`, `ValidationError`, `ConflictError`) and catch
  once at the edge, where they become a response.
- The client gets the right status and a stable error code with a plain message; never a stack trace
  or internal detail. The log gets the stack, the request context and the user ID.
- Status codes: 400 bad input, 401 not authenticated, 403 not allowed, 404 not found, 409 conflict or
  duplicate, 422 valid shape but a business rule fails, 429 rate limited, 500 our fault.
- Never swallow an error into an empty result: a caller that gets `[]` cannot tell "nothing" from
  "failed".
- Handle `unhandledRejection` and process signals in long-running services: log, finish in-flight
  work, exit.

## Async

| Need | Use |
| --- | --- |
| Steps that depend on each other | `await` in sequence |
| Independent calls | `Promise.all` |
| Independent calls where some may fail | `Promise.allSettled` |
| A timeout | `AbortSignal.timeout(ms)` passed to `fetch` and clients |
| Many items with a concurrency limit | a small pool, not `Promise.all` over thousands |

- Never block the event loop in a server: no `*Sync` file or crypto calls on the request path, no large
  CPU loops. Move CPU work to a worker thread or a job.
- Stream large files and responses instead of buffering them.
- Every outbound call has a timeout. Retries only for idempotent operations, with backoff.

## Validation

- Validate at every boundary: request body, params and query; webhooks and third-party responses;
  file uploads; environment variables at startup.
- Use one schema library per project (Zod is the common default) and infer types from the schema
  rather than writing both.
- Fail fast with a message that names the field. Do not trust "internal" data either.

## Secrets and configuration

- Secrets live only in environment variables, never in code, tests, fixtures or commits.
- **No hard-coded fallback for a secret.** `process.env.X || "some-default"` is forbidden. A missing
  variable throws at startup: `throw new Error('Missing environment variable X')`.
- Read configuration in one module at startup, validate it, and pass it in; do not read `process.env`
  deep inside business code.
- Server code does not read public build-time variables (such as `NEXT_PUBLIC_*`) for secrets.
- Do not log secrets or full request bodies that may contain them. Destructure secrets out of objects
  before logging or returning them; spreading a masked copy does not remove the original field.

## Security checklist

- Parameterized queries only; never build SQL by string concatenation.
- Passwords hashed with argon2 or bcrypt. Verify JWT signature, issuer, audience and expiry.
- Authorization checked on the server for every action, not only hidden in the UI.
- Rate limits on login, signup, password reset and anything costly.
- CORS restricted to known origins; security headers set; HTTPS everywhere.
- File uploads: check size and type, store outside the web root, never trust the client's filename.
- Dependencies audited; lockfile committed.

## Tests

- Domain functions: unit tests with `node:test` or the repo's runner (Vitest is common), no DOM, no
  network, no database.
- Route handlers and repositories: integration tests against a real test database or a local server.
- Critical flows (auth, payments, data export): end-to-end with Playwright when the repo has it.
- Test the failure paths: empty input, boundaries, a dependency that times out or errors.
- Do not test framework code or trivial getters.

## Before you write the code

- What is the deployment target, and does it constrain the runtime?
- Which layer does each new function belong to?
- Where is input validated, and what does the client see when it fails?
- What happens when each external call fails or hangs?
- Which secrets does it need, and are they named the same in code, local env and the host?
