# @pureform/solid

pureform's bindings for Solid 2: the components, their provider, and the hooks that give
them styles. Today it holds only the foundation they're built on, a port of Zag.js's
Solid adapter to Solid 2.

## Where it sits

```
@pureform/styling, anatomy, machines   (framework-free; planned, roadmap phase 1)
                 │
@pureform/solid  ── internal/zag  ──►  @zag-js/core, types, utils
                 │
          solid-js 2, @solidjs/web     (peers, pinned to the tested release candidate)
```

The components (planned) wire three things together: a part's anatomy, a behavior
machine, and classes from the style registry. Anything that works without Solid lives in
the framework-free packages instead. See the
[design doc](../../docs/design/component-architecture.md), §3 and §9, and the
[roadmap](../../docs/roadmap/README.md).

## What's here now

### `@pureform/solid/internal/zag`

Zag.js machines run as Solid 2 services. Zag's own Solid adapter (`@zag-js/solid`) still
targets Solid 1, so this is a port of its version 1.46.0, with the same exports:

| Export                       | What it does                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| `useMachine(machine, props)` | Runs a Zag machine. `props` can be an object or an accessor; any prop may be `undefined`.                 |
| `normalizeProps`             | Turns Zag's React-shaped part props into Solid 2's: event names, lowercase attributes, hyphenated styles. |
| `mergeProps(...sources)`     | Merges part props lazily: classes, styles, and handlers combine; other keys take the last value.          |
| `useSyncExternalStore`       | An external store's snapshot as a signal.                                                                 |
| `Key`                        | A list keyed by a property or function, built on Solid 2's `<For keyed>`.                                 |

```tsx
import * as checkbox from "@zag-js/checkbox";
import { createMemo } from "solid-js";
import { normalizeProps, useMachine } from "@pureform/solid/internal/zag";

function Checkbox(props: { name?: string }) {
    const service = useMachine(checkbox.machine, () => ({
        id: "terms",
        name: props.name,
    }));
    const api = createMemo(() => checkbox.connect(service, normalizeProps));
    return (
        <label {...api().getRootProps()}>
            <span {...api().getControlProps()} />
            <input {...api().getHiddenInputProps()} />
        </label>
    );
}
```

It's internal: components use it, apps shouldn't. When `@zag-js/solid` supports Solid 2,
the port is swapped out by changing imports. What changed from Zag's adapter, and why, is
in the design doc's §8.

The root entry, `@pureform/solid`, exports nothing yet.

## Build and test

Through the omni MCP (or `omni run`):

- `build`: Vite library build into `dist/`.
- `test:unit`: Vitest in browser mode (Chromium), since the tests drive real pointer,
  keyboard, and form events. Set `CHROMIUM_PATH` to use a system Chromium.

The tests run Zag's checkbox, switch, and radio group through the port, wired as the
preset draws them, with a native input stretched over the control.

## Worth knowing

- A form reset doesn't work through Zag alone; the components will handle it (design doc
  §9.5).
- `solid-js` and `@solidjs/web` are peers at the exact release candidate the package is
  tested with (design doc §11).
