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
    private readonly fwRule: FWRule,
    private readonly invert: boolean
  ) {
    // set accessory information
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
    const newValue = value as boolean;

    this.fwRule.enabled = this.invert ? !newValue : newValue;
    await this.fwRule.save();

    this.platform.log.debug(
      `Set Unifi Firewall ${this.fwRule._id}: ${newValue} (Inverted? ${this.invert})`
    );
  }

  async getOn(): Promise<CharacteristicValue> {
    const isOn = this.invert ? !this.fwRule.enabled : this.fwRule.enabled;

    this.platform.log.debug(
      `Is Unifi Firewall ${this.fwRule._id} on? ${isOn} (Inverted? ${this.invert})`
    );

    return isOn;
  }
}
