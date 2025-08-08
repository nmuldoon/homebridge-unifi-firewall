import { Service, PlatformAccessory, CharacteristicValue } from "homebridge";

import { UnifiFirewallPlatform } from "./platform";
import { UniFi9PolicyConfig } from "./config";
import { UniFi9PolicyManager, UniFi9FirewallPolicy } from "./unifi9Policy";
import { Controller, Site } from "unifi-client";

export class UniFi9PolicySwitch {
  private service: Service;
  private policyManager: UniFi9PolicyManager;

  constructor(
    private readonly platform: UnifiFirewallPlatform,
    private readonly accessory: PlatformAccessory<{
      policy: UniFi9PolicyConfig;
    }>,
    private readonly policy: UniFi9FirewallPolicy,
    private readonly invert: boolean,
    private readonly controller: Controller,
    private readonly site: Site
  ) {
    // Create policy manager
    this.policyManager = new UniFi9PolicyManager(this.controller, this.site);

    // set accessory information
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, "Ubiquiti")
      .setCharacteristic(this.platform.Characteristic.Model, "UniFi-9-Policy")
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        this.accessory.context.policy.name
      );

    this.service =
      this.accessory.getService(this.platform.Service.Switch) ||
      this.accessory.addService(this.platform.Service.Switch);

    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      accessory.context.policy.name
    );

    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this)) // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this)); // GET - bind to the `getOn` method below
  }

  async setOn(value: CharacteristicValue) {
    const newValue = value as boolean;
    const targetEnabled = this.invert ? !newValue : newValue;

    try {
      await this.policyManager.updatePolicy(this.policy._id, targetEnabled);
      // Update local policy state
      this.policy.enabled = targetEnabled;

      this.platform.log.debug(
        `Set UniFi 9 Policy ${this.policy._id}: ${newValue} (Inverted? ${this.invert})`
      );
    } catch (error) {
      this.platform.log.error(
        `Failed to update UniFi 9 Policy ${this.policy._id}:`,
        error
      );
      throw error;
    }
  }

  async getOn(): Promise<CharacteristicValue> {
    const isOn = this.invert ? !this.policy.enabled : this.policy.enabled;

    this.platform.log.debug(
      `Is UniFi 9 Policy ${this.policy._id} on? ${isOn} (Inverted? ${this.invert})`
    );

    return isOn;
  }
}
