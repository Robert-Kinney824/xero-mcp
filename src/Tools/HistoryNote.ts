import { XeroClientSession } from "../XeroApiClient.js";
import { IMcpServerTool } from "./IMcpServerTool.js";
import { z } from "zod";

// Map of supported entity types → which xero-node method handles their History endpoint.
// Keep this conservative: list only the entity types we actually have other read/write
// tools for, to avoid surprising the LLM with rarely-used surfaces.
type EntityType =
  | "bank_transaction"
  | "contact"
  | "credit_note"
  | "invoice"
  | "manual_journal"
  | "payment"
  | "quote";

const ENTITY_LABELS: Record<EntityType, string> = {
  bank_transaction: "bank transaction",
  contact: "contact",
  credit_note: "credit note",
  invoice: "invoice",
  manual_journal: "manual journal",
  payment: "payment",
  quote: "quote",
};

export const AddHistoryNoteTool: IMcpServerTool = {
  requestSchema: {
    name: "add_history_note",
    description:
      "Adds a free-text history note to a Xero record (invoice, bank transaction, contact, payment, manual journal, credit note, or quote). The note appears in the record's History & Notes panel in Xero web/mobile, with a timestamp and the user identity. Use this to annotate transactions with context (\"why this hit,\" \"matched to receipt X,\" \"reconciled against statement Y\") so the explanation persists alongside the record. Notes are append-only and cannot be edited or deleted via the API.",
    inputSchema: {
      type: "object",
      properties: {
        entityType: {
          type: "string",
          enum: [
            "bank_transaction",
            "contact",
            "credit_note",
            "invoice",
            "manual_journal",
            "payment",
            "quote",
          ],
          description:
            "Which kind of Xero record the note attaches to. Must match the record's actual type.",
        },
        entityId: {
          type: "string",
          description:
            "The Xero UUID of the record. Get this from list_invoices, list_bank_transactions, list_contacts, etc.",
        },
        note: {
          type: "string",
          description:
            "The free-text note. Will appear verbatim in Xero's History & Notes panel. Max ~2000 chars (Xero limit).",
        },
      },
      required: ["entityType", "entityId", "note"],
    },
    output: { content: [{ type: "text", text: z.string() }] },
  },
  requestHandler: async (request) => {
    const args = (request.params?.arguments ?? {}) as {
      entityType?: EntityType;
      entityId?: string;
      note?: string;
    };

    if (!args.entityType || !args.entityId || !args.note) {
      return {
        content: [
          {
            type: "text",
            text: "entityType, entityId, and note are all required.",
          },
        ],
      };
    }
    if (!(args.entityType in ENTITY_LABELS)) {
      return {
        content: [
          {
            type: "text",
            text: `Unsupported entityType '${args.entityType}'. Supported: ${Object.keys(ENTITY_LABELS).join(", ")}.`,
          },
        ],
      };
    }
    if (args.note.length > 2000) {
      return {
        content: [
          {
            type: "text",
            text: `Note is ${args.note.length} chars; Xero caps history records at ~2000 chars. Shorten and retry.`,
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

    const accountingApi = XeroClientSession.xeroClient.accountingApi as any;
    const historyRecords = { historyRecords: [{ details: args.note }] };

    try {
      switch (args.entityType) {
        case "bank_transaction":
          await accountingApi.createBankTransactionHistoryRecord(
            tenantId,
            args.entityId,
            historyRecords
          );
          break;
        case "contact":
          await accountingApi.createContactHistory(
            tenantId,
            args.entityId,
            historyRecords
          );
          break;
        case "credit_note":
          await accountingApi.createCreditNoteHistory(
            tenantId,
            args.entityId,
            historyRecords
          );
          break;
        case "invoice":
          await accountingApi.createInvoiceHistory(
            tenantId,
            args.entityId,
            historyRecords
          );
          break;
        case "manual_journal":
          await accountingApi.createManualJournalHistoryRecord(
            tenantId,
            args.entityId,
            historyRecords
          );
          break;
        case "payment":
          await accountingApi.createPaymentHistory(
            tenantId,
            args.entityId,
            historyRecords
          );
          break;
        case "quote":
          await accountingApi.createQuoteHistory(
            tenantId,
            args.entityId,
            historyRecords
          );
          break;
      }
    } catch (err: any) {
      const xeroBody = err?.response?.body
        ? `\nXero response: ${JSON.stringify(err.response.body)}`
        : "";
      return {
        content: [
          {
            type: "text",
            text: `Failed to add history note: ${err?.message ?? String(err)}${xeroBody}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Note added to ${ENTITY_LABELS[args.entityType]} ${args.entityId}. View it in Xero's History & Notes panel for that record.`,
        },
      ],
    };
  },
};
