import { createRegistry, VERSION } from "@pureform/styling";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

import {
    controllableNames,
    controlSwitchMessage,
    createChangeReason,
    createControlTracker,
} from "./controllable";
import type { ChangeDetails, Controllable } from "./controllable";
import { resolveReducedMotion } from "./motion";
import { versionMismatch } from "./version";
import { warnOnce } from "./warn";

describe("Controllable", () => {
    it("writes the value, default, and change props", () => {
        type Props = Controllable<"checked", boolean | "indeterminate">;
        expectTypeOf<Props["checked"]>().toEqualTypeOf<
            boolean | "indeterminate" | undefined
        >();
        expectTypeOf<Props["defaultChecked"]>().toEqualTypeOf<
            boolean | "indeterminate" | undefined
        >();
        expectTypeOf<NonNullable<Props["onCheckedChange"]>>().toEqualTypeOf<
            (
                details: ChangeDetails<"checked", boolean | "indeterminate">,
            ) => void
        >();
        expectTypeOf<
            Parameters<NonNullable<Props["onCheckedChange"]>>[0]["reason"]
        >().toEqualTypeOf<"reset" | undefined>();
    });

    it("names the three props", () => {
        expect(controllableNames("value")).toEqual({
            value: "value",
            defaultValue: "defaultValue",
            onChange: "onValueChange",
        });
    });
});

describe("createControlTracker", () => {
    it("warns once when the value prop switches", () => {
        const warn = vi.fn();
        const track = createControlTracker("Checkbox", "checked", true, warn);
        track(true);
        expect(warn).not.toHaveBeenCalled();
        track(false);
        track(true);
        track(false);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledWith(
            controlSwitchMessage("Checkbox", "checked", false),
        );
        expect(warn.mock.calls[0]![0]).toMatch(
            /Checkbox switched `checked` from controlled to uncontrolled.*`defaultChecked`/,
        );
    });

    it("says which way it switched", () => {
        expect(controlSwitchMessage("Select", "value", true)).toMatch(
            /from uncontrolled to controlled/,
        );
    });
});

describe("createChangeReason", () => {
    const collect = () => {
        const seen: unknown[] = [];
        return { seen, callback: (details: object) => seen.push(details) };
    };

    it("marks a callback during the update, even one a machine runs in a microtask", async () => {
        const reason = createChangeReason();
        const { seen, callback } = collect();
        reason.during(() => {
            reason.report(callback, { checked: true });
            queueMicrotask(() => reason.report(callback, { checked: false }));
        });
        await Promise.resolve();
        await Promise.resolve();
        reason.report(callback, { checked: true });
        expect(seen).toEqual([
            { checked: true, reason: "reset" },
            { checked: false, reason: "reset" },
            { checked: true },
        ]);
    });

    it("marks or drops callbacks until the next task", async () => {
        const reason = createChangeReason();
        const { seen, callback } = collect();
        reason.untilNextTask();
        reason.report(callback, { value: "a" });
        await new Promise((resolve) => setTimeout(() => resolve(undefined)));
        reason.untilNextTask({ drop: true });
        reason.report(callback, { value: "b" });
        await new Promise((resolve) => setTimeout(() => resolve(undefined)));
        reason.report(callback, { value: "c" });
        expect(seen).toEqual([{ value: "a", reason: "reset" }, { value: "c" }]);
    });

    it("passes the same details object when not resetting", () => {
        const details = { value: "a" };
        const callback = vi.fn();
        createChangeReason().report(callback, details);
        expect(callback.mock.calls[0]![0]).toBe(details);
    });
});

describe("resolveReducedMotion", () => {
    it("lets reduce and full decide, and system follow the system", () => {
        expect(resolveReducedMotion("reduce", false)).toBe(true);
        expect(resolveReducedMotion("full", true)).toBe(false);
        expect(resolveReducedMotion("system", true)).toBe(true);
        expect(resolveReducedMotion("system", false)).toBe(false);
    });
});

describe("warnOnce", () => {
    it("warns once per message", () => {
        const warn = vi.fn();
        warnOnce("pureform: test message", warn);
        warnOnce("pureform: test message", warn);
        expect(warn).toHaveBeenCalledTimes(1);
    });
});

describe("versionMismatch", () => {
    it("passes a registry that recorded no version", () => {
        expect(versionMismatch({})).toBeUndefined();
        expect(versionMismatch(undefined)).toBeUndefined();
    });

    it("passes a registry made for the running version", () => {
        expect(
            versionMismatch(createRegistry({}, { version: VERSION })),
        ).toBeUndefined();
    });

    it("warns when the generated registry's recorded core version differs from the runtime's", () => {
        const message = versionMismatch(
            createRegistry({}, { version: "0.3.0" }),
            "0.4.1",
        );
        expect(message).toContain("made for core 0.3.0");
        expect(message).toContain("@pureform/styling 0.4.1 is running");
        expect(message).toContain("pureform generate");
    });
});
