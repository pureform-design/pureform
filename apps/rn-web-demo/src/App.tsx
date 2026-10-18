// The demo page: @pureform/react-native's components in light and dark, the base and teal themes,
// the generated registry's precomputed styles or styles resolved at runtime, each motion engine,
// a brand color overriding the primary family per scheme, which recomputes the state layers
// mixed over it in either mode, the provider's indication, and components sharing one source.

import {
    Glyph,
    PureformContainer,
    PureformProvider,
    animated,
    materialIndication,
    noIndication,
    useInteractionSource,
    useInteractionState,
    useTokens,
} from "@pureform/react-native";
import type { Indication, MotionEngine } from "@pureform/react-native";
import { Avatar } from "@pureform/react-native/avatar";
import { Button } from "@pureform/react-native/button";
import { Card } from "@pureform/react-native/card";
import { Checkbox } from "@pureform/react-native/checkbox";
import { Chip } from "@pureform/react-native/chip";
import { CircularProgress } from "@pureform/react-native/circular-progress";
import { Dialog } from "@pureform/react-native/dialog";
import { Fab } from "@pureform/react-native/fab";
import { Icon } from "@pureform/react-native/icon";
import { IconButton } from "@pureform/react-native/icon-button";
import { LinearProgress } from "@pureform/react-native/linear-progress";
import { ListItem } from "@pureform/react-native/list-item";
import { Media } from "@pureform/react-native/media";
import { Menu } from "@pureform/react-native/menu";
import { NavigationBar } from "@pureform/react-native/navigation-bar";
import { NavigationRail } from "@pureform/react-native/navigation-rail";
import { Radio } from "@pureform/react-native/radio-group";
import { reanimated } from "@pureform/react-native/reanimated";
import { reanimatedSvg } from "@pureform/react-native/reanimated-svg";
import { Scrim } from "@pureform/react-native/scrim";
import { SearchBar } from "@pureform/react-native/search-bar";
import { Select } from "@pureform/react-native/select";
import { Separator } from "@pureform/react-native/separator";
import { Slider } from "@pureform/react-native/slider";
import { Snackbar, useSnackbar } from "@pureform/react-native/snackbar";
import { SupportingText } from "@pureform/react-native/supporting-text";
import { animatedSvg } from "@pureform/react-native/svg";
import { Switch } from "@pureform/react-native/switch";
import { Tabs } from "@pureform/react-native/tabs";
import { Text } from "@pureform/react-native/text";
import { TextArea } from "@pureform/react-native/text-area";
import { TextField } from "@pureform/react-native/text-field";
import { Tooltip } from "@pureform/react-native/tooltip";
import type { Overrides } from "@pureform/rn-adapter/factory";
import { nativeFactory } from "@pureform/rn-adapter/factory";
import { createRegistry } from "@pureform/styling";
import { Fragment, useState } from "react";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { brands, runtime, runtimeTokens } from "virtual:pureform-rn";

import { registry } from "../.pureform";
import { PICTURE, Panel, SHAPES, Swatch, Tweens } from "./custom";

// The same components over styles resolved at runtime, each a factory as the generated
// registry's are.
const runtimeRegistry = createRegistry(
    Object.fromEntries(
        Object.entries(runtimeTokens).map(([name, tokens]) => [
            name,
            nativeFactory(name, runtime, tokens),
        ]),
    ),
);

/** The engines, by whether they draw with SVG and what runs their motion. */
const ENGINES: Record<string, Record<string, MotionEngine>> = {
    Animated: { "no svg": animated, svg: animatedSvg },
    Reanimated: { "no svg": reanimated, svg: reanimatedSvg },
};

const DESTINATIONS = [
    { value: "mail", label: "Mail", icon: <Glyph glyph="✉" /> },
    { value: "chat", label: "Chat", icon: <Glyph glyph="☏" /> },
    { value: "rooms", label: "Rooms", icon: <Glyph glyph="⌂" /> },
];

const MENU = [
    {
        value: "cut",
        label: "Cut",
        leadingIcon: <Glyph glyph="✂" />,
        trailingText: "⌘X",
    },
    {
        value: "copy",
        label: "Copy",
        leadingIcon: <Glyph glyph="⧉" />,
        trailingText: "⌘C",
    },
    {
        value: "paste",
        label: "Paste",
        leadingIcon: <Glyph glyph="⎘" />,
        trailingText: "⌘V",
        disabled: true,
    },
];

const SIZES = ["Small", "Medium", "Large"].map((size) => ({
    value: size,
    label: size,
}));

