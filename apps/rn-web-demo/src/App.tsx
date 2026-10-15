// The demo page: the core set in light and dark, the base and teal themes, precomputed or
// runtime styles, and a brand color overriding the primary family per scheme, which
// recomputes the state layers mixed over it in either mode.

import type { Overrides } from "@pureform/rn-adapter";
import { PureformProvider, useTokens } from "@pureform/rn-adapter/react";
import { useState } from "react";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { brands, precomputed, runtime } from "virtual:pureform-rn";

import {
    Avatar,
    Button,
    Card,
    Checkbox,
    Chip,
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
});
