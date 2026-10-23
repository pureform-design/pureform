// A scene in Solid: the ready-made component inside `PureformProvider` with the target's registry.
// The browser (`harness.tsx`) and the server (`server.tsx`) render the same view.

import {
    materialIndication,
    noIndication,
    PureformProvider,
} from "@pureform/solid";
import type { Indication } from "@pureform/solid";
import { Accordion } from "@pureform/solid/accordion";
import { AppBar } from "@pureform/solid/app-bar";
import { Autocomplete } from "@pureform/solid/autocomplete";
import { Avatar } from "@pureform/solid/avatar";
import { Badge } from "@pureform/solid/badge";
import { BottomSheet } from "@pureform/solid/bottom-sheet";
import { Button } from "@pureform/solid/button";
import { ButtonGroup } from "@pureform/solid/button-group";
import { Card } from "@pureform/solid/card";
import { Carousel } from "@pureform/solid/carousel";
import { Checkbox } from "@pureform/solid/checkbox";
import { Chip } from "@pureform/solid/chip";
import { ChipSet } from "@pureform/solid/chip-set";
import { CircularProgress } from "@pureform/solid/circular-progress";
import { DateInput } from "@pureform/solid/date-input";
import { DatePicker } from "@pureform/solid/date-picker";
import { Dialog } from "@pureform/solid/dialog";
import { DockedDatePicker } from "@pureform/solid/docked-date-picker";
import { DragHandle } from "@pureform/solid/drag-handle";
import { Fab } from "@pureform/solid/fab";
import { FabMenu } from "@pureform/solid/fab-menu";
import { FadeThrough } from "@pureform/solid/fade-through";
import { FullscreenDialog } from "@pureform/solid/fullscreen-dialog";
import { GridList } from "@pureform/solid/grid-list";
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
import { Paginator } from "@pureform/solid/paginator";
import { Popover } from "@pureform/solid/popover";
import { RadioGroup } from "@pureform/solid/radio-group";
import { RichTooltip } from "@pureform/solid/rich-tooltip";
import { Ripple } from "@pureform/solid/ripple";
import { Scrim } from "@pureform/solid/scrim";
import { SearchBar } from "@pureform/solid/search-bar";
import { SearchView } from "@pureform/solid/search-view";
import { Select } from "@pureform/solid/select";
import { SelectionList } from "@pureform/solid/selection-list";
import { Separator } from "@pureform/solid/separator";
import { SideSheet } from "@pureform/solid/side-sheet";
import { Slider } from "@pureform/solid/slider";
import { Snackbar } from "@pureform/solid/snackbar";
import { SplitButton } from "@pureform/solid/split-button";
import { Splitter } from "@pureform/solid/splitter";
import { Stepper } from "@pureform/solid/stepper";
import { SupportingText } from "@pureform/solid/supporting-text";
import { Switch } from "@pureform/solid/switch";
import { Table } from "@pureform/solid/table";
import { Tabs } from "@pureform/solid/tabs";
import { FileUpload } from "@pureform/solid/file-upload";
import { TagsInput } from "@pureform/solid/tags-input";
import { NumberField } from "@pureform/solid/number-field";
import { CodeField } from "@pureform/solid/code-field";
import { Text } from "@pureform/solid/text";
import { TextArea } from "@pureform/solid/text-area";
import { TextField } from "@pureform/solid/text-field";
import { TimeInput } from "@pureform/solid/time-input";
import { TimePicker } from "@pureform/solid/time-picker";
import { createToaster, Toaster } from "@pureform/solid/toast";
import type { ToastData } from "@pureform/solid/toast";
import { Toolbar } from "@pureform/solid/toolbar";
import { Tooltip } from "@pureform/solid/tooltip";
import { TouchTarget } from "@pureform/solid/touch-target";
import { Tree } from "@pureform/solid/tree";
import { Dynamic } from "@solidjs/web";
import type { JSX, ValidComponent } from "@solidjs/web";
import { type Accessor, For, omit, untrack } from "solid-js";

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

/** A tile of the grid list scene: a picture, with a header and a footer when it has them. */
interface GridTile {
    readonly src: string;
    readonly header?: string;
    readonly footer?: string;
    readonly subhead?: string;
}

/** The grid list with the scene's `tiles` in it. */
function GridListScene(
    props: { readonly tiles?: readonly GridTile[] } & Record<string, unknown>,
): JSX.Element {
    return (
        <GridList {...(omit(props, "tiles") as object)}>
            <For each={props.tiles ?? []}>
                {(tile) => (
                    <GridList.Tile>
                        <GridList.Content>
                            <GridList.Media src={tile.src} alt="" />
                            {tile.header ? (
                                <GridList.Header>
                                    <GridList.Headline>
                                        {tile.header}
                                    </GridList.Headline>
                                </GridList.Header>
                            ) : null}
                            {tile.footer ? (
                                <GridList.Footer>
                                    <GridList.Headline>
                                        {tile.footer}
                                    </GridList.Headline>
                                    {tile.subhead ? (
                                        <GridList.Subhead>
                                            {tile.subhead}
                                        </GridList.Subhead>
                                    ) : null}
                                </GridList.Footer>
                            ) : null}
                        </GridList.Content>
                    </GridList.Tile>
                )}
            </For>
        </GridList>
    );
}

/** Every component the suites render, by name. */
export const components: Record<ComponentName, ValidComponent> = {
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
    ChipSet,
    SelectionList,
    CircularProgress,
    LoadingIndicator,
    Dialog,
    DragHandle,
    Splitter,
    Fab,
    FullscreenDialog,
    GridList: GridListScene,
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
    Popover,
    RichTooltip,
    Scrim,
    FadeThrough,
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
    NumberField,
    CodeField,
    FileUpload,
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
