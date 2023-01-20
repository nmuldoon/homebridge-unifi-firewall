import {
  API,
  Categories,
  Characteristic,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from "homebridge";

import { PLATFORM_NAME, PLUGIN_NAME } from "./settings";
import { UnifiFirewallSwitch } from "./platformAccessory";
import { UnifiFirewallPlatformConfig, UnifiFirewallRuleConfig } from "./config";
import { Controller } from "unifi-client";

/**
 * UnifiFirewallPlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class UnifiFirewallPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic =
    this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory<{
    rule: UnifiFirewallRuleConfig;
  }>[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig & UnifiFirewallPlatformConfig,
    public readonly api: API
  ) {
    this.log.debug(`Finished initializing platform: ${this.config.name}`);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on("didFinishLaunching", () => {
      log.debug("Executed didFinishLaunching callback");
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(
    accessory: PlatformAccessory<{ rule: UnifiFirewallRuleConfig }>
  ) {
    this.log.info("Loading accessory from cache:", accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  async discoverDevices() {
    const controller = new Controller(this.config.unifi);
    await controller.login();
    const sites = await controller.getSites();
    const site = sites.find((site) => site.name === this.config.unifi.site);
    if (!site) {
      throw new Error(
        `Site defined in Unifi config <${this.config.unifi.site}> does not exist on controller`
      );
    }

    for (const rule of this.config.rules) {
      const fwRule = await site.firewall.getRule(rule.id);
      const uuid = this.api.hap.uuid.generate(rule.id);

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find(
        (accessory) => accessory.UUID === uuid
      );

      if (existingAccessory) {
        // the accessory already exists
        this.log.info(
          `Restoring existing accessory from cache: ${existingAccessory.displayName}`
        );

        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
        // existingAccessory.context.rule = rule;
        // this.api.updatePlatformAccessories([existingAccessory]);

        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        new UnifiFirewallSwitch(this, existingAccessory, fwRule);

        // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
        // remove platform accessories when no longer present
        // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
        // this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
      } else {
        // the accessory does not yet exist, so we need to create it
        this.log.info(`Adding new accessory: ${rule.name} <${rule.id}>`);

        // create a new accessory
        const accessory = new this.api.platformAccessory<{
          rule: UnifiFirewallRuleConfig;
        }>(rule.name, uuid, Categories.SWITCH);

        // store a copy of the rule object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.rule = rule;

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        new UnifiFirewallSwitch(this, accessory, fwRule);

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
          accessory,
        ]);
      }
    }
  }
}
