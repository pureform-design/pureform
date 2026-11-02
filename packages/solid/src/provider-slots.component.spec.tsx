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

    it("addresses a dialog's parts by name, as an instance does: the surface is `content`", async () => {
        mount(() => (
            <PureformProvider
                registry={overlaysRegistry()}
                motion="reduce"
                slotProps={{
                    dialog: {
                        content: { style: { "margin-top": "7px" } },
                        root: { style: { "margin-bottom": "5px" } },
                        positioner: { style: { "padding-top": "3px" } },
                        backdrop: { style: { opacity: 0.5 } },
                    },
                    scrim: { root: { style: { "margin-left": "2px" } } },
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
        expect(content.style.marginBottom).toBe("");
        expect(content.getAttribute("role")).toBe("dialog");
        expect(content.getAttribute("aria-labelledby")).toBe(
            byTestId("pf-dialog-headline").id,
        );
        // The unstyled wrapper and the positioner take their own keys now.
        expect(byTestId("pf-dialog-root").style.marginBottom).toBe("5px");
        expect(byTestId("pf-dialog-root").style.marginTop).toBe("");
        expect(byTestId("pf-dialog-positioner").style.paddingTop).toBe("3px");
        // The backdrop takes every scrim's props, then this dialog's own `backdrop`.
        const backdrop = byTestId("pf-dialog-backdrop");
        expect(backdrop.style.marginLeft).toBe("2px");
        expect(backdrop.style.opacity).toBe("0.5");
    });

    it("lets an instance's backdrop win over the provider's, and one dialog's key not reach another's", async () => {
        mount(() => (
            <PureformProvider
                registry={overlaysRegistry()}
                motion="reduce"
                slotProps={{
                    dialog: { backdrop: { style: { opacity: 0.5 } } },
                    bottomSheet: { backdrop: { style: { opacity: 0.1 } } },
                }}
            >
                <Dialog
                    defaultOpen
                    headline="Discard draft?"
                    body="Gone."
                    // oxlint-disable-next-line solid/style-prop -- a part-keyed style record, not CSS properties
                    style={{ backdrop: { opacity: 0.8 } }}
                />
            </PureformProvider>
        ));
        await settle();
        expect(byTestId("pf-dialog-backdrop").style.opacity).toBe("0.8");
    });

    it("keeps the keys a component owns from a provider, and leaves the ones a user may set", async () => {
        // Keys the types leave out, passed through to reach the runtime check.
        const untyped1: object = { "aria-pressed": false };
        // Keys the types leave out, passed through to reach the runtime check.
        const untyped2: object = { "data-testid": "provided" };
        mount(() => (
            <PureformProvider
                registry={overlaysRegistry()}
                slotProps={{
                    button: {
                        root: {
                            ...untyped1,
                            role: "link",
                            title: "from the provider",
                            ...untyped2,
                        },
                    },
                }}
            >
                <Button label="Toggle" defaultSelected testId="toggle" />
            </PureformProvider>
        ));
        await settle();
        // Owned: the component's test id and the machine's state hold.
        const root = byTestId("toggle-root");
        expect(root.getAttribute("aria-pressed")).toBe("true");
        // Settable: a provider may set a role and a title.
        expect(root.getAttribute("role")).toBe("link");
        expect(root.getAttribute("title")).toBe("from the provider");
    });
});
