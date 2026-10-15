// Material's expressive shapes, ported from Compose's MaterialShapes onto the core shape
// builder. Each is a polygon with rounded corners, normalized to the unit square. Compose also
// smooths some corners; these draw every rounding as a circular arc, which is close.

import {
    circle as circleContour,
    defineShape,
    normalize,
    rectangle,
    regularPolygon,
    rotateContour,
    roundedPolygon,
    scaleContour,
    star,
} from "@pureform/core/ast";
import type { ShapeGeometry, UnitContour, Vec } from "@pureform/core/ast";

/** A vertex and its rounding, as Compose writes them. */
type Point = readonly [x: number, y: number, rounding?: number | undefined];

const CENTER: Vec = [0.5, 0.5];

const toDegrees = (radians: number) => (radians * 180) / Math.PI;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

// Repeat the points around the center `reps` times; mirroring reflects every other copy, so
// the points draw half of each section.
const repeat = (points: Point[], reps: number, mirroring: boolean): Point[] => {
    const polar = points.map(([x, y]) => ({
        angle: toDegrees(Math.atan2(y - CENTER[1], x - CENTER[0])),
        distance: Math.hypot(x - CENTER[0], y - CENTER[1]),
    }));
    const at = (
        degrees: number,
        distance: number,
        rounding?: number,
    ): Point => {
        const a = toRadians(degrees);
        return [
            Math.cos(a) * distance + CENTER[0],
            Math.sin(a) * distance + CENTER[1],
            rounding,
        ];
    };
    if (!mirroring) {
        return Array.from({ length: points.length * reps }, (_, i) => {
            const { angle, distance } = polar[i % points.length]!;
            const turn = Math.floor(i / points.length) * (360 / reps);
            return at(angle + turn, distance, points[i % points.length]![2]);
        });
    }
    const sections = reps * 2;
    const section = 360 / sections;
    const last = points.length - 1;
    const result: Point[] = [];
    for (let it = 0; it < sections; it++) {
        for (let index = 0; index <= last; index++) {
            const i = it % 2 === 0 ? index : last - index;
            if (i > 0 || it % 2 === 0) {
                const angle =
                    section * it +
                    (it % 2 === 0
                        ? polar[i]!.angle
                        : section - polar[i]!.angle + 2 * polar[0]!.angle);
                result.push(at(angle, polar[i]!.distance, points[i]![2]));
            }
        }
    }
    return result;
};

const custom = (
    points: Point[],
    reps: number,
    mirroring = false,
): UnitContour =>
    roundedPolygon(
        repeat(points, reps, mirroring).map(([x, y, rounding]) => ({
            at: [x, y],
            rounding,
        })),
    );

const shape = (contour: UnitContour): ShapeGeometry =>
    defineShape(normalize([contour]));