// The indications the page can switch to: Material's, Material's without the ripple, and none
// (no state layer or ripple; the focus indicator stays).
const INDICATIONS: Record<string, Indication> = {
    "material indication": materialIndication(),
    "no ripple": materialIndication({ ripple: false }),
    "no indication": noIndication,
};

/** The overlays, opened over the page: a menu from an icon button, a tooltip on another, a
 *  snackbar from the queue, and a modal dialog. */
function Overlays(props: {
    readonly choice: string;
    readonly onChoice: (value: string) => void;
}) {
    const snackbars = useSnackbar();
    return (
        <View style={styles.row}>
            <Menu
                items={MENU}
                value={props.choice}
                onSelect={(details) => props.onChoice(details.value)}
                trigger={(trigger) => (
                    <IconButton
                        {...trigger}
                        aria-label="Edit"
                        icon={<Glyph glyph="⋮" />}
                    />
                )}
            />
            <Tooltip
                supportingText="Save to drafts"
                trigger={(trigger) => (
                    <IconButton
                        {...trigger}
                        aria-label="Save"
                        icon={<Glyph glyph="⎙" />}
                    />
                )}
            />
            <Button
                variant="tonal"
                label="Archive"
                onPress={() =>
                    snackbars.show({
                        supportingText: `Archived (${props.choice})`,
                        action: "Undo",
                    })
                }
            />
            <Dialog
                trigger="Discard"
                icon={<Glyph glyph="⚠" />}
                headline="Discard draft?"
                actions={({ close }) => (
                    <>
                        <Button variant="text" label="Cancel" onPress={close} />
                        <Button
                            variant="text"
                            label="Discard"
                            onPress={close}
                        />
                    </>
                )}
            >
                Your changes won't be saved.
            </Dialog>
        </View>
    );
}

/** Three components on one interaction source: pressing or hovering any shows on all three, and
 *  `useInteractionState` reports it. Focus stays with the one that has it. */
function SharedSource() {
    const source = useInteractionSource();
    const state = useInteractionState(source);
    const said = state.pressed
        ? "Pressed"
        : state.hovered
          ? "Hovered"
          : state.focusVisible
            ? "Focused"
            : "At rest";
    return (
        <View style={styles.row}>
            <Button label="Press me" interactionSource={source} />
            <Chip label="Or me" interactionSource={source} />
            <IconButton
                aria-label="Or me too"
                icon={<Glyph glyph="★" />}
                variant="tonal"
                interactionSource={source}
            />
            <Text textStyle="bodyLarge">{said}</Text>
        </View>
    );
}

// No override, or a brand's whole primary family for each scheme.
const OVERRIDES: Record<string, Overrides> = { none: {}, ...brands };

type Choice<T extends string> = {
    value: T;
    options: readonly T[];
    onChange: (value: T) => void;
};

function Choices<T extends string>({ value, options, onChange }: Choice<T>) {
    return (
        <View style={styles.row}>
            {options.map((option) => (
                <Chip
                    key={option}
                    label={option}
                    selected={option === value}
                    onPress={() => onChange(option)}
                />
            ))}
        </View>
    );
}

function Section(props: { title: string; children: ReactNode }) {
    return (
        <View style={styles.section}>
            <Text textStyle="titleLarge">{props.title}</Text>
            {props.children}
        </View>
    );
}

