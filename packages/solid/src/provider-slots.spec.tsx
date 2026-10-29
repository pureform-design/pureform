import { createSignal, flush } from "solid-js";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { PureformProvider } from ".";
import { overlaysRegistry } from "./__fixtures__/registry";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { byTestId, mount, settle } from "./testing/mount";

describe("provider slot customization contract", () => {
    it("merges nested defaults under instance styles and handlers, without resetting state on updates", async () => {
        const calls: string[] = [];
        const [margin, setMargin] = createSignal(3);
        mount(() => (
            <PureformProvider
                registry={overlaysRegistry()}
                slotProps={{
                    button: {
                        root: {
                            style: {
                                "margin-top": "1px",
                                "margin-left": "4px",
                            },
                            onClick: () => calls.push("outer"),
                        },
                        label: { style: { "font-style": "italic" } },
                    },
                }}
            >
                <PureformProvider
                    slotProps={
                        margin() === 0
                            ? undefined
                            : {
                                  button: {
                                      root: {
                                          style: {
                                              "margin-left": `${margin()}px`,
                                          },
                                          onClick: () => calls.push("inner"),
                                      },
                                  },
                              }
                    }
                >
                    <Button
                        label="Toggle"
                        defaultSelected={false}
                        testId="toggle"
                        // oxlint-disable-next-line solid/style-prop -- ready-made styles are keyed by part
                        style={{ root: { "margin-top": "9px" } }}
                        slotProps={{
                            root: { onClick: () => calls.push("instance") },
                        }}
                    />
                </PureformProvider>
            </PureformProvider>
        ));
        await settle();
        const root = byTestId("toggle-root");
        expect(root.style.marginTop).toBe("9px");
        expect(root.style.marginLeft).toBe("3px");
        expect(byTestId("toggle-label").style.fontStyle).toBe("italic");
        await userEvent.click(root);
        await settle();
        expect(calls).toEqual(["outer", "inner", "instance"]);
        expect(root.getAttribute("aria-pressed")).toBe("true");
        setMargin(8);
        flush();
        expect(byTestId("toggle-root")).toBe(root);
        expect(root.style.marginLeft).toBe("8px");
        setMargin(0);
        flush();
        expect(root.style.marginLeft).toBe("4px");
        expect(root.getAttribute("aria-pressed")).toBe("true");
        calls.length = 0;
        await userEvent.click(root);
        expect(calls).toEqual(["outer", "instance"]);
    });

    it("uses style-slot root for the dialog surface, not its structural root or scrim", async () => {
        mount(() => (
            <PureformProvider
                registry={overlaysRegistry()}
                motion="reduce"
                slotProps={{
                    dialog: { root: { style: { "margin-top": "7px" } } },
                    scrim: { root: { style: { opacity: 0.25 } } },
                }}
            >
                <Dialog
                    defaultOpen
                    headline="Discard draft?"
                    body="Gone."
                    style={{ content: { "margin-left": "9px" } }}
                />
            </PureformProvider>
        ));
        await settle();
        const content = byTestId("pf-dialog-content");
        expect(content.style.marginTop).toBe("7px");
        expect(content.style.marginLeft).toBe("9px");
        expect(content.getAttribute("role")).toBe("dialog");
        expect(content.getAttribute("aria-labelledby")).toBe(
            byTestId("pf-dialog-headline").id,
        );
        expect(byTestId("pf-dialog-root").style.marginTop).toBe("");
        expect(byTestId("pf-dialog-backdrop").style.marginTop).toBe("");
        expect(byTestId("pf-dialog-backdrop").style.opacity).toBe("0.25");
    });
});
