import { normalizeProps } from "@zag-js/vanilla";
import { describe, expect, it } from "vitest";

import * as toast from ".";

describe("toast machine", () => {
    it("adds the icon to Zag's parts", () => {
        expect(toast.anatomy.keys()).toEqual([
            "group",
            "root",
            "title",
            "description",
            "actionTrigger",
            "closeTrigger",
            "icon",
        ]);
    });

    it("gives the icon its part, the toast's type, and hides it", () => {
        const store = toast.createStore({ placement: "bottom-end" });
        const group = toast.group.machine;
        expect(typeof group.initialState).toBe("function");
        const id = store.create({ title: "Saved", type: "success" });
        expect(store.getVisibleToasts()).toEqual([
            expect.objectContaining({ id, type: "success", title: "Saved" }),
        ]);
        const api = toast.connect(
            {
                state: { hasTag: () => true },
                send: () => {},
                prop: (name: string) =>
                    name === "type"
                        ? "success"
                        : name === "parent"
                          ? { computed: () => "bottom-end" }
                          : undefined,
                scope: { id: "t", ids: {}, getRootNode: () => document },
                context: {
                    get: (key: string) =>
                        key === "rendered"
                            ? { title: true, description: false }
                            : undefined,
                },
                computed: () => 0,
            } as unknown as toast.Service,
            normalizeProps,
        );
        expect(api.getIconProps()).toMatchObject({
            "data-scope": "toast",
            "data-part": "icon",
            "data-type": "success",
            "aria-hidden": true,
        });
    });
});
