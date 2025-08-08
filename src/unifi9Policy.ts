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
        // Zone-based firewall endpoints (newer UniFi)
        {
          url: "/firewall-policies",
          options: { apiVersion: 2, apiPart: true },
        },
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await this.site.getInstance().get(endpoint.url, {
            ...endpoint.options,
            urlParams: {
              site: this.site.name,
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
      // Use the batch endpoint that the UniFi Controller UI uses
      const batchPayload = [{ _id: policyId, enabled }];

      // The correct endpoint - let unifi-client handle the proxy prefix
      const endpoint = "/firewall-policies/batch";

      await this.site.getInstance().put(endpoint, batchPayload, {
        apiVersion: 2,
        apiPart: true,
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log(
        `Successfully updated UniFi 9 policy ${policyId} to ${
          enabled ? "enabled" : "disabled"
        }`
      );
    } catch (error) {
      console.error("Error updating UniFi 9 policy:", error);
      throw error;
    }
  }
}
