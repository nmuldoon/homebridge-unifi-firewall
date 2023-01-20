export interface UnifiFirewallPlatformConfig {
  unifi: UnifiControllerConfig;
  rules: UnifiFirewallRuleConfig[];
}

export interface UnifiControllerConfig {
  url: string;
  username: string;
  password: string;
  site: string;
  strictSSL: boolean;
}

export interface UnifiFirewallRuleConfig {
  id: string;
  name: string;
  inverted: boolean;
}
