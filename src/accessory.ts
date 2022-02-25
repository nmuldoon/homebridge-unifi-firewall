import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  CharacteristicValue,
  HAP,
  Logging,
  Service,
} from 'homebridge';
import { IControllerProps } from 'unifi-client';

import { UnifiFirewallRule } from './unifi';

/*
 * IMPORTANT NOTICE
 *
 * One thing you need to take care of is, that you never ever ever import anything directly from the "homebridge" module (or the
 * "hap-nodejs" module).
 * The above import block may seem like, that we do exactly that, but actually those imports are only used for types and interfaces
 * and will disappear once the code is compiled to Javascript.
 * In fact you can check that by running `npm run build` and opening the compiled Javascript file in the `dist` folder.
 * You will notice that the file does not contain a `... = require("homebridge");` statement anywhere in the code.
 *
 * The contents of the above import statement MUST ONLY be used for type annotation or accessing things like CONST ENUMS,
 * which is a special case as they get replaced by the actual value and do not remain as a reference in the compiled code.
 * Meaning normal enums are bad, const enums can be used.
 *
 * You MUST NOT import anything else which remains as a reference in the code, as this will result in
 * a `... = require("homebridge");` to be compiled into the final Javascript code.
 * This typically leads to unexpected behavior at runtime, as in many cases it won't be able to find the module
 * or will import another instance of homebridge causing collisions.
 *
 * To mitigate this the {@link API | Homebridge API} exposes the whole suite of HAP-NodeJS inside the `hap` property
 * of the api object, which can be acquired for example in the initializer function. This reference can be stored
 * like this for example and used to access all exported variables and classes from HAP-NodeJS.
 */
let hap: HAP;

type UnifiFirewallSwitchConfig = {
  controller: IControllerProps;
  site: string;
  rule: string;
  inverted: boolean;
};

function initUnifiConfig(options?: Partial<UnifiFirewallSwitchConfig>): UnifiFirewallSwitchConfig {
  const defaults: UnifiFirewallSwitchConfig = {
    controller: {
      url: 'https://unifi:8443',
      username: 'ubnt',
      password: 'ubnt',
      strictSSL: false,
    },
    site: '',
    rule: '',
    inverted: false,
  };

  return {
    ...defaults,
    ...options,
  };
}

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class UnifiFirewallSwitch implements AccessoryPlugin {
  private switchOn = false;
  private inverted = false;

  private readonly switchService: Service;
  private readonly informationService: Service;
  private readonly unifi: UnifiFirewallRule;

  constructor(
    private readonly log: Logging,
    config: AccessoryConfig & Partial<UnifiFirewallSwitchConfig>,
    private readonly api: API,
  ) {
    const unifiConfig = initUnifiConfig(config);
    this.inverted = unifiConfig.inverted;
    this.log.debug('Unifi Firewall Switch Loaded');

    // your accessory must have an AccessoryInformation service
    this.informationService = new this.api.hap.Service.AccessoryInformation()
      .setCharacteristic(this.api.hap.Characteristic.Manufacturer, 'Unifi')
      .setCharacteristic(this.api.hap.Characteristic.Model, 'Firewall Rule')
      .setCharacteristic(this.api.hap.Characteristic.SerialNumber, config.name);

    // setup homebridge switch
    this.switchService = new hap.Service.Switch(config.name);

    // register handlers for the On/Off Characteristic
    this.switchService.getCharacteristic(hap.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));

    this.unifi = new UnifiFirewallRule(unifiConfig.controller, unifiConfig.site, unifiConfig.rule);

    this.unifi.getEnabled().then(enabled => {
      this.switchService.updateCharacteristic(this.api.hap.Characteristic.On, enabled !== this.inverted);
    });
  }

  /*
    * This method is called directly after creation of this instance.
    * It should return all services which should be added to the accessory.
    */
  getServices(): Service[] {
    return [
      this.informationService,
      this.switchService,
    ];
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOn(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.switchOn = value as boolean;

    this.log.debug('Set Characteristic On ->', this.switchOn);

    this.unifi.setEnabled(this.switchOn !== this.inverted);

    this.log.debug('Set Rule Enabled ->', this.switchOn !== this.inverted);
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  async getOn(): Promise<CharacteristicValue> {
    this.unifi.getEnabled().then(enabled => {
      this.log.debug('Get Rule Enabled ->', enabled);
      this.switchService.updateCharacteristic(this.api.hap.Characteristic.On, enabled !== this.inverted);
    });

    this.log.debug('Get Characteristic On ->', this.switchOn);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return this.switchOn;
  }
}
