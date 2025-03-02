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
  name: string;
  inverted: boolean;
}
