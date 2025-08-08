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
import { UniFi9PolicySwitch } from "./unifi9PolicyAccessory";
import {
  UnifiFirewallPlatformConfig,
  UnifiFirewallRuleConfig,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  UniFi9PolicyConfig, // Used in UnifiFirewallPlatformConfig interface
} from "./config";
import { Controller, Site } from "unifi-client";
import { UniFi9PolicyManager } from "./unifi9Policy";

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
        `Site defined in Unifi config <${this.config.unifi.site}> was not found on the controller (Check the Controller URL)`
      );
    }

    // this.log.info(
    //   `Discovered site: ${site.name} with ${JSON.stringify(
    //     await site.firewall
    //   )} rules`
    // );

    const fwRules = await site.firewall.getRules();

    for (const rule of this.config.rules) {
      const fwRule = fwRules.find((r) => r.rule_index === rule.id);
      if (!fwRule) {
        throw new Error(`Rule index <${rule.id}> was not found`);
      }
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
        new UnifiFirewallSwitch(this, existingAccessory, fwRule, rule.inverted);

        // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, eg.:
        // remove platform accessories when no longer present
        // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
        // this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
      } else {
        // the accessory does not yet exist, so we need to create it
        this.log.info(`Adding new accessory: ${rule.name}`);

        // create a new accessory
        const accessory = new this.api.platformAccessory<{
          rule: UnifiFirewallRuleConfig;
        }>(rule.name, uuid, Categories.SWITCH);

        // store a copy of the rule object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context.rule = rule;

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        new UnifiFirewallSwitch(this, accessory, fwRule, rule.inverted);

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
          accessory,
        ]);
      }
    }

    // Handle UniFi 9 Policies if configured
    if (this.config.unifi9Policies && this.config.unifi9Policies.length > 0) {
      await this.discoverUniFi9Policies(controller, site);
    }
  }

  async discoverUniFi9Policies(controller: Controller, site: Site) {
    try {
      const policyManager = new UniFi9PolicyManager(controller, site);
      const policies = await policyManager.getPolicies();

      this.log.info(`Found ${policies.length} UniFi 9 policies`);

      if (!this.config.unifi9Policies) {
        return;
      }

      for (const policyConfig of this.config.unifi9Policies) {
        const policy = policies.find(
          (p) => p._id === policyConfig.id || p.name === policyConfig.name
        );
        if (!policy) {
          this.log.warn(
            `UniFi 9 Policy ${policyConfig.id || policyConfig.name} not found`
          );
          continue;
        }

        const uuid = this.api.hap.uuid.generate(
          `unifi9-policy-${policyConfig.id || policy._id}`
        );

        const existingAccessory = this.accessories.find(
          (accessory) => accessory.UUID === uuid
        );

        if (existingAccessory) {
          this.log.info(
            `Restoring existing UniFi 9 policy from cache: ${existingAccessory.displayName}`
          );
          new UniFi9PolicySwitch(
            this,
            existingAccessory,
            policy,
            policyConfig.inverted,
            controller,
            site
          );
        } else {
          this.log.info(
            `Adding new UniFi 9 policy accessory: ${policyConfig.name}`
          );

          const accessory = new this.api.platformAccessory<{
            rule: UnifiFirewallRuleConfig;
          }>(policyConfig.name, uuid, Categories.SWITCH);

          accessory.context.rule = {
            id: policyConfig.id,
            name: policyConfig.name,
            inverted: policyConfig.inverted,
          };

          new UniFi9PolicySwitch(
            this,
            accessory,
            policy,
            policyConfig.inverted,
            controller,
            site
          );

          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
            accessory,
          ]);
        }
      }
    } catch (error) {
      this.log.error("Failed to discover UniFi 9 policies:", error);
    }
  }
}
