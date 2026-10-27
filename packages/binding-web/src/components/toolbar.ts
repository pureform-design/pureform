import { toolbarSelection, withDefaults } from "@pureform/binding-core";
import type {
    ComponentDefaults,
    ProvidedTokens,
    ToolbarRootOwnProps,
} from "@pureform/binding-core";

/** The icon button tokens an unstyled vibrant toolbar gives its icon buttons, or `undefined`.
 *  It's vibrant by its own `color`, or else by the provider's `defaults` for the toolbar. A
 *  styled toolbar's root sets them as custom properties, which inherit; an unstyled one draws
 *  none of its colors, so its binding provides them instead. The accent follows the toolbar's
 *  `content` token, if the app sets it, and otherwise the color the toolbar inherits. */
export const unstyledToolbarProvidedTokens = (
    props: ToolbarRootOwnProps,
    defaults: ComponentDefaults,
): ProvidedTokens | undefined =>
    withDefaults(defaults.toolbar, toolbarSelection(props)).color === "vibrant"
        ? {
              iconButton: {
                  accent: "var(--components-toolbar-content, currentColor)",
              },
          }
        : undefined;
