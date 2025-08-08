export interface UnifiFirewallPlatformConfig {
  unifi: UnifiControllerConfig;
  rules: UnifiFirewallRuleConfig[];
  unifi9Policies?: UniFi9PolicyConfig[];
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

export interface UniFi9PolicyConfig {
  id: string;
  name: string;
  inverted: boolean;
}