function Page(props: { controls: ReactNode }) {
    const tokens = useTokens();
    const [checked, setChecked] = useState(true);
    const [on, setOn] = useState(true);
    const [moved, setMoved] = useState(false);
    const [size, setSize] = useState("medium");
    const [fit, setFit] = useState("Medium");
    const [shape, setShape] = useState<(typeof SHAPES)[number]>("cookie4Sided");
    const [item, setItem] = useState(0);
    const [progress, setProgress] = useState<number | undefined>(40);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("ada@");
    const [bio, setBio] = useState("");
    const [query, setQuery] = useState("");
    const [volume, setVolume] = useState(30);
    const [tab, setTab] = useState("mail");
    const [destination, setDestination] = useState("mail");
    const [choice, setChoice] = useState("copy");
    return (
        <ScrollView
            style={{
                flex: 1,
                backgroundColor: String(tokens["colors.surface"]),
            }}
            contentContainerStyle={styles.page}
        >
            <Text textStyle="headlineMedium">pureform, React Native Web</Text>
            {props.controls}
            <Section title="Shared interaction source">
                <SharedSource />
            </Section>
            <Section title="Buttons">
                <View style={styles.row}>
                    {(
                        [
                            "filled",
                            "tonal",
                            "outlined",
                            "text",
                            "elevated",
                        ] as const
                    ).map((variant) => (
                        <Button
                            key={variant}
                            variant={variant}
                            label={variant}
                        />
                    ))}
                    <Button label="disabled" disabled />
                </View>
            </Section>
            <Section title="Chips">
                <View style={styles.row}>
                    <Chip label="outlined" />
                    <Chip label="elevated" variant="elevated" />
                    <Chip label="selected" selected />
                </View>
            </Section>
            <Section title="Controls">
                <View style={styles.row}>
                    <Checkbox
                        aria-label="checkbox"
                        checked={checked}
                        onCheckedChange={(details) =>
                            setChecked(details.checked === true)
                        }
                    />
                    <Switch
                        aria-label="switch"
                        checked={on}
                        onCheckedChange={(details) => setOn(details.checked)}
                    />
                    {["small", "medium", "large"].map((option) => (
                        <Radio
                            key={option}
                            aria-label={option}
                            checked={size === option}
                            onPress={() => setSize(option)}
                        />
                    ))}
                </View>
                <SupportingText>Pick a size.</SupportingText>
                <SupportingText tone="error">
                    Something went wrong.
                </SupportingText>
            </Section>
            <Section title="Icons and icon buttons">
                <View style={styles.row}>
                    {(["small", "medium", "large"] as const).map((size) => (
                        <Icon key={size} size={size}>
                            <Glyph glyph="★" />
                        </Icon>
                    ))}
                    <Icon color="error">
                        <Glyph glyph="♥" />
                    </Icon>
                    {(
                        [
                            "standard",
                            "filled",
                            "tonal",
                            "outlined",
                            "elevated",
                        ] as const
                    ).map((variant) => (
                        <IconButton
                            key={variant}
                            variant={variant}
                            aria-label={variant}
                            icon={<Glyph glyph="✎" />}
                        />
                    ))}
                    <IconButton
                        aria-label="disabled"
                        icon={<Glyph glyph="✎" />}
                        variant="filled"
                        disabled
                    />
                </View>
            </Section>
            <Section title="Shapes">
                <Choices value={shape} options={SHAPES} onChange={setShape} />
                <View style={styles.row}>
                    {(["filled", "tonal", "outlined"] as const).map(
                        (variant) => (
                            <IconButton
                                key={variant}
                                variant={variant}
                                shape={shape}
                                size="large"
                                aria-label={`${variant} ${shape}`}
                                icon={<Glyph glyph="✎" />}
                            />
                        ),
                    )}
                    <Fab
                        icon={<Glyph glyph="+" />}
                        aria-label="+"
                        size="large"
                        shape={shape}
                    />
                    <Avatar label="AL" size="large" shape={shape}>
                        AL
                    </Avatar>
                    <View style={styles.picture}>
                        <Media source={PICTURE} aspect="square" shape={shape} />
                    </View>
                </View>
            </Section>
            <Section title="Gradients">
                <View style={styles.row}>
                    {(["linear", "radial", "conic"] as const).map((kind) => (
                        <Swatch key={kind} kind={kind} />
                    ))}
                </View>
            </Section>
            <Section title="Token tweens">
                <View style={styles.row}>
                    <Chip
                        label={moved ? "move back" : "move"}
                        selected={moved}
                        onPress={() => setMoved((m) => !m)}
                    />
                    <View style={styles.tweens}>
                        <Tweens moved={moved} />
                    </View>
                </View>
            </Section>
            <Section title="Containers">
                <View style={[styles.row, styles.top]}>
                    {[240, 480].map((width) => (
                        <PureformContainer key={width} style={{ width }}>
                            <Panel>In a {width}px container</Panel>
                        </PureformContainer>
                    ))}
                </View>
            </Section>
            <Section title="Floating action buttons">
                <View style={styles.row}>
                    {(["small", "medium", "large"] as const).map((size) => (
                        <Fab
                            key={size}
                            size={size}
                            icon={<Glyph glyph="+" />}
                            aria-label="+"
                        />
                    ))}
                    <Fab
                        icon={<Glyph glyph="+" />}
                        aria-label="+"
                        variant="filled"
                    />
                    <Fab
                        icon={<Glyph glyph="+" />}
                        aria-label="+"
                        variant="surface"
                    />
                    <Fab icon={<Glyph glyph="✎" />} label="Compose" />
                </View>
            </Section>
            <Section title="Lists">
                <View style={styles.list}>
                    {[
                        {
                            headline: "One line",
                            leading: <Glyph glyph="★" />,
                            trailingText: "100+",
                        },
                        {
                            headline: "Two lines",
                            supportingText: "Supporting text",
                            leading: <Glyph glyph="♥" />,
                        },
                        {
                            headline: "Three lines",
                            overline: "Overline",
                            supportingText: "Supporting text that runs on",
                            leading: <Glyph glyph="✉" />,
                        },
                    ].map((props, index) => (
                        <Fragment key={props.headline}>
                            {index > 0 && <Separator inset="start" />}
                            <ListItem
                                {...props}
                                selected={item === index}
                                onPress={() => setItem(index)}
                            />
                        </Fragment>
                    ))}
                </View>
            </Section>
            <Section title="Progress">
                <View style={styles.row}>
                    <View style={styles.bar}>
                        <LinearProgress value={progress} />
                    </View>
                    <CircularProgress value={progress} />
                    <CircularProgress value={progress} color="tertiary" />
                    {[10, 40, 75, 100].map((value) => (
                        <Chip
                            key={value}
                            label={`${value}%`}
                            selected={progress === value}
                            onPress={() => setProgress(value)}
                        />
                    ))}
                    <Chip
                        label="indeterminate"
                        selected={progress === undefined}
                        onPress={() => setProgress(undefined)}
                    />
                </View>
            </Section>
            <Section title="Media and scrim">
                <View style={styles.row}>
                    {(["landscape", "square", "portrait"] as const).map(
                        (aspect) => (
                            <View key={aspect} style={styles.media}>
                                <Media source={PICTURE} aspect={aspect} />
                            </View>
                        ),
                    )}
                    <View style={[styles.media, styles.clip]}>
                        <Media source={PICTURE} aspect="landscape" />
                        <Scrim />
                    </View>
                </View>
            </Section>
            <Section title="Fields">
                <View style={styles.row}>
                    <View style={styles.field}>
                        <TextField
                            label="Name"
                            value={name}
                            onValueChange={(details) => setName(details.value)}
                        />
                    </View>
                    <View style={styles.field}>
                        <TextField
                            label="Email"
                            variant="outlined"
                            value={email}
                            onValueChange={(details) => setEmail(details.value)}
                            invalid={!email.includes(".")}
                            supportingText={
                                email.includes(".")
                                    ? "Looks right"
                                    : "Add a domain"
                            }
                            leadingIcon={<Glyph glyph="✉" />}
                        />
                    </View>
                    <View style={styles.field}>
                        <Select
                            label="Size"
                            value={fit}
                            items={SIZES}
                            onValueChange={(details) =>
                                setFit(details.value ?? "")
                            }
                            supportingText="Pick a size"
                        />
                    </View>
                    <View style={styles.field}>
                        <TextArea
                            label="Bio"
                            variant="outlined"
                            value={bio}
                            onValueChange={(details) => setBio(details.value)}
                        />
                    </View>
                </View>
                <View style={styles.field}>
                    <SearchBar
                        value={query}
                        onValueChange={(details) => setQuery(details.value)}
                        leading={<Glyph glyph="⌕" />}
                        trailing={<Glyph glyph="🎤" />}
                    />
                </View>
                <View style={styles.bar}>
                    <Slider
                        aria-label="Volume"
                        value={volume}
                        onValueChange={(details) => setVolume(details.value)}
                    />
                </View>
            </Section>
            <Section title="Tabs and navigation">
                <View style={styles.list}>
                    <Tabs
                        items={DESTINATIONS}
                        value={tab}
                        onValueChange={(details) => setTab(details.value)}
                    />
                    <Tabs
                        items={DESTINATIONS}
                        variant="secondary"
                        value={tab}
                        onValueChange={(details) => setTab(details.value)}
                    />
                </View>
                <View style={styles.row}>
                    <View style={styles.list}>
                        <NavigationBar
                            items={DESTINATIONS}
                            value={destination}
                            onValueChange={(details) =>
                                setDestination(details.value)
                            }
                        />
                    </View>
                    <NavigationRail
                        items={DESTINATIONS}
                        value={destination}
                        onValueChange={(details) =>
                            setDestination(details.value)
                        }
                    />
                </View>
            </Section>
            <Section title="Menus, dialogs, and messages">
                <Overlays choice={choice} onChoice={setChoice} />
                <View style={[styles.row, styles.top]}>
                    <Menu
                        items={MENU}
                        value={choice}
                        onSelect={(details) => setChoice(details.value)}
                    />
                    <Dialog
                        icon={<Glyph glyph="⚠" />}
                        headline="Discard draft?"
                        actions={
                            <>
                                <Button variant="text" label="Cancel" />
                                <Button variant="text" label="Discard" />
                            </>
                        }
                    >
                        Your changes won't be saved.
                    </Dialog>
                    <View style={[styles.section, styles.start]}>
                        <Snackbar
                            supportingText="Message archived"
                            action="Undo"
                        />
                        <Tooltip supportingText="Save to drafts" />
                        <Tooltip
                            variant="rich"
                            subhead="Drafts"
                            supportingText="Drafts stay on this device."
                        />
                    </View>
                </View>
            </Section>
            <Section title="Cards and avatars">
                <View style={styles.row}>
                    {(["elevated", "filled", "outlined"] as const).map(
                        (variant) => (
                            <Card key={variant} variant={variant}>
                                <View style={styles.card}>
                                    <Text textStyle="titleMedium">
                                        {variant} card
                                    </Text>
                                    <Text textStyle="bodyMedium">
                                        Styled by @pureform/react-native.
                                    </Text>
                                </View>
                            </Card>
                        ),
                    )}
                    {(["small", "medium", "large"] as const).map((size) => (
                        <Avatar key={size} size={size} label="AL">
                            AL
                        </Avatar>
                    ))}
                </View>
            </Section>
        </ScrollView>
    );
}

