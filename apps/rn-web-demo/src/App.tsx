// The demo page: the components the adapter covers in light and dark, the base and teal themes, precomputed or
// runtime styles, and a brand color overriding the primary family per scheme, which
// recomputes the state layers mixed over it in either mode.

import type { Overrides } from "@pureform/rn-adapter";
import { PureformProvider, useTokens } from "@pureform/rn-adapter/react";
import { Fragment, useState } from "react";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { brands, precomputed, runtime } from "virtual:pureform-rn";

import {
    Avatar,
    Button,
    Card,
    Checkbox,
    Chip,
    CircularProgress,
    Fab,
    Icon,
    IconButton,
    LinearProgress,
    ListItem,
    Media,
    Radio,
    Scrim,
    Separator,
    SupportingText,
    Switch,
    Type,
} from "./components";

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
            <Type style="titleLarge">{props.title}</Type>
            {props.children}
        </View>
    );
}

function Page(props: { controls: ReactNode }) {
    const tokens = useTokens();
    const [checked, setChecked] = useState(true);
    const [on, setOn] = useState(true);
    const [size, setSize] = useState("medium");
    const [item, setItem] = useState(0);
    const [progress, setProgress] = useState<number | undefined>(40);
    return (
        <ScrollView
            style={{
                flex: 1,
                backgroundColor: String(tokens["colors.surface"]),
            }}
            contentContainerStyle={styles.page}
        >
            <Type style="headlineMedium">pureform, React Native Web</Type>
            {props.controls}
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
                        label="checkbox"
                        checked={checked}
                        onChange={setChecked}
                    />
                    <Switch label="switch" checked={on} onChange={setOn} />
                    {["small", "medium", "large"].map((option) => (
                        <Radio
                            key={option}
                            label={option}
                            checked={size === option}
                            onChange={() => setSize(option)}
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
                        <Icon key={size} size={size} glyph="★" />
                    ))}
                    <Icon glyph="♥" color="error" />
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
                            label={variant}
                            glyph="✎"
                        />
                    ))}
                    <IconButton
                        label="disabled"
                        glyph="✎"
                        variant="filled"
                        disabled
                    />
                </View>
            </Section>
            <Section title="Floating action buttons">
                <View style={styles.row}>
                    {(["small", "medium", "large"] as const).map((size) => (
                        <Fab key={size} size={size} glyph="+" />
                    ))}
                    <Fab glyph="+" variant="filled" />
                    <Fab glyph="+" variant="surface" />
                    <Fab glyph="✎" label="Compose" />
                </View>
            </Section>
            <Section title="Lists">
                <View style={styles.list}>
                    {[
                        {
                            headline: "One line",
                            leading: "★",
                            trailingText: "100+",
                        },
                        {
                            headline: "Two lines",
                            supportingText: "Supporting text",
                            leading: "♥",
                        },
                        {
                            headline: "Three lines",
                            overline: "Overline",
                            supportingText: "Supporting text that runs on",
                            leading: "✉",
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
                                <Media aspect={aspect} />
                            </View>
                        ),
                    )}
                    <View style={[styles.media, styles.clip]}>
                        <Media aspect="landscape" />
                        <Scrim />
                    </View>
                </View>
            </Section>
            <Section title="Cards and avatars">
                <View style={styles.row}>
                    {(["elevated", "filled", "outlined"] as const).map(
                        (variant) => (
                            <Card key={variant} variant={variant}>
                                <View style={styles.card}>
                                    <Type style="titleMedium">
                                        {variant} card
                                    </Type>
                                    <Type style="bodyMedium">
                                        Styled by the React Native adapter.
                                    </Type>
                                </View>
                            </Card>
                        ),
                    )}
                    {(["small", "medium", "large"] as const).map((size) => (
                        <Avatar key={size} size={size} initials="AL" />
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
                value={override}
                options={Object.keys(OVERRIDES)}
                onChange={setOverride}
            />
        </View>
    );
    return (
        <PureformProvider
            styles={mode === "precomputed" ? precomputed : runtime}
            scheme={scheme}
            {...(theme === "teal" ? { theme } : {})}
            overrides={OVERRIDES[override]!}
            reducedMotion={motion === "reduced motion"}
        >
            <Page controls={controls} />
        </PureformProvider>
    );
}

const styles = StyleSheet.create({
    page: { padding: 32, gap: 32, minHeight: "100%" },
    section: { gap: 12 },
    row: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "center",
    },
    card: { padding: 16, gap: 8, width: 220 },
    list: { width: 360 },
    bar: { width: 240 },
    media: { width: 160, position: "relative" },
    // The scrim dims the picture, so it takes the picture's corners.
    clip: { overflow: "hidden", borderRadius: 12 },
});
