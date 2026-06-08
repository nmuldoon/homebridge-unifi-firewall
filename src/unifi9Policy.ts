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

// Extract the HTTP status from either a UnifiError or the wrapped AxiosError.
function getStatus(error: unknown): number | undefined {
  const e = error as {
    errorCode?: number;
    code?: number;
    status?: number;
    response?: { status?: number };
    exception?: { response?: { status?: number }; status?: number };
    axiosError?: { response?: { status?: number }; status?: number };
  };
  return (
    e?.errorCode ??
    e?.response?.status ??
    e?.exception?.response?.status ??
    e?.exception?.status ??
    e?.axiosError?.response?.status ??
    e?.axiosError?.status ??
    (typeof e?.code === "number" ? e.code : undefined) ??
    e?.status
  );
}

// Build a readable message from a UnifiError/AxiosError, since the default
// `message` field is often the stringified response body ("[object Object]").
function formatError(error: unknown): Error {
  const e = error as {
    response?: { status?: number; statusText?: string; data?: unknown };
    exception?: {
      response?: { status?: number; statusText?: string; data?: unknown };
    };
    axiosError?: {
      response?: { status?: number; statusText?: string; data?: unknown };
    };
    message?: string;
  };
  const response =
    e?.response ?? e?.exception?.response ?? e?.axiosError?.response;
  const status = response?.status;
  const statusText = response?.statusText;
  const data = response?.data;
  let body: string | undefined;
  if (data !== undefined && data !== null) {
    if (typeof data === "string") {
      body = data;
    } else {
      try {
        body = JSON.stringify(data);
      } catch {
        body = String(data);
      }
    }
  }
  const parts: string[] = [];
  if (status) parts.push(`HTTP ${status}${statusText ? ` ${statusText}` : ""}`);
  if (body) parts.push(body);
  if (parts.length === 0 && e?.message && e.message !== "[object Object]") {
    parts.push(e.message);
  }
  if (parts.length === 0) parts.push("Unknown UniFi controller error");
  const formatted = new Error(parts.join(" - "));
  (formatted as Error & { cause?: unknown }).cause = error;
  return formatted;
}

export class UniFi9PolicyManager {
  constructor(
    private controller: Controller,
    private site: Site,
  ) {}

  // Run a request and, if it fails with 401, re-authenticate the controller and
  // retry it once. The UniFi controller can invalidate sessions server-side
  // (controller restart, login from elsewhere, idle timeout) even while the JWT
  // is still within its validity window.
  private async withReauthRetry<T>(
    description: string,
    request: () => Promise<T>,
  ): Promise<T> {
    try {
      return await request();
    } catch (error) {
      if (getStatus(error) !== 401) {
        throw error;
      }
      console.log(
        `${description}: got 401 from UniFi controller, re-authenticating and retrying once`,
      );
      try {
        await this.controller.login();
      } catch (loginError) {
        console.error(
          `${description}: re-authentication failed:`,
          (loginError as Error)?.message ?? loginError,
        );
        throw error;
      }
      return await request();
    }
  }

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
          const response = await this.withReauthRetry(
            `Fetching policies at ${endpoint.url}`,
            () =>
              this.site.getInstance().get(endpoint.url, {
                ...endpoint.options,
                urlParams: {
                  site: this.site.name,
                },
              }),
          );

          const responseData = response.data?.data || response.data;

          if (responseData) {
            console.log(`Found policies at endpoint: ${endpoint.url}`);
            // Handle both single objects and arrays
            return Array.isArray(responseData) ? responseData : [responseData];
          }
        } catch (error) {
          console.log(
            `Endpoint ${endpoint.url} not accessible: ${
              formatError(error).message
            }`,
          );
        }
      }

      return [];
    } catch (error) {
      console.error(
        "Error fetching UniFi 9 policies:",
        formatError(error).message,
      );
      return [];
    }
  }

  async updatePolicy(policyId: string, enabled: boolean): Promise<void> {
    // Use the batch endpoint that the UniFi Controller UI uses
    const batchPayload = [{ _id: policyId, enabled }];

    // The correct endpoint - let unifi-client handle the proxy prefix
    const endpoint = "/firewall-policies/batch";

    try {
      await this.withReauthRetry(`Updating policy ${policyId}`, () =>
        this.site.getInstance().put(endpoint, batchPayload, {
          apiVersion: 2,
          apiPart: true,
          headers: {
            "Content-Type": "application/json",
          },
        }),
      );

      console.log(
        `Successfully updated UniFi 9 policy ${policyId} to ${
          enabled ? "enabled" : "disabled"
        }`,
      );
    } catch (error) {
      const formatted = formatError(error);
      console.error(
        `Error updating UniFi 9 policy ${policyId}:`,
        formatted.message,
      );
      throw formatted;
    }
  }
}
