import { ColorDisplay } from "./lib";

export function App() {
    return (
        <>
            <div class="dark">
                <ColorDisplay
                    bg="pf.primaryContainer"
                    color="pf.onPrimaryContainer"
                >
                    Primary
                </ColorDisplay>
                <ColorDisplay
                    bg="pf.neutralVariant"
                    color="pf.onNeutralVariant"
                >
                    Neutral Variant
                </ColorDisplay>
            </div>
            <div>
                <ColorDisplay
                    bg="pf.primaryContainer"
                    color="pf.onPrimaryContainer"
                >
                    Primary
                </ColorDisplay>
                <ColorDisplay
                    bg="pf.neutralVariant"
                    color="pf.onNeutralVariant"
                >
                    Neutral Variant
                </ColorDisplay>
            </div>
        </>
    );
}
