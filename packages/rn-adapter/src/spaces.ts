// `color-mix()` in the spaces CSS mixes in, without a color library, so the runtime can mix
// theme colors on the device. The formulas and matrices are CSS Color 4's: Lab and LCH are
// relative to D50, as CSS defines them, and results are clamped to sRGB.

import { mixSrgb } from "./rgba";
import type { Rgba } from "./rgba";

/** The spaces `mixIn` takes; HCT needs CAM16, which the runtime doesn't carry. */
export const MIX_SPACES = [
    "srgb",
    "hsl",
    "oklab",
    "oklch",
    "lab",
    "lch",
    "display-p3",
] as const;
export type MixSpace = (typeof MIX_SPACES)[number];

type Vec = [number, number, number];
type Matrix = [Vec, Vec, Vec];

const times = (m: Matrix, [x, y, z]: Vec): Vec =>
    m.map((row) => row[0] * x + row[1] * y + row[2] * z) as Vec;

const toLinear = (c: number) => {
    const abs = Math.abs(c);
    return abs <= 0.04045
        ? c / 12.92
        : Math.sign(c) * ((abs + 0.055) / 1.055) ** 2.4;
};
const toGamma = (c: number) => {
    const abs = Math.abs(c);
    return abs > 0.0031308
        ? Math.sign(c) * (1.055 * abs ** (1 / 2.4) - 0.055)
        : 12.92 * c;
};

const SRGB_TO_XYZ: Matrix = [
    [506752 / 1228815, 87881 / 245763, 12673 / 70218],
    [87098 / 409605, 175762 / 245763, 12673 / 175545],
    [7918 / 409605, 87881 / 737289, 1001167 / 1053270],
];
const XYZ_TO_SRGB: Matrix = [
    [12831 / 3959, -329 / 214, -1974 / 3959],
    [-851781 / 878810, 1648619 / 878810, 36519 / 878810],
    [705 / 12673, -2585 / 12673, 705 / 667],
];
const P3_TO_XYZ: Matrix = [
    [608311 / 1250200, 189793 / 714400, 198249 / 1000160],
    [35783 / 156275, 247089 / 357200, 198249 / 2500400],
    [0, 32229 / 714400, 5220557 / 5000800],
];
const XYZ_TO_P3: Matrix = [
    [446124 / 178915, -333277 / 357830, -72051 / 178915],
    [-14852 / 17905, 63121 / 35810, 423 / 17905],
    [11844 / 330415, -50337 / 660830, 316169 / 330415],
];
const D65_TO_D50: Matrix = [
    [1.0479297925449969, 0.022946870601609652, -0.05019226628920524],
    [0.02962780877005599, 0.9904344267538799, -0.017073799063418826],
    [-0.009243040646204504, 0.015055191490298152, 0.7518742814281371],
];
const D50_TO_D65: Matrix = [
    [0.955473421488075, -0.02309845494876471, 0.06325924320057072],
    [-0.0283697093338637, 1.0099953980813041, 0.021041441191917323],
    [0.012314014864481998, -0.020507649298898964, 1.330365926242124],
];
const XYZ_TO_LMS: Matrix = [
    [0.819022437996703, 0.3619062600528904, -0.1288737815209879],
    [0.0329836539323885, 0.9292868615863434, 0.0361446663506424],
    [0.0481771893596242, 0.2642395317527308, 0.6335478284694309],
];
const LMS_TO_XYZ: Matrix = [
    [1.2268798758459243, -0.5578149944602171, 0.2813910456659647],
    [-0.0405757452148008, 1.112286803280317, -0.0717110580655164],
    [-0.0763729366746601, -0.4214933324022432, 1.5869240198367816],
];
const LMS_TO_OKLAB: Matrix = [
    [0.210454268309314, 0.7936177747023054, -0.0040720430116193],
    [1.9779985324311684, -2.4285922420485799, 0.450593709617411],
    [0.0259040424655478, 0.7827717124575296, -0.8086757549230774],
];
const OKLAB_TO_LMS: Matrix = [
    [1, 0.3963377773761749, 0.2158037573099136],
    [1, -0.1055613458156586, -0.0638541728258133],
    [1, -0.0894841775298119, -1.2914855480194092],
];

const D50: Vec = [0.3457 / 0.3585, 1, (1 - 0.3457 - 0.3585) / 0.3585];
const EPSILON = 216 / 24389;
const KAPPA = 24389 / 27;

const xyzToLab = (xyz: Vec): Vec => {
    const [x, y, z] = xyz.map((v, i) => {
        const r = v / D50[i]!;
        return r > EPSILON ? Math.cbrt(r) : (KAPPA * r + 16) / 116;
    }) as Vec;
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};
const labToXyz = ([l, a, b]: Vec): Vec => {
    const y = (l + 16) / 116;
    const x = a / 500 + y;
    const z = y - b / 200;
    return [
        (x ** 3 > EPSILON ? x ** 3 : (116 * x - 16) / KAPPA) * D50[0],
        (l > KAPPA * EPSILON ? y ** 3 : l / KAPPA) * D50[1],
        (z ** 3 > EPSILON ? z ** 3 : (116 * z - 16) / KAPPA) * D50[2],
    ];
};