export function App() {
    const [scheme, setScheme] = useState<"light" | "dark">("light");
    const [theme, setTheme] = useState<"base" | "teal">("base");
    const [mode, setMode] = useState<"precomputed" | "runtime">("precomputed");
    const [override, setOverride] = useState<keyof typeof OVERRIDES>("none");
    const [motion, setMotion] = useState<"motion" | "reduced motion">("motion");
    const [drawing, setDrawing] = useState<"svg" | "no svg">("svg");
    const [engine, setEngine] = useState<"Animated" | "Reanimated">("Animated");
    const [speed, setSpeed] = useState<"normal speed" | "slow motion">(
        "normal speed",
    );
    const [indication, setIndication] = useState("material indication");
    const controls = (
        <View style={styles.section}>
            <Choices
                value={scheme}
                options={["light", "dark"] as const}
                onChange={setScheme}
            />
            <Choices
                value={theme}
                options={["base", "teal"] as const}
                onChange={setTheme}
            />
            <Choices
                value={mode}
                options={["precomputed", "runtime"] as const}
                onChange={setMode}
            />
            <Choices
                value={motion}
                options={["motion", "reduced motion"] as const}
                onChange={setMotion}
            />
            <Choices
                value={speed}
                options={["normal speed", "slow motion"] as const}
                onChange={setSpeed}
            />
            <Choices
                value={engine}
                options={["Animated", "Reanimated"] as const}
                onChange={setEngine}
            />
            <Choices
                value={drawing}
                options={["svg", "no svg"] as const}
                onChange={setDrawing}
            />
            <Choices
                value={override}
                options={Object.keys(OVERRIDES)}
                onChange={setOverride}
            />
            <Choices
                value={indication}
                options={Object.keys(INDICATIONS)}
                onChange={setIndication}
            />
        </View>
    );
    return (
        <PureformProvider
            registry={mode === "precomputed" ? registry : runtimeRegistry}
            scheme={scheme}
            {...(theme === "teal" ? { theme } : {})}
            overrides={OVERRIDES[override]!}
            motion={motion === "reduced motion" ? "reduce" : "full"}
            engine={ENGINES[engine]![drawing]!}
            timeScale={speed === "slow motion" ? 10 : 1}
            indication={INDICATIONS[indication]!}
        >
            <Page controls={controls} />
        </PureformProvider>
    );
}

const styles = StyleSheet.create({
    page: { padding: 32, gap: 32, minHeight: "100%" },
    section: { gap: 12 },
    // Room for the square at its largest and turned, its diagonal, so the page doesn't move as
    // it grows.
    tweens: {
        width: 160,
        height: 160,
        alignItems: "center",
        justifyContent: "center",
    },
    row: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "center",
    },
    card: { padding: 16, gap: 8, width: 220 },
    list: { width: 360, gap: 12 },
    field: { width: 260 },
    top: { alignItems: "flex-start" },
    // Tooltips fit their text, as inline elements do on the web.
    start: { alignItems: "flex-start" },
    bar: { width: 240 },
    picture: { width: 96 },
    media: { width: 160, position: "relative" },
    // The scrim dims the picture, so it takes the picture's corners.
    clip: { overflow: "hidden", borderRadius: 12 },
});
