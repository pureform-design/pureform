export type NormalPrefix = {
    tokenPrefix: string;
    utilityPrefix: string;
    componentPrefix: string;
    textStylePrefix: string;
    cssVarPrefix: string;
    classPrefix: string;
};

export type Prefix =
    | string
    | ({
          default: string;
      } & Partial<NormalPrefix>);
