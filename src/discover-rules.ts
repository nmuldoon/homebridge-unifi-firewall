/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * UniFi 9 Policy Discovery Script
 *
 * This script helps you discover UniFi 9 firewall policies
 * and their IDs for use in the Homebridge plugin configuration.
 */

import { Controller } from "unifi-client";

interface PolicyDiscoveryConfig {
  url: string;
  username: string;
  password: string;
  site: string;
  strictSSL: boolean;
}

async function discoverPolicies(): Promise<void> {
  // Get configuration from command line arguments or environment variables
  const config: PolicyDiscoveryConfig = {
    url: process.env.UNIFI_URL || process.argv[2] || "",
    username: process.env.UNIFI_USERNAME || process.argv[3] || "",
    password: process.env.UNIFI_PASSWORD || process.argv[4] || "",
    site: process.env.UNIFI_SITE || process.argv[5] || "default",
    strictSSL: false,
  };

  if (!config.url || !config.username || !config.password) {
    console.log(
      "Usage: node discover-policies.js <url> <username> <password> [site]"
    );
    console.log(
      "Or set environment variables: UNIFI_URL, UNIFI_USERNAME, UNIFI_PASSWORD, UNIFI_SITE"
    );
    console.log("");
    console.log("Example:");
    console.log(
      "  node discover-policies.js https://192.168.1.1 admin password default"
    );
    process.exit(1);
  }

  try {
    console.log("Connecting to UniFi Controller...");
    const controller = new Controller(config);
    await controller.login();

    const sites = await controller.getSites();
    const site = sites.find((s) => s.name === config.site);

    if (!site) {
      console.error(`Site "${config.site}" not found!`);
      console.log("Available sites:", sites.map((s) => s.name).join(", "));
      process.exit(1);
    }

    console.log(`Connected to site: ${site.name}`);
    console.log("");

    // First check if zone-based firewall is enabled
    let useZoneFirewall = false;
    try {
      console.log("Checking if zone-based firewall is enabled...");
      const migrationResponse = await site
        .getInstance()
        .get("/site-feature-migration", {
          apiVersion: 2,
        });

      useZoneFirewall = migrationResponse.data?.some(
        (migration: any) => migration.feature === "ZONE_BASED_FIREWALL"
      );

      console.log(
        `Zone-based firewall: ${useZoneFirewall ? "✅ Enabled" : "❌ Disabled"}`
      );
      console.log("");
    } catch (error: any) {
      console.log(
        `Could not check zone-based firewall status: ${error.message}`
      );
      console.log("");
    }

    // Discover UniFi 9 policies using the correct API endpoints
    const endpoints = [
      // Zone-based firewall endpoints
      {
        url: "/firewall-policies",
        options: { apiVersion: 2, apiPart: true },
      },
      {
        url: "/firewall/zone",
        options: { apiVersion: 2, apiPart: true },
      },
    ];

    let foundPolicies = false;

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint.url}`);
        const response = await site.getInstance().get(endpoint.url, {
          ...endpoint.options,
        });

        const responseData = response.data?.data || response.data;

        // Handle both single objects and arrays
        const policies = Array.isArray(responseData)
          ? responseData
          : [responseData];

        if (
          policies.length > 0 &&
          policies[0] !== null &&
          policies[0] !== undefined
        ) {
          console.log(
            `✅ Found ${policies.length} policies at ${endpoint.url}:`
          );
          console.log("");

          policies.forEach((policy: any, index: number) => {
            console.log(`Policy ${index + 1}:`);
            console.log(`  ID: ${policy._id || policy.id || "N/A"}`);
            console.log(`  Name: ${policy.name || "N/A"}`);
            console.log(
              `  Enabled: ${
                policy.enabled !== undefined ? policy.enabled : "N/A"
              }`
            );
            console.log(`  Type: ${policy.type || policy.action || "N/A"}`);
            console.log("  Raw data:", JSON.stringify(policy, null, 2));
            console.log("");
          });

          foundPolicies = true;
          break;
        } else if (response.data) {
          // Endpoint responded but might be empty or have different structure
          console.log(`  📊 Endpoint ${endpoint.url} responded with data:`);
          console.log(
            "  Data structure:",
            JSON.stringify(response.data, null, 2)
          );

          // Check if it's just an empty array
          if (Array.isArray(response.data) && response.data.length === 0) {
            console.log(
              "  ✅ Endpoint exists but no policies found (empty array)"
            );
          } else if (
            response.data.data &&
            Array.isArray(response.data.data) &&
            response.data.data.length === 0
          ) {
            console.log(
              "  ✅ Endpoint exists but no policies found (empty data array)"
            );
          } else {
            console.log(
              "  ⚠️  Endpoint exists but returned unexpected data structure"
            );
          }
        } else {
          console.log(`  No data found at ${endpoint.url}`);
        }
      } catch (error: any) {
        console.log(`  Error accessing ${endpoint.url}: ${error.message}`);
      }
    }

    if (!foundPolicies) {
      console.log("❌ No UniFi 9 policies found.");
      console.log("");
      console.log("This could mean:");
      console.log("- Your UniFi Controller is not version 9 or later");
      console.log("- No firewall policies have been created yet");
      console.log("- The API endpoints have changed");
      console.log("");
      console.log("Checking traditional firewall rules instead...");
      console.log("");

      try {
        const fwRules = await site.firewall.getRules();
        if (fwRules.length > 0) {
          console.log(`✅ Found ${fwRules.length} traditional firewall rules:`);
          console.log("");
          fwRules.forEach((rule: any, index: number) => {
            console.log(`Rule ${index + 1}:`);
            console.log(`  ID: ${rule.rule_index || rule._id || "N/A"}`);
            console.log(`  Name: ${rule.name || "N/A"}`);
            console.log(`  Enabled: ${rule.enabled || "N/A"}`);
            console.log(`  Action: ${rule.action || "N/A"}`);
            console.log(`  Source: ${rule.src_address || "N/A"}`);
            console.log(`  Destination: ${rule.dst_address || "N/A"}`);
            console.log("");
          });
          console.log(
            "💡 You can use these traditional firewall rules with the original configuration:"
          );
          console.log('   "rules": [');
          fwRules.forEach((rule: any, index: number) => {
            console.log(`     {`);
            console.log(`       "id": "${rule.rule_index || rule._id}",`);
            console.log(
              `       "name": "${rule.name || `Rule ${index + 1}`}",`
            );
            console.log(`       "inverted": false`);
            console.log(`     }${index < fwRules.length - 1 ? "," : ""}`);
          });
          console.log("   ]");
        } else {
          console.log("❌ No traditional firewall rules found either.");
          console.log("");
          console.log("This could mean:");
          console.log(
            "- No firewall rules have been created in your UniFi Controller"
          );
          console.log(
            "- The user account doesn't have permission to view firewall rules"
          );
          console.log("- There might be a connection or API issue");
        }
      } catch (error: any) {
        console.log("❌ Error retrieving traditional firewall rules:");
        console.log(`   ${error.message}`);
      }
    }
  } catch (error: any) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

void discoverPolicies();
