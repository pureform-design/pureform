export type NormalPrefix = {
    tokenPrefix: string;
    utilityPrefix: string;
    componentPrefix: string;
    textStylePrefix: string;
    cssVarPrefix: string;
};

export type Prefix =
    | string
    | ({
          default: string;
      } & Partial<NormalPrefix>);
