/** @jsxImportSource react */
// A scene in React: the ready-made component inside `PureformProvider` with the target's registry.
// The browser (`harness.tsx`) and the server (`server.tsx`) render the same view.

import {
    materialIndication,
    noIndication,
    PureformProvider,
} from "@pureform/react";
import type { Indication } from "@pureform/react";
import { Avatar } from "@pureform/react/avatar";
import { Badge } from "@pureform/react/badge";
import { Button } from "@pureform/react/button";
import { Card } from "@pureform/react/card";
import { Checkbox } from "@pureform/react/checkbox";
import { Chip } from "@pureform/react/chip";
import { CircularProgress } from "@pureform/react/circular-progress";
import { Dialog } from "@pureform/react/dialog";
import { Fab } from "@pureform/react/fab";
import { FullscreenDialog } from "@pureform/react/fullscreen-dialog";
import { Icon } from "@pureform/react/icon";
import { IconButton } from "@pureform/react/icon-button";
import { LinearProgress } from "@pureform/react/linear-progress";
import { List } from "@pureform/react/list";
import { ListItem } from "@pureform/react/list-item";
import { Media } from "@pureform/react/media";
import { Menu } from "@pureform/react/menu";
import { NavigationBar } from "@pureform/react/navigation-bar";
import { NavigationRail } from "@pureform/react/navigation-rail";
import { RadioGroup } from "@pureform/react/radio-group";
import { RichTooltip } from "@pureform/react/rich-tooltip";
import { Ripple } from "@pureform/react/ripple";
import { Scrim } from "@pureform/react/scrim";
import { SearchBar } from "@pureform/react/search-bar";
import { Select } from "@pureform/react/select";
import { Separator } from "@pureform/react/separator";
import { Slider } from "@pureform/react/slider";
import { Snackbar } from "@pureform/react/snackbar";
import { SupportingText } from "@pureform/react/supporting-text";
import { Switch } from "@pureform/react/switch";
import { Tabs } from "@pureform/react/tabs";
import { TagsInput } from "@pureform/react/tags-input";
import { Text } from "@pureform/react/text";
import { TextArea } from "@pureform/react/text-area";
import { TextField } from "@pureform/react/text-field";
import { Tooltip } from "@pureform/react/tooltip";
import { TouchTarget } from "@pureform/react/touch-target";
import { createElement, type ComponentType, type ReactNode } from "react";

import { registry } from "#registry";

import { customIndication } from "../../harness/indications";
import type {
    ComponentName,
    Scene,
    SceneIndication,
    SceneProps,
} from "../../harness/scene";
import { sceneTheme } from "../../harness/themes";

/** Every component the suites render, by name. */
export const components: Record<ComponentName, ComponentType<never>> = {
    Avatar,
    Badge,
    Button,
    Card,
    Checkbox,
    Chip,
    CircularProgress,
    Dialog,
    Fab,
    FullscreenDialog,
    Icon,
    IconButton,
    LinearProgress,
    List,
    ListItem,
    Media,
    Menu,
    NavigationBar,
    NavigationRail,
    RadioGroup,
    Ripple,
    RichTooltip,
    Scrim,
    SearchBar,
    Select,
    Separator,
    Slider,
    Snackbar,
    SupportingText,
    Switch,
    Tabs,
    TagsInput,
    Text,
    TextArea,
    TextField,
    Tooltip,
    TouchTarget,
};

/** The indications a scene names. */
const indications: Record<SceneIndication, Indication> = {
    material: materialIndication(),
    "ink-sparkle": materialIndication({ ripple: "ink-sparkle" }),
    "no-ripple": materialIndication({ ripple: false }),
    none: noIndication,
    custom: customIndication(materialIndication()),
    "no-layer": {
        ...materialIndication(),
        name: "bench:no-layer",
        layer: false,
    },
};

const indicationOf = (name: SceneIndication | undefined) =>
    name === undefined ? {} : { indication: indications[name] };

export function SceneView(props: {
    scene: Scene;
    props: SceneProps;
}): ReactNode {
    const { scene } = props;
    const view = createElement(
        components[scene.component] as ComponentType<object>,
        { ...indicationOf(scene.indication), ...props.props },
    );
    return (
        <PureformProvider
            registry={registry}
            indication={
                scene.provider?.indication &&
                indications[scene.provider.indication]
            }
            dir={props.scene.provider?.dir}
            motion={props.scene.provider?.motion}
            theme={sceneTheme(props.scene.provider)}
            hydrate={props.scene.provider?.hydrate}
            overrides={props.scene.provider?.overrides}
        >
            {scene.wrapper
                ? createElement(
                      components[
                          scene.wrapper.component
                      ] as ComponentType<object>,
                      {
                          ...indicationOf(scene.wrapper.indication),
                          ...scene.wrapper.props,
                      },
                      view,
                  )
                : view}
        </PureformProvider>
    );
}
