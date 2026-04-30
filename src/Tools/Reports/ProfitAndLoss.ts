import { XeroClientSession } from "../../XeroApiClient.js";
import { IMcpServerTool } from "../IMcpServerTool.js";
import { z } from "zod";

type Timeframe = "MONTH" | "QUARTER" | "YEAR";

export const GetProfitAndLossTool: IMcpServerTool = {
  requestSchema: {
    name: "get_profit_and_loss",
    description:
      "Returns the Profit & Loss (income statement) report for the active tenant. Use periods + timeframe to get multi-column comparison reports. Note: Xero limits periods to 1-12; for longer ranges, call multiple times with different toDates.",
    inputSchema: {
      type: "object",
      properties: {
        fromDate: {
          type: "string",
          description:
            "Start date (YYYY-MM-DD). If omitted with toDate also omitted, Xero defaults to current month.",
        },
        toDate: {
          type: "string",
          description:
            "End date (YYYY-MM-DD). If omitted, Xero defaults to today.",
        },
        periods: {
          type: "integer",
          description:
            "Number of additional comparison periods (1-12). Combined with timeframe, produces multi-column reports. e.g. periods=11 + timeframe=MONTH = 12 monthly columns ending at toDate.",
          minimum: 1,
          maximum: 12,
        },
        timeframe: {
          type: "string",
          enum: ["MONTH", "QUARTER", "YEAR"],
          description:
            "Period unit when periods > 0. Defaults to MONTH if periods is set.",
        },
        paymentsOnly: {
          type: "boolean",
          description:
            "If true, return cash-basis report. Default false (accrual basis).",
        },
        standardLayout: {
          type: "boolean",
          description: "Use Xero's standard layout. Default true.",
        },
      },
    },
    output: { content: [{ type: "text", text: z.string() }] },
  },
  requestHandler: async (request) => {
    const args = (request.params?.arguments ?? {}) as {
      fromDate?: string;
      toDate?: string;
      periods?: number;
      timeframe?: Timeframe;
      paymentsOnly?: boolean;
      standardLayout?: boolean;
    };

    const tenantId = XeroClientSession.activeTenantId();
    if (!tenantId) {
      return {
        content: [
          {
            type: "text",
            text: "No active tenant. Use list_tenants then switch_tenant.",
          },
        ],
      };
    }

    const response =
      await XeroClientSession.xeroClient.accountingApi.getReportProfitAndLoss(
        tenantId,
        args.fromDate,
        args.toDate,
        args.periods,
        args.timeframe ?? (args.periods ? "MONTH" : undefined),
        undefined, // trackingCategoryID
        undefined, // trackingCategoryID2
        undefined, // trackingOptionID
        undefined, // trackingOptionID2
        args.standardLayout ?? true,
        args.paymentsOnly ?? false
      );
    const reports = response.body.reports || [];
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(reports),
        },
      ],
    };
  },
};
