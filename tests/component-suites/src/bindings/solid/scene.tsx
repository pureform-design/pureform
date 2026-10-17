// A scene in Solid: the ready-made component inside `PureformProvider` with the target's registry.
// The browser (`harness.tsx`) and the server (`server.tsx`) render the same view.

import { PureformProvider } from "@pureform/solid";
import { Button } from "@pureform/solid/button";
import { Checkbox } from "@pureform/solid/checkbox";
import { Chip } from "@pureform/solid/chip";
import { Dialog } from "@pureform/solid/dialog";
import { Fab } from "@pureform/solid/fab";
import { IconButton } from "@pureform/solid/icon-button";
import { List } from "@pureform/solid/list";
import { ListItem } from "@pureform/solid/list-item";
import { Menu } from "@pureform/solid/menu";
import { NavigationBar } from "@pureform/solid/navigation-bar";
import { NavigationRail } from "@pureform/solid/navigation-rail";
import { RadioGroup } from "@pureform/solid/radio-group";
import { Select } from "@pureform/solid/select";
import { Snackbar } from "@pureform/solid/snackbar";
import { Switch } from "@pureform/solid/switch";
import { Tabs } from "@pureform/solid/tabs";
import { TextArea } from "@pureform/solid/text-area";
import { TextField } from "@pureform/solid/text-field";
import { Tooltip } from "@pureform/solid/tooltip";
import { Dynamic } from "@solidjs/web";
import type { JSX, ValidComponent } from "@solidjs/web";
import type { Accessor } from "solid-js";

import { registry } from "#registry";

import type { ComponentName, Scene, SceneProps } from "../../harness/scene";
import { sceneTheme } from "../../harness/themes";

/** Every component the suites render, by name. */
export const components: Record<ComponentName, ValidComponent> = {
    Button,
    Checkbox,
    Chip,
    Dialog,
    Fab,
    IconButton,
    List,
    ListItem,
    Menu,
    NavigationBar,
    NavigationRail,
    RadioGroup,
    Select,
    Snackbar,
    Switch,
    Tabs,
    TextArea,
    TextField,
    Tooltip,
};

export function SceneView(props: {
    scene: Scene;
    props: Accessor<SceneProps>;
}): JSX.Element {
    return (
        <PureformProvider
            registry={registry}
            dir={props.scene.provider?.dir}
            motion={props.scene.provider?.motion}
            theme={sceneTheme(props.scene.provider)}
            hydrate={props.scene.provider?.hydrate}
            overrides={props.scene.provider?.overrides}
        >
            <Dynamic
                component={components[props.scene.component]}
                {...(props.props() as object)}
            />
        </PureformProvider>
    );
}
