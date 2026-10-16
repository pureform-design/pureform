// Compile a single value node to its CSS string form.
//
// This is the string-context compiler. A `ConditionalNode` in a value slot is compiled to a
// conditional value object by the sibling compiler in `conditions.ts`; if one reaches
// here (a string-only context) it falls back to its `base` value.

import { getByPath, tokenValue } from "@pureform/core";
import type { ValueNode } from "@pureform/core/ast";

import type { LowerCtx } from "./context";
import {
    aliasTarget,
    formatColor,
    hyphenate,
    KEYWORD_CSS,
    varName,
} from "./css";

export const compileNodeToCSS = (node: ValueNode, ctx: LowerCtx): string => {
    switch (node.type) {
        case "literal":
            // Raw off-baseline escape, emitted verbatim; any unit is already in the string.
            return node.value;
        case "keyword":
            // Baseline keyword; the keyword table owns the web spelling.
            return KEYWORD_CSS[node.value] ?? node.value;
        case "numeric":
            return node.unit === "none"
                ? String(node.value)
                : `${node.value}${node.unit}`;
        case "color":
            return formatColor(node);
        case "alias": {
            const target = aliasTarget(node.path);
            if (target.kind === "token") return ctx.tokenRef(target.ref);
            if (target.kind === "textStyle") return target.name;
            // Resolve: follow the alias and inline the result (component tokens resolve to a
            // dynamic var; metadata is unwrapped so it stays transparent).
            return compileNodeToCSS(
                tokenValue(getByPath(ctx.config, node.path)) as ValueNode,
                ctx,
            );
        }
        case "dynamic": {
            const name = varName(node.path, ctx.prefix);
            return node.default
                ? `var(${name}, ${compileNodeToCSS(node.default, ctx)})`
                : `var(${name})`;
        }
        case "platform": {
            // This target's value, else the portable default.
            const chosen = node.values[ctx.target] ?? node.default;
            return compileNodeToCSS(chosen, ctx);
        }
        case "utilityArg":
            // A dynamic utility's arg() is substituted during utility expansion, before this
            // compiler runs. Reaching here means an arg() escaped a template, which the config
            // validator should already have rejected.
            throw new Error("arg() used outside a dynamic-utility template");
        case "conditional":
            return compileNodeToCSS(node.base, ctx);
        case "colorMix":
            return `color-mix(in ${node.space}, ${compileNodeToCSS(node.base, ctx)}, ${compileNodeToCSS(node.with, ctx)} ${compileNodeToCSS(node.amount, ctx)})`;
        case "shadow":
            return node.layers
                .map((l) =>
                    [
                        l.inset ? "inset" : null,
                        compileNodeToCSS(l.x, ctx),
                        compileNodeToCSS(l.y, ctx),
                        compileNodeToCSS(l.blur, ctx),
                        l.spread ? compileNodeToCSS(l.spread, ctx) : null,
                        compileNodeToCSS(l.color, ctx),
                    ]
                        .filter(Boolean)
                        .join(" "),
                )
                .join(", ");
        case "gradient": {
            const stops = node.stops.map((s) =>
                s.position
                    ? `${compileNodeToCSS(s.color, ctx)} ${compileNodeToCSS(s.position, ctx)}`
                    : compileNodeToCSS(s.color, ctx),
            );
            const head =
                node.kind === "radial"
                    ? node.extent
                        ? [node.extent]
                        : []
                    : node.angle
                      ? [compileNodeToCSS(node.angle, ctx)]
                      : [];
            return `${node.kind}-gradient(${[...head, ...stops].join(", ")})`;
        }
        case "transform":
            return node.ops
                .map(
                    (o) =>
                        `${o.fn}(${o.args.map((a) => compileNodeToCSS(a, ctx)).join(", ")})`,
                )
                .join(" ");
        case "filter":
            return node.fns
                .map((f) =>
                    f.fn === "dropShadow"
                        ? `drop-shadow(${[f.layer.x, f.layer.y, f.layer.blur, f.layer.color].map((a) => compileNodeToCSS(a, ctx)).join(" ")})`
                        : `${f.fn}(${f.args.map((a) => compileNodeToCSS(a, ctx)).join(" ")})`,
                )
                .join(" ");
        case "shape": {
            const point = ([x, y]: readonly [ValueNode, ValueNode]) =>
                `${compileNodeToCSS(x, ctx)} ${compileNodeToCSS(y, ctx)}`;
            const contours = node.contours.map((contour, index) =>
                [
                    `${index === 0 ? "from" : "move to"} ${point(contour.from)}`,
                    ...contour.segments.map((segment) =>
                        segment.op === "line"
                            ? `line to ${point(segment.to)}`
                            : `curve to ${point(segment.to)} with ${point(segment.c1)} / ${point(segment.c2)}`,
                    ),
                    "close",
                ].join(", "),
            );
            const rule = node.fillRule === "evenodd" ? "evenodd " : "";
            return `shape(${rule}${contours.join(", ")})`;
        }
        case "transition":
            return node.parts
                .map((p) =>
                    [
                        typeof p.property === "string"
                            ? hyphenate(p.property)
                            : varName(p.property.path, ctx.prefix),
                        compileNodeToCSS(p.duration, ctx),
                        p.easing ? compileNodeToCSS(p.easing, ctx) : null,
                        p.delay ? compileNodeToCSS(p.delay, ctx) : null,
                    ]
                        .filter(Boolean)
                        .join(" "),
                )
                .join(", ");
        case "animation":
            return [
                compileNodeToCSS(node.duration, ctx),
                node.easing ? compileNodeToCSS(node.easing, ctx) : null,
                node.delay ? compileNodeToCSS(node.delay, ctx) : null,
                node.iterations != null ? String(node.iterations) : null,
                node.direction ?? null,
                node.fillMode ?? null,
                node.name,
            ]
                .filter(Boolean)
                .join(" ");
        case "easing":
            return node.kind === "cubicBezier"
                ? `cubic-bezier(${node.points.join(", ")})`
                : node.kind === "steps"
                  ? `steps(${node.steps.count}${node.steps.jump ? `, ${node.steps.jump}` : ""})`
                  : hyphenate(node.name);
        case "calc":
            return `calc(${node.operands.map((o) => compileNodeToCSS(o, ctx)).join(` ${node.op} `)})`;
        case "mathFn":
            return `${node.fn}(${node.args.map((a) => compileNodeToCSS(a, ctx)).join(", ")})`;
        case "fontFamily":
            return [...node.stack, node.generic]
                .filter((f): f is string => Boolean(f))
                .map((f) => (/\s/.test(f) ? `"${f}"` : f))
                .join(", ");
    }
};
