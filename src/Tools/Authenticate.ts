import { XeroClientSession } from "../XeroApiClient.js";
import { IMcpServerTool } from "./IMcpServerTool.js";
import { z } from "zod";
import http from "http";
import open from "open";
import { Result } from "@modelcontextprotocol/sdk/types.js";

export const AuthenticateTool: IMcpServerTool = {
  requestSchema: {
    name: "authenticate",
    description: "Authenticate with Xero using OAuth2",
    inputSchema: { type: "object", properties: {} },
    output: { content: [{ type: "text", text: z.string() }] },
  },
  requestHandler: async () => {
    const consentUrl = await XeroClientSession.xeroClient.buildConsentUrl();
    const server = http.createServer();
    server.listen(process.env.PORT || 5000);
    const oauth2Process = await open(consentUrl);

    const authTask = new Promise<Result>((resolve, reject) => {
      server.on("request", async (req, res) => {
        if (req.url && req.url.includes("/callback")) {
          try {
            const tokenSet = await XeroClientSession.xeroClient.apiCallback(
              req.url
            );
            XeroClientSession.xeroClient.setTokenSet(tokenSet);
            await XeroClientSession.xeroClient.updateTenants(false);
            XeroClientSession.markTenantsLoaded();
            const tenants = XeroClientSession.xeroClient.tenants ?? [];
            const previousActive = XeroClientSession.activeTenantId();
            const previousStillValid =
              previousActive &&
              tenants.some((t: any) => t.tenantId === previousActive);
            if (!previousStillValid && tenants.length > 0) {
              XeroClientSession.setActiveTenantId(tenants[0].tenantId);
            }
            XeroClientSession.saveSession();

            // Render a friendly success page in the browser tab.
            try {
              res.writeHead(200, { "Content-Type": "text/html" });
              res.end(
                `<!doctype html><html><body style="font-family:system-ui;padding:2em">` +
                  `<h2>Xero auth complete</h2>` +
                  `<p>${tenants.length} tenant(s) connected. You can close this tab.</p>` +
                  `<ul>${tenants
                    .map(
                      (t: any) =>
                        `<li>${t.tenantName} <code>(${t.tenantId})</code></li>`
                    )
                    .join("")}</ul>` +
                  `</body></html>`
              );
            } catch {}

            const tenantList = tenants
              .map(
                (t: any) =>
                  `  - ${t.tenantName} (${t.tenantId})${
                    t.tenantId === XeroClientSession.activeTenantId()
                      ? " [active]"
                      : ""
                  }`
              )
              .join("\n");
            const summary =
              tenants.length === 0
                ? "Authenticated, but no Xero organisations were granted."
                : tenants.length === 1
                  ? `Authenticated successfully. Active tenant: ${tenants[0].tenantName}`
                  : `Authenticated successfully. ${tenants.length} tenants connected:\n${tenantList}\n\nUse \`switch_tenant\` to change the active tenant.`;

            resolve({
              content: [
                {
                  type: "text",
                  text: summary,
                },
              ],
            });
          } catch (error: any) {
            reject({
              content: [
                {
                  type: "text",
                  text: `Error authenticating user: ${error.message}`,
                },
              ],
            });
          } finally {
            server.close();
            oauth2Process.kill();
          }
        }
      });
    });

    return authTask;
  },
};
