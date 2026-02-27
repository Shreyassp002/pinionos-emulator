# Contributing

## Add a New Mock Route

1. Create a route file in `src/routes/<name>.ts` using `Router()`.
2. Return success envelope with `success({...})` from `src/types.ts`.
3. Return errors as `res.status(code).json(errorResponse('message'))`.
4. Mount the route in `src/emulator.ts` with `app.use('/<name>', <name>Router)`.
5. If the route calls external APIs, add a 60s cache in `src/freeApis/`.
6. Update `README.md` route list and add/adjust an example script if needed.

## Standards

- TypeScript only.
- Keep response shape compatible with Pinion skill calls: `{ data, mock: true, payment }`.
- Keep logs explicit for demo visibility (`[MOCK PAYMENT] ...`).
