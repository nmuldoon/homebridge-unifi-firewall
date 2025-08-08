export interface UnifiFirewallPlatformConfig {
  unifi: UnifiControllerConfig;
  unifi9Policies: UniFi9PolicyConfig[];
}

export interface UnifiControllerConfig {
  url: string;
  username: string;
  password: string;
  site: string;
  strictSSL: boolean;
}

export interface UniFi9PolicyConfig {
  id: string;
  name: string;
  inverted: boolean;
}
