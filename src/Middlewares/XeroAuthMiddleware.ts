import { XeroClientSession } from "../XeroApiClient.js";
import { AuthenticateTool } from "../Tools/Authenticate.js";
import { IRequestMiddleware } from "./IRequestMiddleware.js";

// Tools that require authentication but do NOT require an active tenant.
const TENANT_OPTIONAL_TOOLS = new Set<string>([
  "list_tenants",
  "switch_tenant",
]);

export const XeroAuthMiddleware: IRequestMiddleware = async (request, next) => {
  const { name } = request.params;
  if (name === AuthenticateTool.requestSchema.name) {
    return await AuthenticateTool.requestHandler(request);
  }
  if (!XeroClientSession.isAuthenticated()) {
    return Promise.resolve({
      content: [
        {
          type: "text",
          text: "You must authenticate with Xero first",
        },
      ],
    });
  }

  // Refresh the access token if expired (or about to expire).
  // This must happen before any tool handler runs so subsequent API calls
  // never hit Xero with a stale Bearer token.
  try {
    await XeroClientSession.ensureFreshToken();
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: `Token refresh failed: ${(err as Error).message}. Re-run \`authenticate\`.`,
        },
      ],
    };
  }

  if (TENANT_OPTIONAL_TOOLS.has(name)) {
    return next(request);
  }
  const tenantId = XeroClientSession.activeTenantId();
  if (!tenantId) {
    throw new Error(
      "No tenant selected. Use `list_tenants` then `switch_tenant`."
    );
  }
  return next(request);
};
