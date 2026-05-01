import { XeroClientSession } from "../../XeroApiClient.js";
import { IMcpServerTool } from "../IMcpServerTool.js";
import { z } from "zod";
import { Contacts } from "xero-node";
import { parseArrayValues } from "../../Utils/parseArrayValues.js";
import { convertToCamelCase } from "../../Utils/convertToCamelCase.js";
import { sanitizeObject } from "../../Utils/sanitizeValues.js";

export const UpdateContactTool: IMcpServerTool = {
  requestSchema: {
    name: "update_contact",
    description:
      "Updates an existing Xero contact (customer or supplier). Pass only the fields you want to change. Use this to: rename a contact, update email/phone/address, set tax number (EIN/SSN — required for 1099 vendors), change default account codes, change payment terms, or archive a contact (set contactStatus to ARCHIVED). To MERGE two contacts (move all transactions from contact A to contact B and archive A), use Xero's web UI — the API does not expose a merge endpoint.",
    inputSchema: {
      type: "object",
      properties: {
        contactID: {
          type: "string",
          description:
            "Xero UUID of the contact to update. Get from list_contacts.",
        },
        contact: {
          type: "object",
          description:
            "Partial Contact object containing only the fields to update. Common fields: name, firstName, lastName, emailAddress, taxNumber, accountNumber, contactStatus (\"ACTIVE\" | \"ARCHIVED\"), defaultCurrency, paymentTerms, addresses, phones, accountsReceivableTaxType, accountsPayableTaxType, salesDefaultAccountCode, purchasesDefaultAccountCode. See Xero Contact API for full schema.",
          additionalProperties: true,
        },
      },
      required: ["contactID", "contact"],
    },
    output: { content: [{ type: "text", text: z.string() }] },
  },
  requestHandler: async (request) => {
    const args = (request.params?.arguments ?? {}) as {
      contactID?: string;
      contact?: Record<string, unknown>;
    };
    if (!args.contactID || !args.contact) {
      return {
        content: [
          {
            type: "text",
            text: "contactID and contact are both required.",
          },
        ],
      };
    }

    const tenantId = XeroClientSession.activeTenantId();
    if (!tenantId) {
      return {
        content: [
          {
            type: "text",
            text: "No active tenant. Use switch_tenant first.",
          },
        ],
      };
    }

    // Wrap in the Contacts envelope Xero expects.
    const parsed = parseArrayValues({ contacts: [args.contact] });
    const contacts: Contacts = convertToCamelCase(parsed);

    try {
      const response =
        await XeroClientSession.xeroClient.accountingApi.updateContact(
          tenantId,
          args.contactID,
          sanitizeObject(contacts)
        );
      return {
        content: [{ type: "text", text: JSON.stringify(response.body) }],
      };
    } catch (err: any) {
      const xeroBody = err?.response?.body
        ? `\nXero response: ${JSON.stringify(err.response.body)}`
        : "";
      return {
        content: [
          {
            type: "text",
            text: `Failed to update contact: ${err?.message ?? String(err)}${xeroBody}`,
          },
        ],
      };
    }
  },
};
