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
import { UniFi9PolicySwitch } from "./unifi9PolicyAccessory";
import {
  UnifiFirewallPlatformConfig,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  UniFi9PolicyConfig, // Used in UnifiFirewallPlatformConfig interface
} from "./config";
import { Controller, Site } from "unifi-client";
import { UniFi9PolicyManager } from "./unifi9Policy";
import { ConfigUIService } from "./configUI";

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
    policy: UniFi9PolicyConfig;
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
   * Discover rules and policies for Config UI
   * This method can be called programmatically for discovery
   */
  async discoverRulesAndPolicies(discoveryConfig: {
    url: string;
    username: string;
    password: string;
    site: string;
    strictSSL: boolean;
  }) {
    const configUIService = new ConfigUIService(this.log);
    return await configUIService.discoverRulesAndPolicies(discoveryConfig);
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(
    accessory: PlatformAccessory<{ policy: UniFi9PolicyConfig }>
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
    try {
      // Disable SSL certificate validation for self-signed certificates
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

      this.log.info("Connecting to UniFi Controller...");
      this.log.debug(`Controller URL: ${this.config.unifi.url}`);
      this.log.debug(`Site: ${this.config.unifi.site}`);

      const controller = new Controller({
        ...this.config.unifi,
        strictSSL: false,
      });

      await controller.login();
      this.log.info("✅ Successfully connected to UniFi Controller");

      const sites = await controller.getSites();
      this.log.debug(`Found ${sites.length} sites`);

      const site = sites.find((site) => site.name === this.config.unifi.site);
      if (!site) {
        this.log.error(
          `Available sites: ${sites.map((s) => s.name).join(", ")}`
        );
        throw new Error(
          `Site defined in Unifi config <${this.config.unifi.site}> was not found on the controller (Check the Controller URL)`
        );
      }

      this.log.info(
        `Using site: ${site.name} (${site.desc || "no description"})`
      );

      // Only discover and register UniFi 9 policies
      if (this.config.unifi9Policies && this.config.unifi9Policies.length > 0) {
        await this.discoverUniFi9Policies(controller, site);
      } else {
        this.log.info(
          "No UniFi 9 policies configured. Add policies to your configuration to create accessories."
        );
      }
    } catch (error) {
      this.log.error("Failed to connect to UniFi Controller:");
      this.log.error(`Error: ${(error as Error).message}`);

      // Provide helpful troubleshooting information
      this.log.error("");
      this.log.error("Troubleshooting steps:");
      this.log.error("1. Verify the controller URL is correct");
      this.log.error("2. Check username and password");
      this.log.error("3. Ensure the user has admin privileges");
      this.log.error("4. Try disabling strictSSL in config");
      this.log.error("5. Test connection with the discovery script first:");
      this.log.error(
        `   npm run discover-rules "${this.config.unifi.url}" "username" "password"`
      );

      throw error;
    }
  }

  /**
   * Discover and register UniFi 9 policies
   */
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
            policy: UniFi9PolicyConfig;
          }>(policyConfig.name, uuid, Categories.SWITCH);

          accessory.context.policy = {
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
