// UniFi 9 Firewall Policy implementation
// This is a custom implementation since unifi-client doesn't support it yet

import { Controller } from "unifi-client";
import { Site } from "unifi-client";

export interface UniFi9FirewallPolicy {
  _id: string;
  name: string;
  enabled: boolean;
  action: "allow" | "block";
  site_id: string;
  // Add other policy properties as discovered
}

export class UniFi9PolicyManager {
  constructor(private controller: Controller, private site: Site) {}

  async getPolicies(): Promise<UniFi9FirewallPolicy[]> {
    try {
      // Try different possible endpoints for UniFi 9 policies
      const endpoints = [
        // Working firewall policies endpoints (from browser inspection)
        {
          url: `/proxy/network/v2/api/site/${this.site.name}/firewall-policies`,
          options: {},
        },
        {
          url: "/proxy/network/v2/api/site/default/firewall-policies",
          options: {},
        },

        // Zone-based firewall endpoints (newer UniFi)
        {
          url: "/firewall-policies",
          options: { apiVersion: 2, apiPart: true },
        },

        // Traditional endpoints (fallback)
        { url: "/rest/firewallpolicy", options: {} },
        { url: "/rest/policy", options: {} },
        {
          url: "/api/s/:site/rest/firewallpolicy",
          options: { urlParams: { site: this.site.name } },
        },
        {
          url: "/api/s/:site/rest/policy",
          options: { urlParams: { site: this.site.name } },
        },
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await this.site.getInstance().get(endpoint.url, {
            ...endpoint.options,
            urlParams: {
              site: this.site.name,
              ...(endpoint.options.urlParams || {}),
            },
          });

          const responseData = response.data?.data || response.data;

          if (responseData) {
            console.log(`Found policies at endpoint: ${endpoint.url}`);
            // Handle both single objects and arrays
            return Array.isArray(responseData) ? responseData : [responseData];
          }
        } catch (error) {
          console.log(`Endpoint ${endpoint.url} not found or accessible`);
        }
      }

      return [];
    } catch (error) {
      console.error("Error fetching UniFi 9 policies:", error);
      return [];
    }
  }

  async updatePolicy(policyId: string, enabled: boolean): Promise<void> {
    try {
      // Try to update the policy
      const policy = { enabled };

      const endpoints = [
        // Zone-based firewall endpoints (newer UniFi)
        {
          url: `/firewall-policies/${policyId}`,
          options: { apiVersion: 2, apiPart: true },
        },

        // Working firewall policies endpoints (from browser inspection)
        {
          url: `/proxy/network/v2/api/site/${this.site.name}/firewall-policies/${policyId}`,
          options: {},
        },
        {
          url: `/proxy/network/v2/api/site/default/firewall-policies/${policyId}`,
          options: {},
        },

        // Traditional endpoints
        { url: `/rest/firewallpolicy/${policyId}`, options: {} },
        { url: `/rest/policy/${policyId}`, options: {} },
      ];

      for (const endpoint of endpoints) {
        try {
          await this.site.getInstance().put(endpoint.url, policy, {
            ...endpoint.options,
            urlParams: { site: this.site.name, id: policyId },
          });
          console.log(`Successfully updated policy via ${endpoint.url}`);
          return;
        } catch (error) {
          console.log(`Failed to update via ${endpoint.url}`);
        }
      }

      throw new Error("Could not update policy via any known endpoint");
    } catch (error) {
      console.error("Error updating UniFi 9 policy:", error);
      throw error;
    }
  }
}
