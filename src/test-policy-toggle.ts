/* eslint-disable */

/**
 * UniFi 9 Policy Toggle Test Script
 *
 * This script allows you to test toggling UniFi 9 firewall policies
 * on/off using the same logic as the homebridge plugin.
 */

import { Controller } from "unifi-client";
import { UniFi9PolicyManager } from "./unifi9Policy";

interface PolicyTestConfig {
  url: string;
  username: string;
  password: string;
  site: string;
  strictSSL: boolean;
}

async function testPolicyToggle(): Promise<void> {
  // Get configuration from command line arguments or environment variables
  const config: PolicyTestConfig = {
    url: process.env.UNIFI_URL || process.argv[2] || "",
    username: process.env.UNIFI_USERNAME || process.argv[3] || "",
    password: process.env.UNIFI_PASSWORD || process.argv[4] || "",
    site: process.env.UNIFI_SITE || process.argv[5] || "default",
    strictSSL: false,
  };

  const command = process.argv[6] || "list"; // list, toggle, enable, disable
  const policyId = process.argv[7] || ""; // policy ID for toggle/enable/disable

  if (!config.url || !config.username || !config.password) {
    console.log(
      "Usage: npm run test-policy-toggle <url> <username> <password> [site] [command] [policyId]"
    );
    console.log(
      "Or set environment variables: UNIFI_URL, UNIFI_USERNAME, UNIFI_PASSWORD, UNIFI_SITE"
    );
    console.log("");
    console.log("Commands:");
    console.log("  list                    - List all available policies");
    console.log("  toggle <policyId>       - Toggle policy on/off");
    console.log("  enable <policyId>       - Enable policy");
    console.log("  disable <policyId>      - Disable policy");
    console.log("");
    console.log("Examples:");
    console.log(
      "  npm run test-policy-toggle https://192.168.1.1 admin password default list"
    );
    console.log(
      "  npm run test-policy-toggle https://192.168.1.1 admin password default toggle 507f1f77bcf86cd799439011"
    );
    process.exit(1);
  }

  try {
    console.log("🔌 Connecting to UniFi Controller...");

    // Set SSL bypass for self-signed certificates
    if (!config.strictSSL) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }

    const controller = new Controller(config);

    // Connect with retry logic similar to the platform
    let connected = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (!connected && attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`📡 Connection attempt ${attempts}/${maxAttempts}...`);
        await controller.login();
        connected = true;
        console.log("✅ Connected successfully!");
      } catch (error) {
        console.log(
          `❌ Connection attempt ${attempts} failed:`,
          (error as Error).message
        );
        if (attempts < maxAttempts) {
          const delay = Math.pow(2, attempts) * 1000; // Exponential backoff
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (!connected) {
      throw new Error("Failed to connect after all retry attempts");
    }

    // Get site
    const sites = await controller.getSites();
    const site = sites.find((s) => s.name === config.site);

    if (!site) {
      console.error(
        `❌ Site '${config.site}' not found. Available sites:`,
        sites.map((s) => s.name)
      );
      return;
    }

    console.log(`🏠 Using site: ${site.name} (${site.desc})`);

    // Create policy manager
    const policyManager = new UniFi9PolicyManager(controller, site);

    // Execute command
    switch (command.toLowerCase()) {
      case "list":
        await listPolicies(policyManager);
        break;
      case "toggle":
        if (!policyId) {
          console.error("❌ Policy ID required for toggle command");
          process.exit(1);
        }
        await togglePolicy(policyManager, policyId);
        break;
      case "enable":
        if (!policyId) {
          console.error("❌ Policy ID required for enable command");
          process.exit(1);
        }
        await setPolicy(policyManager, policyId, true);
        break;
      case "disable":
        if (!policyId) {
          console.error("❌ Policy ID required for disable command");
          process.exit(1);
        }
        await setPolicy(policyManager, policyId, false);
        break;
      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log("Available commands: list, toggle, enable, disable");
        process.exit(1);
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

async function listPolicies(policyManager: UniFi9PolicyManager): Promise<void> {
  console.log("\n📋 Discovering UniFi 9 Firewall Policies...");

  const policies = await policyManager.getPolicies();

  if (policies.length === 0) {
    console.log("❌ No UniFi 9 policies found.");
    console.log("This could mean:");
    console.log("  - You're not running UniFi OS 9.x");
    console.log("  - No firewall policies have been created");
    console.log("  - The API endpoints have changed");
    return;
  }

  console.log(`\n✅ Found ${policies.length} UniFi 9 firewall policies:`);
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  );

  policies.forEach((policy, index) => {
    const status = policy.enabled ? "🟢 ENABLED" : "🔴 DISABLED";
    const action = policy.action ? ` (${policy.action.toUpperCase()})` : "";

    console.log(`${index + 1}. ${policy.name}`);
    console.log(`   ID: ${policy._id}`);
    console.log(`   Status: ${status}${action}`);
    console.log(`   Site: ${policy.site_id || "default"}`);
    console.log("");
  });

  console.log("💡 To toggle a policy, use:");
  console.log(
    `   npm run test-policy-toggle [url] [username] [password] [site] toggle <policy-id>`
  );
}

async function togglePolicy(
  policyManager: UniFi9PolicyManager,
  policyId: string
): Promise<void> {
  console.log(`\n🔄 Toggling policy ${policyId}...`);

  // First get current state
  const policies = await policyManager.getPolicies();
  const policy = policies.find((p) => p._id === policyId);

  if (!policy) {
    console.error(`❌ Policy with ID '${policyId}' not found.`);
    console.log("Available policy IDs:");
    policies.forEach((p) => console.log(`   ${p._id} - ${p.name}`));
    return;
  }

  const currentState = policy.enabled;
  const newState = !currentState;

  console.log(
    `📊 Current state: ${currentState ? "🟢 ENABLED" : "🔴 DISABLED"}`
  );
  console.log(`🎯 Target state: ${newState ? "🟢 ENABLED" : "🔴 DISABLED"}`);

  try {
    await policyManager.updatePolicy(policyId, newState);
    console.log(
      `✅ Successfully toggled policy '${policy.name}' to ${
        newState ? "ENABLED" : "DISABLED"
      }`
    );

    // Verify the change
    console.log("\n🔍 Verifying change...");
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait a second
    const updatedPolicies = await policyManager.getPolicies();
    const updatedPolicy = updatedPolicies.find((p) => p._id === policyId);

    if (updatedPolicy && updatedPolicy.enabled === newState) {
      console.log("✅ Change verified successfully!");
    } else {
      console.log(
        "⚠️  Could not verify change. Check manually in UniFi Controller."
      );
    }
  } catch (error: any) {
    console.error(`❌ Failed to toggle policy:`, error.message);
  }
}

async function setPolicy(
  policyManager: UniFi9PolicyManager,
  policyId: string,
  enabled: boolean
): Promise<void> {
  const action = enabled ? "enable" : "disable";
  console.log(
    `\n${enabled ? "🟢" : "🔴"} ${
      action.charAt(0).toUpperCase() + action.slice(1)
    }ing policy ${policyId}...`
  );

  // First get current state
  const policies = await policyManager.getPolicies();
  const policy = policies.find((p) => p._id === policyId);

  if (!policy) {
    console.error(`❌ Policy with ID '${policyId}' not found.`);
    console.log("Available policy IDs:");
    policies.forEach((p) => console.log(`   ${p._id} - ${p.name}`));
    return;
  }

  const currentState = policy.enabled;

  if (currentState === enabled) {
    console.log(
      `ℹ️  Policy '${policy.name}' is already ${
        enabled ? "ENABLED" : "DISABLED"
      }`
    );
    return;
  }

  console.log(
    `📊 Current state: ${currentState ? "🟢 ENABLED" : "🔴 DISABLED"}`
  );
  console.log(`🎯 Target state: ${enabled ? "🟢 ENABLED" : "🔴 DISABLED"}`);

  try {
    await policyManager.updatePolicy(policyId, enabled);
    console.log(`✅ Successfully ${action}d policy '${policy.name}'`);

    // Verify the change
    console.log("\n🔍 Verifying change...");
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait a second
    const updatedPolicies = await policyManager.getPolicies();
    const updatedPolicy = updatedPolicies.find((p) => p._id === policyId);

    if (updatedPolicy && updatedPolicy.enabled === enabled) {
      console.log("✅ Change verified successfully!");
    } else {
      console.log(
        "⚠️  Could not verify change. Check manually in UniFi Controller."
      );
    }
  } catch (error: any) {
    console.error(`❌ Failed to ${action} policy:`, error.message);
  }
}

// Run the test
testPolicyToggle().catch(console.error);
