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
import { ChipSet } from "@pureform/react/chip-set";
import { CircularProgress } from "@pureform/react/circular-progress";
import { ColorPicker } from "@pureform/react/color-picker";
import { CopyButton } from "@pureform/react/copy-button";
import { DateInput } from "@pureform/react/date-input";
import { DatePicker } from "@pureform/react/date-picker";
import { Dialog } from "@pureform/react/dialog";
import { DockedDatePicker } from "@pureform/react/docked-date-picker";
import { DragHandle } from "@pureform/react/drag-handle";
import { Fab } from "@pureform/react/fab";
import { FabMenu } from "@pureform/react/fab-menu";
import { FadeThrough } from "@pureform/react/fade-through";
import { FullscreenDialog } from "@pureform/react/fullscreen-dialog";
import { GridList } from "@pureform/react/grid-list";
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
import { Popover } from "@pureform/react/popover";
import { RadioGroup } from "@pureform/react/radio-group";
import { Rating } from "@pureform/react/rating";
import { RichTooltip } from "@pureform/react/rich-tooltip";
import { Ripple } from "@pureform/react/ripple";
import { Scrim } from "@pureform/react/scrim";
import { SearchBar } from "@pureform/react/search-bar";
import { SearchView } from "@pureform/react/search-view";
import { Select } from "@pureform/react/select";
import { SelectionList } from "@pureform/react/selection-list";
import { Separator } from "@pureform/react/separator";
import { SideSheet } from "@pureform/react/side-sheet";
import { Slider } from "@pureform/react/slider";
import { Snackbar } from "@pureform/react/snackbar";
import { SplitButton } from "@pureform/react/split-button";
import { Splitter } from "@pureform/react/splitter";
import { Stepper } from "@pureform/react/stepper";
import { SupportingText } from "@pureform/react/supporting-text";
import { Switch } from "@pureform/react/switch";
import { Table } from "@pureform/react/table";
import { Tabs } from "@pureform/react/tabs";
import { FileUpload } from "@pureform/react/file-upload";
import { TagsInput } from "@pureform/react/tags-input";
import { NumberField } from "@pureform/react/number-field";
import { CodeField } from "@pureform/react/code-field";
import { Text } from "@pureform/react/text";
import { TextArea } from "@pureform/react/text-area";
import { TextField } from "@pureform/react/text-field";
import { TimeInput } from "@pureform/react/time-input";
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

/** A tile of the grid list scene: a picture, with a header and a footer when it has them. */
interface GridTile {
    readonly src: string;
    readonly header?: string;
    readonly footer?: string;
    readonly subhead?: string;
}

/** The grid list with the scene's `tiles` in it. */
function GridListScene({
    tiles,
    ...props
}: { readonly tiles?: readonly GridTile[] } & Record<
    string,
    unknown
>): ReactNode {
    return (
        <GridList {...props}>
            {(tiles ?? []).map((tile, index) => (
                <GridList.Tile key={index}>
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
            ))}
        </GridList>
    );
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
    ChipSet,
    SelectionList,
    CircularProgress,
    LoadingIndicator,
    Dialog,
    DragHandle,
    Splitter,
    ColorPicker,
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
    CopyButton,
    Rating,
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
