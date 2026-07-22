import { ZerodhaScheme } from "./zerodha";

export type MappingScheme = ZerodhaScheme;

export interface MappingTabProps {
  allSchemes: MappingScheme[];
}

export interface ZerodhaMappingTabProps {
  allSchemes: ZerodhaScheme[];
}
