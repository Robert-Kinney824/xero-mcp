import { XeroClientSession } from "../../XeroApiClient.js";
import { IMcpServerTool } from "../IMcpServerTool.js";
import { z } from "zod";

export const GetBankSummaryTool: IMcpServerTool = {
  requestSchema: {
    name: "get_bank_summary",
    description:
      "Returns the Bank Summary report for the active tenant, showing cash position and bank account activity over a date range.",
    inputSchema: {
      type: "object",
      properties: {
        fromDate: {
          type: "string",
          description: "Start date (YYYY-MM-DD).",
        },
        toDate: {
          type: "string",
          description: "End date (YYYY-MM-DD). Defaults to today.",
        },
      },
    },
    output: { content: [{ type: "text", text: z.string() }] },
  },
  requestHandler: async (request) => {
    const args = (request.params?.arguments ?? {}) as {
      fromDate?: string;
      toDate?: string;
    };
    const tenantId = XeroClientSession.activeTenantId();
    const response =
      await XeroClientSession.xeroClient.accountingApi.getReportBankSummary(
        tenantId!,
        args.fromDate,
        args.toDate
      );
    const reports = response.body.reports || [];
    return {
      content: [{ type: "text", text: JSON.stringify(reports) }],
    };
  },
};
