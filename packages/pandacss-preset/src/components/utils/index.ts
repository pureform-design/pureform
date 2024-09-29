import type { BaseColorGroup, ColorScheme } from "@pureform/ui-utils";
import type { NormalPrefix } from "../../types";
import { keyOf } from "@repo/utils";
import { getToken } from "../../helpers";

type ColorInfo = {
    name: string;
    token: string;
};

export function mapColors<
    TColorGroups extends string = BaseColorGroup,
    TMapped = unknown,
>(
    prefix: NormalPrefix,
    colorScheme: ColorScheme<TColorGroups>,
    mapper: (colorInfo: ColorInfo) => TMapped,
) {
    const info = colorScheme.getAllInfo();
    const keys = keyOf(info);

    return keys.map((key) =>
        mapper({
            name: key,
            token: getToken(prefix, key),
        }),
    );
}
