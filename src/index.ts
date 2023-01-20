import { PLATFORM_NAME } from "./settings";
import { UnifiFirewallPlatform } from "./platform";

/**
 * This method registers the platform with Homebridge
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export = (homebridge: any) => {
  homebridge.registerPlatform(PLATFORM_NAME, UnifiFirewallPlatform);
};
