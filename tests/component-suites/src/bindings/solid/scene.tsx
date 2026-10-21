// A scene in Solid: the ready-made component inside `PureformProvider` with the target's registry.
// The browser (`harness.tsx`) and the server (`server.tsx`) render the same view.

import {
    materialIndication,
    noIndication,
    PureformProvider,
} from "@pureform/solid";
import type { Indication } from "@pureform/solid";
import { AppBar } from "@pureform/solid/app-bar";
import { Autocomplete } from "@pureform/solid/autocomplete";
import { Avatar } from "@pureform/solid/avatar";
import { Badge } from "@pureform/solid/badge";
import { BottomSheet } from "@pureform/solid/bottom-sheet";
import { Button } from "@pureform/solid/button";
import { ButtonGroup } from "@pureform/solid/button-group";
import { Card } from "@pureform/solid/card";
import { Checkbox } from "@pureform/solid/checkbox";
import { Chip } from "@pureform/solid/chip";
import { CircularProgress } from "@pureform/solid/circular-progress";
import { Dialog } from "@pureform/solid/dialog";
import { DragHandle } from "@pureform/solid/drag-handle";
import { Fab } from "@pureform/solid/fab";
import { FabMenu } from "@pureform/solid/fab-menu";
import { FullscreenDialog } from "@pureform/solid/fullscreen-dialog";
import { Icon } from "@pureform/solid/icon";
import { IconButton } from "@pureform/solid/icon-button";
import { LinearProgress } from "@pureform/solid/linear-progress";
import { List } from "@pureform/solid/list";
import { ListItem } from "@pureform/solid/list-item";
import { LoadingIndicator } from "@pureform/solid/loading-indicator";
import { Media } from "@pureform/solid/media";
import { Menu } from "@pureform/solid/menu";
import { NavigationBar } from "@pureform/solid/navigation-bar";
import { NavigationRail } from "@pureform/solid/navigation-rail";
import { RadioGroup } from "@pureform/solid/radio-group";
import { RichTooltip } from "@pureform/solid/rich-tooltip";
import { Ripple } from "@pureform/solid/ripple";
import { Scrim } from "@pureform/solid/scrim";
import { SearchBar } from "@pureform/solid/search-bar";
import { SearchView } from "@pureform/solid/search-view";
import { Select } from "@pureform/solid/select";
import { Separator } from "@pureform/solid/separator";
import { SideSheet } from "@pureform/solid/side-sheet";
import { Slider } from "@pureform/solid/slider";
import { Snackbar } from "@pureform/solid/snackbar";
import { SplitButton } from "@pureform/solid/split-button";
import { SupportingText } from "@pureform/solid/supporting-text";
import { Switch } from "@pureform/solid/switch";
import { Tabs } from "@pureform/solid/tabs";
import { TagsInput } from "@pureform/solid/tags-input";
import { Text } from "@pureform/solid/text";
import { TextArea } from "@pureform/solid/text-area";
import { TextField } from "@pureform/solid/text-field";
import { createToaster, Toaster } from "@pureform/solid/toast";
import type { ToastData } from "@pureform/solid/toast";
import { Tooltip } from "@pureform/solid/tooltip";
import { TouchTarget } from "@pureform/solid/touch-target";
import { Dynamic } from "@solidjs/web";
import type { JSX, ValidComponent } from "@solidjs/web";
import { type Accessor, omit, untrack } from "solid-js";

import { registry } from "#registry";

import { customIndication } from "../../harness/indications";
import type {
    ComponentName,
    Scene,
    SceneIndication,
    SceneProps,
} from "../../harness/scene";
import { sceneTheme } from "../../harness/themes";

/** The toaster with the scene's `toasts` in it, each staying until closed. */
function ToastScene(
    props: { readonly toasts?: readonly Partial<ToastData>[] } & Record<
        string,
        unknown
    >,
): JSX.Element {
    const toaster = createToaster();
    for (const toast of untrack(() => props.toasts) ?? []) {
        toaster.create({ duration: Infinity, ...toast });
    }
    return <Toaster toaster={toaster} {...(omit(props, "toasts") as object)} />;
}

/** Every component the suites render, by name. */
export const components: Record<ComponentName, ValidComponent> = {
    Avatar,
    Badge,
    BottomSheet,
    Button,
    ButtonGroup,
    Card,
    Checkbox,
    Chip,
    CircularProgress,
    LoadingIndicator,
    Dialog,
    DragHandle,
    Fab,
    FullscreenDialog,
    FabMenu,
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
    AppBar,
    SearchBar,
    SearchView,
    Select,
    Autocomplete,
    Separator,
    SideSheet,
    Slider,
    Snackbar,
    SplitButton,
    SupportingText,
    Switch,
    Tabs,
    TagsInput,
    Text,
    TextArea,
    TextField,
    Toast: ToastScene,
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
    props: Accessor<SceneProps>;
}): JSX.Element {
    const view = () => (
        <Dynamic
            component={components[props.scene.component]}
            {...indicationOf(props.scene.indication)}
            {...(props.props() as object)}
        />
    );
    const wrapper = props.scene.wrapper;
    return (
        <PureformProvider
            registry={registry}
            indication={
                props.scene.provider?.indication &&
                indications[props.scene.provider.indication]
            }
            dir={props.scene.provider?.dir}
            motion={props.scene.provider?.motion}
            theme={sceneTheme(props.scene.provider)}
            hydrate={props.scene.provider?.hydrate}
            overrides={props.scene.provider?.overrides}
        >
            {wrapper ? (
                <Dynamic
                    component={components[wrapper.component]}
                    {...indicationOf(wrapper.indication)}
                    {...(wrapper.props as object)}
                >
                    {view()}
                </Dynamic>
            ) : (
                view()
            )}
        </PureformProvider>
    );
}
