// Button's hook: a spy for presses, and the play test every renderer runs.

import type { StoryObj } from "@storybook/html-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import type { StoryName } from "../renderers/hooks";

export const args = { onClick: fn() };

export const extendStory = (name: StoryName, story: StoryObj): StoryObj =>
    name.story !== "Default"
        ? story
        : {
              ...story,
              play: async ({ args, canvasElement }) => {
                  const canvas = within(canvasElement);
                  const button = await canvas.findByRole("button", {
                      name: "Save",
                  });
                  await userEvent.click(button);
                  await expect(args["onClick"]).toHaveBeenCalledOnce();
              },
          };
