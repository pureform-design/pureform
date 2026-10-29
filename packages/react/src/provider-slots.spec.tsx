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

    it("uses style-slot root for the dialog surface, not its structural root or scrim", async () => {
        mount(
            <PureformProvider
                registry={overlaysRegistry()}
                motion="reduce"
                slotProps={{
                    dialog: { root: { style: { marginTop: 7 } } },
                    scrim: { root: { style: { opacity: 0.25 } } },
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
        expect(content.getAttribute("role")).toBe("dialog");
        expect(content.getAttribute("aria-labelledby")).toBe(
            screen.getByTestId("pf-dialog-headline").id,
        );
        expect(screen.getByTestId("pf-dialog-root").style.marginTop).toBe("");
        expect(screen.getByTestId("pf-dialog-backdrop").style.marginTop).toBe(
            "",
        );
        expect(screen.getByTestId("pf-dialog-backdrop").style.opacity).toBe(
            "0.25",
        );
    });
});
