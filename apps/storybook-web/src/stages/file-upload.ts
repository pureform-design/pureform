// Every renderer draws the file upload's trigger. React Native's leaves the picking to the app
// (its scene, `../native/scenes.ts`, is that app): pressing the trigger there adds a file to the
// list. The web's opens the browser's file dialog, which a play doesn't press.

import { testIds } from "@pureform/anatomy";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { isBaseStory, type StoryHooks } from "../renderers/hooks";

export const extendStory: NonNullable<StoryHooks["extendStory"]> = (
    name,
    story,
) =>
    isBaseStory(name)
        ? {
              ...story,
              play: async (context) => {
                  await story.play?.(context);
                  const { canvasElement, globals } = context;
                  const trigger = await within(canvasElement).findByRole(
                      "button",
                      { name: "Choose files" },
                  );
                  if (globals["renderer"] !== "native") return;
                  const items = () =>
                      canvasElement.querySelectorAll(
                          `[data-testid="${testIds.fileUpload.item}"]`,
                      ).length;
                  const before = items();
                  await userEvent.click(trigger);
                  await waitFor(() => expect(items()).toBe(before + 1));
              },
          }
        : story;