const toPolar = ([l, a, b]: Vec): Vec => {
    const hue = (Math.atan2(b, a) * 180) / Math.PI;
    return [l, Math.hypot(a, b), (hue + 360) % 360];
};
const fromPolar = ([l, c, h]: Vec): Vec => {
    const angle = (h * Math.PI) / 180;
    return [l, c * Math.cos(angle), c * Math.sin(angle)];
};

const rgbToHsl = ([r, g, b]: Vec): Vec => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    if (d === 0) return [Number.NaN, 0, l];
    const s = l === 0 || l === 1 ? 0 : (max - l) / Math.min(l, 1 - l);
    const h =
        max === r
            ? (g - b) / d + (g < b ? 6 : 0)
            : max === g
              ? (b - r) / d + 2
              : (r - g) / d + 4;
    return [h * 60, s, l];
};
const hslToRgb = ([h, s, l]: Vec): Vec => {
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        return (
            l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1))
        );
    };
    return [f(0), f(8), f(4)];
};

// Each space as coordinates from and to sRGB channels in 0..1, and which coordinate, if any,
// is a hue.
const SPACES: Record<
    MixSpace,
    { to: (rgb: Vec) => Vec; from: (c: Vec) => Vec; hue?: number }
> = {
    srgb: { to: (c) => c, from: (c) => c },
    hsl: { to: rgbToHsl, from: hslToRgb, hue: 0 },
    "display-p3": {
        to: (c) =>
            times(XYZ_TO_P3, times(SRGB_TO_XYZ, c.map(toLinear) as Vec)).map(
                toGamma,
            ) as Vec,
        from: (c) =>
            times(XYZ_TO_SRGB, times(P3_TO_XYZ, c.map(toLinear) as Vec)).map(
                toGamma,
            ) as Vec,
    },
    oklab: {
        to: (c) =>
            times(
                LMS_TO_OKLAB,
                times(
                    XYZ_TO_LMS,
                    times(SRGB_TO_XYZ, c.map(toLinear) as Vec),
                ).map(Math.cbrt) as Vec,
            ),
        from: (c) =>
            times(
                XYZ_TO_SRGB,
                times(
                    LMS_TO_XYZ,
                    times(OKLAB_TO_LMS, c).map((v) => v ** 3) as Vec,
                ),
            ).map(toGamma) as Vec,
    },
    oklch: {
        to: (c) => toPolar(SPACES.oklab.to(c)),
        from: (c) => SPACES.oklab.from(fromPolar(c)),
        hue: 2,
    },
    lab: {
        to: (c) =>
            xyzToLab(
                times(D65_TO_D50, times(SRGB_TO_XYZ, c.map(toLinear) as Vec)),
            ),
        from: (c) =>
            times(XYZ_TO_SRGB, times(D50_TO_D65, labToXyz(c))).map(
                toGamma,
            ) as Vec,
    },
    lch: {
        to: (c) => toPolar(SPACES.lab.to(c)),
        from: (c) => SPACES.lab.from(fromPolar(c)),
        hue: 2,
    },
};

// A polar color's hue is missing when it has no chroma (CSS's powerless hue).
const GRAY = 1e-4;
const withHue = (coords: Vec, hue: number | undefined): Vec => {
    if (hue === undefined) return coords;
    // Saturation in HSL and chroma in the LCH spaces both sit second.
    return coords[1] < GRAY
        ? (coords.map((v, i) => (i === hue ? Number.NaN : v)) as Vec)
        : coords;
};

/** `color-mix(in <space>, base, over amount)`, as CSS defines it: premultiplied, the shorter
 *  hue arc, and a missing hue taking the other color's. */
export const mixIn = (
    space: MixSpace,
    base: Rgba,
    over: Rgba,
    amount: number,
): Rgba => {
    if (space === "srgb") return mixSrgb(base, over, amount);
    const { to, from, hue } = SPACES[space];
    const read = (c: Rgba) =>
        withHue(to([c[0] / 255, c[1] / 255, c[2] / 255]), hue);
    const [a, b] = [read(base), read(over)];
    if (hue !== undefined) {
        const [ha, hb] = [a[hue]!, b[hue]!];
        a[hue] = Number.isNaN(ha) ? (Number.isNaN(hb) ? 0 : hb) : ha;
        b[hue] = Number.isNaN(hb) ? a[hue]! : hb;
        const delta = b[hue]! - a[hue]!;
        if (delta > 180) a[hue]! += 360;
        else if (delta < -180) b[hue]! += 360;
    }
    const alpha = base[3] * (1 - amount) + over[3] * amount;
    if (alpha === 0) return [0, 0, 0, 0];
    const mixed = a.map((v, i) =>
        i === hue
            ? v + (b[i]! - v) * amount
            : (v * base[3] * (1 - amount) + b[i]! * over[3] * amount) / alpha,
    ) as Vec;
    if (hue !== undefined) mixed[hue] = ((mixed[hue]! % 360) + 360) % 360;
    // Out of sRGB's gamut, channels clamp, as browsers paint them.
    const [r, g, b2] = from(mixed).map(
        (c) => Math.min(Math.max(c, 0), 1) * 255,
    ) as Vec;
    return [r, g, b2, alpha];
};
