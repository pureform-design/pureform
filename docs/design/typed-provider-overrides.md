# Typed provider token overrides: design doc

Status: proposed.

## 1. Problem

`PureformProvider`'s `defaults` is typed from `ComponentRegistry`, so a component's instance
tokens autocomplete. `overrides` is not: `ThemeOverrides` is
`Record<string, TokenValue | undefined>`, so `"colors.primary"` and
`"components.button.container"` get no completion and a typo passes.

## 2. Design

### 2.1 `TokenRegistry`

A third registry in `@pureform/styling`, next to `ComponentRegistry` and `SpringRoleRegistry`.
Empty by default; generated declarations augment it.

```ts
export interface TokenRegistry {}

export type TokenPath = [keyof TokenRegistry] extends [never]
    ? string
    : keyof TokenRegistry & string;
```

The generator emits one entry per overridable token, valued by the token's category (the first
segment of its ref):

```ts
declare module "@pureform/styling" {
    interface TokenRegistry {
        "colors.primary": "colors";
        "components.button.container": "components";
    }
}
```

### 2.2 `ThemeOverrides`

```ts
export type ThemeOverrides = {
    readonly [P in TokenPath]?: TokenValue | undefined;
} & {
    readonly [cssVar: `--${string}`]: TokenValue | undefined;
} & {
    readonly [other: string & {}]: TokenValue | undefined; // open escape hatch
};
```

- Registered paths complete and are checked against `TokenValue`.
- Raw CSS vars (`--brand`) stay allowed.
- **Open escape hatch:** an unregistered key still compiles but does not complete, so a
  stale or app-specific path is never a hard error. Completion is the goal, not rejection.
- While nothing is registered, `TokenPath` is `string` and behaviour is unchanged.
- Key form is the var-ref form the runtime accepts (`colors.primary`,
  `components.button.container`), not the config path (`semanticTokens.colors.primary`).
- No per-theme scoping: a theme overrides values, not the token set.
- Value narrowing by category is left for later; the registry value carries the category.

### 2.3 Which tokens: `overridableTokens`

A generate option, using the globs-over-var-refs vocabulary of `keepTokens`:

```ts
overridableTokens?: {
    include?: readonly string[]; // default ["semantic", "components.*"]
    exclude?: readonly string[];
};
```

- Globs match var refs (`*` matches any run of characters).
- Presets in `include`: `"semantic"` (the `semanticTokens` tier) and `"all"` (every emitted
  token, plus component tokens).
- Default is the stable public layer: semantic tokens plus component tokens. Primitives such as
  `colors.blue.500` stay out unless included.
- Component tokens come from each generated component's shape (`components.<name>.<token>`).
- Tokens come from the config the adapter reads: pruned like the CSS adapter's when token pruning
  applies, so the types never name a token the stylesheet dropped.
- An empty result emits no `TokenRegistry` entries (types stay open) and the generator warns.
- Part of the output hash, since it changes the declarations.

### 2.4 Pipeline

```
config -> token entries (tokens.ts) -> narrow by pruning (existing)
       -> filter by overridableTokens (new)
       -> registryDeclarations(entries, springRoles, tokenRefs) -> interface TokenRegistry
```

`registryDeclarations` takes `tokens` as an optional third parameter, so existing callers and
specs keep working.

## 3. Tests

- `registry-index.spec.ts`: declarations include `TokenRegistry`; none when empty.
- Generator spec: default set, `include`/`exclude`, presets, pruning interaction.
- Type tests (`types.spec.ts` style): registered path completes and checks, `--var` and an
  unknown string are accepted, unaugmented registry is open.

## 4. Out of scope

Per-theme token sets, category-specific value types, and rejecting unknown keys.
