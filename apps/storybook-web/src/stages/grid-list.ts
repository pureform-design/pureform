// The grid list's case gives `tiles` as data (`src/<renderer>/scenes.ts` turns them into tile
// children), so a play checks a tile is drawn for each.

import { testIds } from "@pureform/anatomy";
import { expect, waitFor } from "storybook/test";

import { isBaseStory, type StoryHooks } from "../renderers/hooks";

export const extendStory: NonNullable<StoryHooks["extendStory"]> = (
    name,
    story,
) =>
    isBaseStory(name)
        ? {
              ...story,
              play: async ({ args, canvasElement }) => {
                  const tiles = (args["tiles"] as readonly object[]).length;
                  await expect(tiles).toBeGreaterThan(0);
                  await waitFor(() =>
                      expect(
                          canvasElement.querySelectorAll(
                              `[data-testid="${testIds.gridList.tile}"]`,
                          ),
                      ).toHaveLength(tiles),
                  );
              },
          }
        : story;
