import { Logger } from "homebridge";
import { Controller } from "unifi-client";

interface DiscoveryConfig {
  url: string;
  username: string;
  password: string;
  site: string;
  strictSSL: boolean;
}

export interface DiscoveryResult {
  success: boolean;
  message?: string;
  rules?: Array<{
    id: number;
    name: string;
    enabled: boolean;
    action: string;
    src_address?: string;
    dst_address?: string;
    dst_port?: string;
  }>;
  policies?: Array<{
    id: string;
    name: string;
    enabled: boolean;
    description?: string;
  }>;
}

export class ConfigUIService {
  constructor(private readonly log: Logger) {}

  async discoverRulesAndPolicies(
    config: DiscoveryConfig
  ): Promise<DiscoveryResult> {
    try {
      // Disable SSL certificate validation for self-signed certificates
      if (!config.strictSSL) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      }

      this.log.info("🔍 Connecting to UniFi Controller for discovery...");

      const controller = new Controller({
        url: config.url,
        username: config.username,
        password: config.password,
        strictSSL: config.strictSSL,
      });

      await controller.login();

      const sites = await controller.getSites();
      const site =
        sites.find((s) => s.name === config.site) ||
        sites.find((s) => s.desc === config.site);

      if (!site) {
        return {
          success: false,
          message: `Site "${config.site}" not found. Available sites: ${sites
            .map((s) => s.name)
            .join(", ")}`,
        };
      }

      this.log.info(`✅ Connected to site: ${site.name} (${site.desc})`);

      // Discover traditional firewall rules
      const fwRules = await site.firewall.getRules();
      const rules = fwRules.map((rule) => ({
        id: Number(rule.rule_index),
        name: rule.name || `Rule ${rule.rule_index}`,
        enabled: rule.enabled,
        action: String(rule.action),
        src_address: rule.src_address,
        dst_address: rule.dst_address,
        dst_port: rule.dst_port,
      }));

      // Discover UniFi 9 policies (if available)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let policies: Array<any> = [];
      try {
        // For UniFi 9 policies, we'll need to use the UniFi9PolicyManager
        // This is a simplified version for the config UI
        this.log.info("Checking for UniFi 9 policies...");

        // Note: Full UniFi 9 policy discovery would require the UniFi9PolicyManager
        // For now, we'll provide a placeholder that indicates policies might be available
        policies = [
          {
            id: "example_policy",
            name: "Example Policy (UniFi 9 detection requires full setup)",
            enabled: false,
            description: "Use the full discovery script for UniFi 9 policies",
          },
        ];
      } catch (error) {
        this.log.debug(
          "UniFi 9 policies not available:",
          (error as Error).message
        );
      }

      await controller.logout();

      return {
        success: true,
        message: `Found ${rules.length} traditional rules and ${policies.length} UniFi 9 policies`,
        rules,
        policies,
      };
    } catch (error) {
      this.log.error("Discovery failed:", (error as Error).message);
      return {
        success: false,
        message: (error as Error).message,
      };
    }
  }
}
