import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { PureformProvider } from ".";
import { overlaysRegistry } from "./__fixtures__/registry";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { interact, mount, outside, settle } from "./testing/render";

describe("provider slot customization contract", () => {
    it("merges nested defaults under instance styles and handlers, without resetting state on updates", async () => {
        const calls: string[] = [];
        const margin = outside(3);
        mount(
            <PureformProvider
                registry={overlaysRegistry()}
                slotProps={{
                    button: {
                        root: {
                            style: { marginTop: 1, marginLeft: 4 },
                            onClick: () => calls.push("outer"),
                        },
                        label: { style: { fontStyle: "italic" } },
                    },
                }}
            >
                <margin.Holder>
                    {(value) => (
                        <PureformProvider
                            slotProps={
                                value === 0
                                    ? undefined
                                    : {
                                          button: {
                                              root: {
                                                  style: { marginLeft: value },
                                                  onClick: () =>
                                                      calls.push("inner"),
                                              },
                                          },
                                      }
                            }
                        >
                            <Button
                                label="Toggle"
                                defaultSelected={false}
                                testId="toggle"
                                style={{ root: { marginTop: 9 } }}
                                slotProps={{
                                    root: {
                                        onClick: () => calls.push("instance"),
                                    },
                                }}
                            />
                        </PureformProvider>
                    )}
                </margin.Holder>
            </PureformProvider>,
        );
        await settle();
        const root = screen.getByTestId("toggle-root");
        expect(root.style.marginTop).toBe("9px");
        expect(root.style.marginLeft).toBe("3px");
        expect(screen.getByTestId("toggle-label").style.fontStyle).toBe(
            "italic",
        );
        await interact(() => userEvent.click(root));
        expect(calls).toEqual(["outer", "inner", "instance"]);
        expect(root.getAttribute("aria-pressed")).toBe("true");
        await margin.set(8);
        expect(screen.getByTestId("toggle-root")).toBe(root);
        expect(root.style.marginLeft).toBe("8px");
        await margin.set(0);
        expect(root.style.marginLeft).toBe("4px");
        expect(root.getAttribute("aria-pressed")).toBe("true");
        calls.length = 0;
        await interact(() => userEvent.click(root));
        expect(calls).toEqual(["outer", "instance"]);
    });

    it("addresses a dialog's parts by name, as an instance does: the surface is `content`", async () => {
        mount(
            <PureformProvider
                registry={overlaysRegistry()}
                motion="reduce"
                slotProps={{
                    dialog: {
                        content: { style: { marginTop: 7 } },
                        root: { style: { marginBottom: 5 } },
                        positioner: { style: { paddingTop: 3 } },
                        backdrop: { style: { opacity: 0.5 } },
                    },
                    scrim: { root: { style: { marginLeft: 2 } } },
                }}
            >
                <Dialog
                    defaultOpen
                    headline="Discard draft?"
                    body="Gone."
                    style={{ content: { marginLeft: 9 } }}
                />
            </PureformProvider>,
        );
        await settle();
        const content = screen.getByTestId("pf-dialog-content");
        expect(content.style.marginTop).toBe("7px");
        expect(content.style.marginLeft).toBe("9px");
        expect(content.style.marginBottom).toBe("");
        expect(content.getAttribute("role")).toBe("dialog");
        expect(content.getAttribute("aria-labelledby")).toBe(
            screen.getByTestId("pf-dialog-headline").id,
        );
        // The unstyled wrapper and the positioner take their own keys now.
        expect(screen.getByTestId("pf-dialog-root").style.marginBottom).toBe(
            "5px",
        );
        expect(screen.getByTestId("pf-dialog-root").style.marginTop).toBe("");
        expect(
            screen.getByTestId("pf-dialog-positioner").style.paddingTop,
        ).toBe("3px");
        // The backdrop takes every scrim's props, then this dialog's own `backdrop`.
        const backdrop = screen.getByTestId("pf-dialog-backdrop");
        expect(backdrop.style.marginLeft).toBe("2px");
        expect(backdrop.style.opacity).toBe("0.5");
    });

    it("lets an instance's backdrop win over the provider's, and one dialog's key not reach another's", async () => {
        mount(
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
                    style={{ backdrop: { opacity: 0.8 } }}
                />
            </PureformProvider>,
        );
        await settle();
        expect(screen.getByTestId("pf-dialog-backdrop").style.opacity).toBe(
            "0.8",
        );
    });

    it("keeps the keys a component owns from a provider, and leaves the ones a user may set", async () => {
        // Keys the types leave out, passed through to reach the runtime check.
        const untyped1: object = { "aria-pressed": false };
        // Keys the types leave out, passed through to reach the runtime check.
        const untyped2: object = { "data-testid": "provided" };
        mount(
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
            </PureformProvider>,
        );
        await settle();
        const root = screen.getByTestId("toggle-root");
        // Owned: the machine's state and the component's test id hold.
        expect(root.getAttribute("aria-pressed")).toBe("true");
        // Settable: a provider may set a role and a title.
        expect(root.getAttribute("role")).toBe("link");
        expect(root.getAttribute("title")).toBe("from the provider");
    });
});
