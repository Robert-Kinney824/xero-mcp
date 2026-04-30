import { XeroClientSession } from "../../XeroApiClient.js";
import { IMcpServerTool } from "../IMcpServerTool.js";
import { z } from "zod";

export const GetTrialBalanceTool: IMcpServerTool = {
  requestSchema: {
    name: "get_trial_balance",
    description:
      "Returns the Trial Balance report for the active tenant as of a given date (defaults to today). Optionally filter to payments-only (cash) basis.",
    inputSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "As-of date (YYYY-MM-DD). Defaults to today.",
        },
        paymentsOnly: {
          type: "boolean",
          description:
            "If true, return cash-basis figures. Default false (accrual basis).",
        },
      },
    },
    output: { content: [{ type: "text", text: z.string() }] },
  },
  requestHandler: async (request) => {
    const args = (request.params?.arguments ?? {}) as {
      date?: string;
      paymentsOnly?: boolean;
    };
    const tenantId = XeroClientSession.activeTenantId();
    const response =
      await XeroClientSession.xeroClient.accountingApi.getReportTrialBalance(
        tenantId!,
        args.date,
        args.paymentsOnly ?? false
      );
    const reports = response.body.reports || [];
    return {
      content: [{ type: "text", text: JSON.stringify(reports) }],
    };
  },
};
