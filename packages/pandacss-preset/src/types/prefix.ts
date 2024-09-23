export type Prefix =
    | string
    | {
          default: string;
          tokenPrefix?: string;
          utilityPrefix?: string;
          jsxPrefix?: string;
          textStylePrefix?: string;
      };
