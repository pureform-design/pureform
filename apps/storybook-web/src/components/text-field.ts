// TextField's hook: the play test every renderer runs.

import type { StoryObj } from "@storybook/html-vite";
import { expect, userEvent, within } from "storybook/test";

import type { StoryName } from "../renderers/hooks";

export const extendStory = (name: StoryName, story: StoryObj): StoryObj =>
    name.story !== "Default"
        ? story
        : {
              ...story,
              play: async ({ canvasElement }) => {
                  const canvas = within(canvasElement);
                  const input = await canvas.findByRole("textbox", {
                      name: "Name",
                  });
                  await userEvent.type(input, "Ada");
                  await expect(input).toHaveValue("Ada");
              },
          };
