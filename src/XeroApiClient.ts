import { XeroClient } from "xero-node";
import "dotenv/config";
import fs from "fs";
import path from "path";
import os from "os";

const client_id = process.env.XERO_CLIENT_ID;
const client_secret = process.env.XERO_CLIENT_SECRET;
const redirectUrl = process.env.XERO_REDIRECT_URI;
const scopes =
  "offline_access openid profile accounting.settings accounting.contacts accounting.invoices accounting.banktransactions accounting.payments.read accounting.reports.balancesheet.read";

if (!client_id || !client_secret || !redirectUrl) {
  throw Error(
    "Environment Variables not all set - please check your .env file in the project root or create one!"
  );
}

type XeroClientConfig = {
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
  scopes: string[];
};

const SESSION_DIR = path.join(os.homedir(), ".xero-mcp");
const SESSION_FILE = path.join(SESSION_DIR, "session.json");

type PersistedSession = {
  tokenSet?: any;
  activeTenantId?: string;
};

class XeroApiClient {
  xeroClient: XeroClient;
  private _activeTenantId: string | undefined;
  private _tenantsLoaded = false;

  constructor(config: XeroClientConfig) {
    this.xeroClient = new XeroClient({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUris: [config.redirectUrl],
      scopes: config.scopes,
    });
    this.loadSession();
  }

  private loadSession(): void {
    try {
      if (!fs.existsSync(SESSION_FILE)) return;
      const raw = fs.readFileSync(SESSION_FILE, "utf-8");
      const persisted: PersistedSession = JSON.parse(raw);
      if (persisted.tokenSet) {
        this.xeroClient.setTokenSet(persisted.tokenSet);
      }
      if (persisted.activeTenantId) {
        this._activeTenantId = persisted.activeTenantId;
      }
    } catch (err) {
      console.error(
        `[xero-mcp] Could not load persisted session: ${(err as Error).message}`
      );
    }
  }

  saveSession(): void {
    try {
      if (!fs.existsSync(SESSION_DIR)) {
        fs.mkdirSync(SESSION_DIR, { recursive: true, mode: 0o700 });
      }
      const persisted: PersistedSession = {
        tokenSet: this.xeroClient.readTokenSet(),
        activeTenantId: this._activeTenantId,
      };
      fs.writeFileSync(SESSION_FILE, JSON.stringify(persisted, null, 2), {
        mode: 0o600,
      });
    } catch (err) {
      console.error(
        `[xero-mcp] Could not save session: ${(err as Error).message}`
      );
    }
  }

  isAuthenticated(): boolean {
    return this.xeroClient.readTokenSet() ? true : false;
  }

  activeTenantId(): string | undefined {
    return this._activeTenantId;
  }

  setActiveTenantId(tenantId: string): void {
    this._activeTenantId = tenantId;
    this.saveSession();
  }

  async ensureTenantsLoaded(): Promise<void> {
    if (this._tenantsLoaded) return;
    if (!this.isAuthenticated()) return;
    try {
      // Refresh access token if needed before listing tenants.
      const tokenSet = this.xeroClient.readTokenSet();
      if (tokenSet && tokenSet.expired && tokenSet.expired()) {
        const refreshed = await this.xeroClient.refreshToken();
        this.xeroClient.setTokenSet(refreshed);
        this.saveSession();
      }
      await this.xeroClient.updateTenants(false);
      this._tenantsLoaded = true;
    } catch (err) {
      console.error(
        `[xero-mcp] Could not load tenants: ${(err as Error).message}`
      );
    }
  }

  markTenantsLoaded(): void {
    this._tenantsLoaded = true;
  }
}

export const XeroClientSession = new XeroApiClient({
  clientId: client_id,
  clientSecret: client_secret,
  redirectUrl: redirectUrl,
  scopes: scopes.split(" "),
});
