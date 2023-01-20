import { Service, PlatformAccessory, CharacteristicValue } from "homebridge";

import { UnifiFirewallPlatform } from "./platform";
import { UnifiFirewallRuleConfig } from "./config";
import { FWRule } from "unifi-client";

export class UnifiFirewallSwitch {
  private service: Service;

  constructor(
    private readonly platform: UnifiFirewallPlatform,
    private readonly accessory: PlatformAccessory<{
      rule: UnifiFirewallRuleConfig;
    }>,
    private readonly fwRule: FWRule
  ) {
    // set accessory information
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, "Ubiquiti")
      .setCharacteristic(this.platform.Characteristic.Model, "Firewall-Rule")
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        this.accessory.context.rule.id
      );

    this.service =
      this.accessory.getService(this.platform.Service.Switch) ||
      this.accessory.addService(this.platform.Service.Switch);

    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      accessory.context.rule.name
    );

    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this)) // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this)); // GET - bind to the `getOn` method below
  }

  async setOn(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.fwRule.enabled = value as boolean;
    await this.fwRule.save();

    this.platform.log.debug("Set Characteristic On ->", value);
  }

  async getOn(): Promise<CharacteristicValue> {
    const isOn = this.fwRule.enabled;

    this.platform.log.debug("Get Characteristic On ->", isOn);

    return isOn;
  }
}