/** Material's expressive shapes, by name. Each stretches with its box, as in Compose. */
export const MATERIAL_SHAPES = {
    circle: shape(circleContour(10)),
    square: shape(rectangle(1, 1, 0.3)),
    slanted: shape(
        custom(
            [
                [0.926, 0.97, 0.189],
                [-0.021, 0.967, 0.187],
            ],
            2,
        ),
    ),
    arch: shape(rotateContour(regularPolygon(4, [1, 1, 0.2, 0.2]), -135)),
    fan: shape(
        custom(
            [
                [1.004, 1, 0.148],
                [0, 1, 0.151],
                [0, -0.003, 0.148],
                [0.978, 0.02, 0.803],
            ],
            1,
        ),
    ),
    arrow: shape(
        custom(
            [
                [0.5, 0.892, 0.313],
                [-0.216, 1.05, 0.207],
                [0.499, -0.16, 0.215],
                [1.225, 1.06, 0.211],
            ],
            1,
        ),
    ),
    semiCircle: shape(rectangle(1.6, 1, [0.2, 0.2, 1, 1])),
    oval: shape(rotateContour(scaleContour(circleContour(), 1, 0.64), -45)),
    pill: shape(
        custom(
            [
                [0.961, 0.039, 0.426],
                [1.001, 0.428],
                [1, 0.609, 1],
            ],
            2,
            true,
        ),
    ),
    triangle: shape(rotateContour(regularPolygon(3, 0.2), -90)),
    diamond: shape(
        custom(
            [
                [0.5, 1.096, 0.151],
                [0.04, 0.5, 0.159],
            ],
            2,
        ),
    ),
    clamShell: shape(
        custom(
            [
                [0.171, 0.841, 0.159],
                [-0.02, 0.5, 0.14],
                [0.17, 0.159, 0.159],
            ],
            2,
        ),
    ),
    pentagon: shape(
        custom(
            [
                [0.5, -0.009, 0.172],
                [1.03, 0.365, 0.164],
                [0.828, 0.97, 0.169],
            ],
            1,
            true,
        ),
    ),
    gem: shape(
        custom(
            [
                [0.499, 1.023, 0.241],
                [-0.005, 0.792, 0.208],
                [0.073, 0.258, 0.228],
                [0.433, 0, 0.491],
            ],
            1,
            true,
        ),
    ),
    sunny: shape(star(8, 0.8, 0.15)),
    verySunny: shape(
        custom(
            [
                [0.5, 1.08, 0.085],
                [0.358, 0.843, 0.085],
            ],
            8,
        ),
    ),
    cookie4Sided: shape(
        custom(
            [
                [1.237, 1.236, 0.258],
                [0.5, 0.918, 0.233],
            ],
            4,
        ),
    ),
    cookie6Sided: shape(
        custom(
            [
                [0.723, 0.884, 0.394],
                [0.5, 1.099, 0.398],
            ],
            6,
        ),
    ),
    cookie7Sided: shape(rotateContour(star(7, 0.75, 0.5), -90)),
    cookie9Sided: shape(rotateContour(star(9, 0.8, 0.5), -90)),
    cookie12Sided: shape(rotateContour(star(12, 0.8, 0.5), -90)),
    ghostish: shape(
        custom(
            [
                [0.5, 0, 1],
                [1, 0, 1],
                [1, 1.14, 0.254],
                [0.575, 0.906, 0.253],
            ],
            1,
            true,
        ),
    ),
    clover4Leaf: shape(
        custom(
            [
                [0.5, 0.074],
                [0.725, -0.099, 0.476],
            ],
            4,
            true,
        ),
    ),
    clover8Leaf: shape(
        custom(
            [
                [0.5, 0.036],
                [0.758, -0.101, 0.209],
            ],
            8,
        ),
    ),
    burst: shape(
        custom(
            [
                [0.5, -0.006, 0.006],
                [0.592, 0.158, 0.006],
            ],
            12,
        ),
    ),
    softBurst: shape(
        custom(
            [
                [0.193, 0.277, 0.053],
                [0.176, 0.055, 0.053],
            ],
            10,
        ),
    ),
    boom: shape(
        custom(
            [
                [0.457, 0.296, 0.007],
                [0.5, -0.051, 0.007],
            ],
            15,
        ),
    ),
    softBoom: shape(
        custom(
            [
                [0.733, 0.454],
                [0.839, 0.437, 0.532],
                [0.949, 0.449, 0.439],
                [0.998, 0.478, 0.174],
            ],
            16,
            true,
        ),
    ),
    flower: shape(
        custom(
            [
                [0.37, 0.187],
                [0.416, 0.049, 0.381],
                [0.479, 0.001, 0.095],
            ],
            8,
            true,
        ),
    ),
    puffy: shape(
        scaleContour(
            custom(
                [
                    [0.5, 0.053],
                    [0.545, -0.04, 0.405],
                    [0.67, -0.035, 0.426],
                    [0.717, 0.066, 0.574],
                    [0.722, 0.128],
                    [0.777, 0.002, 0.36],
                    [0.914, 0.149, 0.66],
                    [0.926, 0.289, 0.66],
                    [0.881, 0.346],
                    [0.94, 0.344, 0.126],
                    [1.003, 0.437, 0.255],
                ],
                2,
                true,
            ),
            1,
            0.742,
        ),
    ),
    puffyDiamond: shape(
        custom(
            [
                [0.87, 0.13, 0.146],
                [0.818, 0.357],
                [1, 0.332, 0.853],
            ],
            4,
            true,
        ),
    ),
    pixelCircle: shape(
        custom(
            [
                [0.5, 0],
                [0.704, 0],
                [0.704, 0.065],
                [0.843, 0.065],
                [0.843, 0.148],
                [0.926, 0.148],
                [0.926, 0.296],
                [1, 0.296],
            ],
            2,
            true,
        ),
    ),
    pixelTriangle: shape(
        custom(
            [
                [0.11, 0.5],
                [0.113, 0],
                [0.287, 0],
                [0.287, 0.087],
                [0.421, 0.087],
                [0.421, 0.17],
                [0.56, 0.17],
                [0.56, 0.265],
                [0.674, 0.265],
                [0.675, 0.344],
                [0.789, 0.344],
                [0.789, 0.439],
                [0.888, 0.439],
            ],
            1,
            true,
        ),
    ),
    bun: shape(
        custom(
            [
                [0.796, 0.5],
                [0.853, 0.518, 1],
                [0.992, 0.631, 1],
                [0.968, 1, 1],
            ],
            2,
            true,
        ),
    ),
    heart: shape(
        custom(
            [
                [0.5, 0.268, 0.016],
                [0.792, -0.066, 0.958],
                [1.064, 0.276, 1],
                [0.501, 0.946, 0.129],
            ],
            1,
            true,
        ),
    ),
} satisfies Record<string, ShapeGeometry>;

export type MaterialShape = keyof typeof MATERIAL_SHAPES;
