import { z } from "zod";
import { XeroClientSession } from "../XeroApiClient.js";
import { IMcpServerTool } from "./IMcpServerTool.js";

type TenantInfo = {
  tenantId: string;
  tenantName: string;
  tenantType?: string;
  active: boolean;
};

const summarizeTenants = (): TenantInfo[] => {
  const tenants = XeroClientSession.xeroClient.tenants ?? [];
  const active = XeroClientSession.activeTenantId();
  return tenants.map((t: any) => ({
    tenantId: t.tenantId,
    tenantName: t.tenantName,
    tenantType: t.tenantType,
    active: t.tenantId === active,
  }));
};

export const ListTenantsTool: IMcpServerTool = {
  requestSchema: {
    name: "list_tenants",
    description:
      "List all Xero tenants (organisations) connected via OAuth. Returns tenantId, tenantName, tenantType, and whether each is the currently active tenant. Use this before switch_tenant to see which Xero companies are available.",
    inputSchema: { type: "object", properties: {} },
    output: { content: [{ type: "text", text: z.string() }] },
  },
  requestHandler: async () => {
    if (!XeroClientSession.isAuthenticated()) {
      return {
        content: [
          {
            type: "text",
            text: "Not authenticated. Run `authenticate` first.",
          },
        ],
      };
    }
    await XeroClientSession.ensureTenantsLoaded();
    const summary = summarizeTenants();
    if (summary.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No tenants connected. Re-run `authenticate` and grant access to one or more Xero organisations.",
          },
        ],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  },
};

export const SwitchTenantTool: IMcpServerTool = {
  requestSchema: {
    name: "switch_tenant",
    description:
      "Switch the active Xero tenant for subsequent API calls. Provide either tenantId (exact UUID) or tenantName (case-insensitive substring match against the tenant's name). Persists across restarts.",
    inputSchema: {
      type: "object",
      properties: {
        tenantId: {
          type: "string",
          description: "Exact Xero tenant UUID (preferred).",
        },
        tenantName: {
          type: "string",
          description:
            "Tenant name or substring (case-insensitive). Used only if tenantId is not provided.",
        },
      },
    },
    output: { content: [{ type: "text", text: z.string() }] },
  },
  requestHandler: async (request) => {
    if (!XeroClientSession.isAuthenticated()) {
      return {
        content: [
          {
            type: "text",
            text: "Not authenticated. Run `authenticate` first.",
          },
        ],
      };
    }
    await XeroClientSession.ensureTenantsLoaded();
    const args = (request.params?.arguments ?? {}) as {
      tenantId?: string;
      tenantName?: string;
    };
    const tenants: any[] = XeroClientSession.xeroClient.tenants ?? [];

    if (tenants.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No tenants connected. Re-run `authenticate`.",
          },
        ],
      };
    }

    let match: any | undefined;
    if (args.tenantId) {
      match = tenants.find((t) => t.tenantId === args.tenantId);
    } else if (args.tenantName) {
      const needle = args.tenantName.toLowerCase();
      const candidates = tenants.filter((t) =>
        String(t.tenantName ?? "")
          .toLowerCase()
          .includes(needle)
      );
      if (candidates.length > 1) {
        return {
          content: [
            {
              type: "text",
              text: `Ambiguous tenantName "${args.tenantName}" matched ${candidates.length} tenants: ${candidates
                .map((t) => t.tenantName)
                .join(", ")}. Use tenantId instead.`,
            },
          ],
        };
      }
      match = candidates[0];
    } else {
      return {
        content: [
          {
            type: "text",
            text: "Provide tenantId or tenantName.",
          },
        ],
      };
    }

    if (!match) {
      return {
        content: [
          {
            type: "text",
            text: `No tenant matched. Available tenants: ${tenants
              .map((t) => `${t.tenantName} (${t.tenantId})`)
              .join(", ")}`,
          },
        ],
      };
    }

    XeroClientSession.setActiveTenantId(match.tenantId);
    return {
      content: [
        {
          type: "text",
          text: `Active tenant set to ${match.tenantName} (${match.tenantId}).`,
        },
      ],
    };
  },
};
