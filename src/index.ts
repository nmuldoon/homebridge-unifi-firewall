import { PLATFORM_NAME } from "./settings";
import { UnifiFirewallPlatform } from "./platform";

/**
 * This method registers the platform with Homebridge
 */
export = (homebridge: any) => {
  homebridge.registerPlatform(PLATFORM_NAME, UnifiFirewallPlatform);
};
