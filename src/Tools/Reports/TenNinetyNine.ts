import { XeroClientSession } from "../../XeroApiClient.js";
import { IMcpServerTool } from "../IMcpServerTool.js";
import { z } from "zod";

export const GetTenNinetyNineTool: IMcpServerTool = {
  requestSchema: {
    name: "get_ten_ninety_nine",
    description:
      "Returns the 1099 report for the active tenant for a given calendar year (US-only). Lists vendors and amounts that may require 1099 reporting.",
    inputSchema: {
      type: "object",
      properties: {
        reportYear: {
          type: "string",
          description: "Calendar year (e.g. \"2025\"). Defaults to last year.",
        },
      },
    },
    output: { content: [{ type: "text", text: z.string() }] },
  },
  requestHandler: async (request) => {
    const args = (request.params?.arguments ?? {}) as { reportYear?: string };
    const tenantId = XeroClientSession.activeTenantId();
    const response =
      await XeroClientSession.xeroClient.accountingApi.getReportTenNinetyNine(
        tenantId!,
        args.reportYear
      );
    const reports = response.body.reports || [];
    return {
      content: [{ type: "text", text: JSON.stringify(reports) }],
    };
  },
};
