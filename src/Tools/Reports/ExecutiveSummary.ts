import { XeroClientSession } from "../../XeroApiClient.js";
import { IMcpServerTool } from "../IMcpServerTool.js";
import { z } from "zod";

export const GetExecutiveSummaryTool: IMcpServerTool = {
  requestSchema: {
    name: "get_executive_summary",
    description:
      "Returns the Executive Summary report for the active tenant — a high-level snapshot of cash, revenue, profitability, and key ratios.",
    inputSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "As-of date (YYYY-MM-DD). Defaults to today.",
        },
      },
    },
    output: { content: [{ type: "text", text: z.string() }] },
  },
  requestHandler: async (request) => {
    const args = (request.params?.arguments ?? {}) as { date?: string };
    const tenantId = XeroClientSession.activeTenantId();
    const response =
      await XeroClientSession.xeroClient.accountingApi.getReportExecutiveSummary(
        tenantId!,
        args.date
      );
    const reports = response.body.reports || [];
    return {
      content: [{ type: "text", text: JSON.stringify(reports) }],
    };
  },
};
