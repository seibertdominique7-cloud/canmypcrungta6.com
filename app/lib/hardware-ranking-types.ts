export type HardwareVendor = 'intel' | 'amd' | 'nvidia';

export type HardwareFormFactor = 'desktop' | 'laptop' | 'integrated';

export interface HardwareTierEntry {
  canonicalName: string;
  vendor: HardwareVendor;
  formFactor: HardwareFormFactor;
  performanceTier: number;
  aliases: readonly string[];
}
