/** @jsxImportSource react */
// A scene in React: the ready-made component inside `PureformProvider` with the target's registry.
// The browser (`harness.tsx`) and the server (`server.tsx`) render the same view.

import {
    materialIndication,
    noIndication,
    PureformProvider,
} from "@pureform/react";
import type { Indication } from "@pureform/react";
import { Accordion } from "@pureform/react/accordion";
import { AppBar } from "@pureform/react/app-bar";
import { Autocomplete } from "@pureform/react/autocomplete";
import { Avatar } from "@pureform/react/avatar";
import { Badge } from "@pureform/react/badge";
import { BottomSheet } from "@pureform/react/bottom-sheet";
import { Button } from "@pureform/react/button";
import { ButtonGroup } from "@pureform/react/button-group";
import { Card } from "@pureform/react/card";
import { Carousel } from "@pureform/react/carousel";
import { Checkbox } from "@pureform/react/checkbox";
import { Chip } from "@pureform/react/chip";
import { CircularProgress } from "@pureform/react/circular-progress";
import { DateInput } from "@pureform/react/date-input";
import { DatePicker } from "@pureform/react/date-picker";
import { Dialog } from "@pureform/react/dialog";
import { DockedDatePicker } from "@pureform/react/docked-date-picker";
import { DragHandle } from "@pureform/react/drag-handle";
import { Fab } from "@pureform/react/fab";
import { FabMenu } from "@pureform/react/fab-menu";
import { FullscreenDialog } from "@pureform/react/fullscreen-dialog";
import { Icon } from "@pureform/react/icon";
import { IconButton } from "@pureform/react/icon-button";
import { LinearProgress } from "@pureform/react/linear-progress";
import { List } from "@pureform/react/list";
import { ListItem } from "@pureform/react/list-item";
import { LoadingIndicator } from "@pureform/react/loading-indicator";
import { Media } from "@pureform/react/media";
import { Menu } from "@pureform/react/menu";
import { NavigationBar } from "@pureform/react/navigation-bar";
import { NavigationRail } from "@pureform/react/navigation-rail";
import { Paginator } from "@pureform/react/paginator";
import { RadioGroup } from "@pureform/react/radio-group";
import { RichTooltip } from "@pureform/react/rich-tooltip";
import { Ripple } from "@pureform/react/ripple";
import { Scrim } from "@pureform/react/scrim";
import { SearchBar } from "@pureform/react/search-bar";
import { SearchView } from "@pureform/react/search-view";
import { Select } from "@pureform/react/select";
import { Separator } from "@pureform/react/separator";
import { SideSheet } from "@pureform/react/side-sheet";
import { Slider } from "@pureform/react/slider";
import { Snackbar } from "@pureform/react/snackbar";
import { SplitButton } from "@pureform/react/split-button";
import { Stepper } from "@pureform/react/stepper";
import { SupportingText } from "@pureform/react/supporting-text";
import { Switch } from "@pureform/react/switch";
import { Tabs } from "@pureform/react/tabs";
import { TagsInput } from "@pureform/react/tags-input";
import { Text } from "@pureform/react/text";
import { TextArea } from "@pureform/react/text-area";
import { TextField } from "@pureform/react/text-field";
import { TimeInput } from "@pureform/react/time-input";
import { Table } from "@pureform/react/table";
import { TimePicker } from "@pureform/react/time-picker";
import { createToaster, Toaster } from "@pureform/react/toast";
import type { ToastData } from "@pureform/react/toast";
import { Toolbar } from "@pureform/react/toolbar";
import { Tooltip } from "@pureform/react/tooltip";
import { TouchTarget } from "@pureform/react/touch-target";
import { Tree } from "@pureform/react/tree";
import {
    createElement,
    type ComponentType,
    type ReactNode,
    useState,
} from "react";

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
function ToastScene({
    toasts,
    ...props
}: { readonly toasts?: readonly Partial<ToastData>[] } & Record<
    string,
    unknown
>): ReactNode {
    const [toaster] = useState(() => {
        const store = createToaster();
        for (const toast of toasts ?? []) {
            store.create({ duration: Infinity, ...toast });
        }
        return store;
    });
    return <Toaster toaster={toaster} {...props} />;
}

/** Every component the suites render, by name. */
export const components: Record<ComponentName, ComponentType<never>> = {
    Avatar,
    Badge,
    BottomSheet,
    Button,
    ButtonGroup,
    Card,
    Carousel,
    Accordion,
    Tree,
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
    Paginator,
    TimePicker,
    Table,
    TimeInput,
    SearchBar,
    SearchView,
    Select,
    Autocomplete,
    DatePicker,
    DockedDatePicker,
    DateInput,
    Separator,
    SideSheet,
    Slider,
    Snackbar,
    SplitButton,
    Stepper,
    SupportingText,
    Switch,
    Tabs,
    TagsInput,
    Text,
    TextArea,
    TextField,
    Toast: ToastScene,
    Toolbar,
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
