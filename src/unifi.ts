import { Controller, FWRule, IControllerProps } from 'unifi-client';

export class UnifiFirewallRule {
  ruleId: string;
  siteName: string;
  controller: Controller;

  constructor(controllerProps: IControllerProps, siteName: string, ruleId: string) {
    this.controller = new Controller(controllerProps);
    this.siteName = siteName;
    this.ruleId = ruleId;
  }

  public async getEnabled(): Promise<boolean> {
    const rule = await this.getRule();

    return rule.enabled;
  }

  public async setEnabled(enabled: boolean): Promise<void> {
    const rule = await this.getRule();
    rule.enabled = enabled;
    await rule.save();
  }

  private async getRule(): Promise<FWRule> {
    await this.login();
    const sites = await this.controller.getSites();
    const site = sites.find(site => site.name === this.siteName);

    if (!site) {
      throw new Error('Cannot find site');
    }

    const rules = await site.firewall.getRules();
    const rule = rules.find(rule => rule._id === this.ruleId);

    if (!rule) {
      throw new Error('Cannot find rule');
    }

    return rule;
  }

  private async login(): Promise<void> {
    if (this.controller.logged) {
      return;
    }

    await this.controller.login();
  }
}
