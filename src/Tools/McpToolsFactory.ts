import { ListAccountsTool } from "./Accounting/Accounts.js";
import { AuthenticateTool } from "./Authenticate.js";
import { AddHistoryNoteTool } from "./HistoryNote.js";
import {
  CreateBankTransactionsTool,
  GetBankTransactionTool,
  ListBankTransactionsTool,
  UpdateBankTransactionTool,
} from "./Accounting/BankTransactions.js";
import { CreateContactsTool, ListContactsTool } from "./Accounting/Contacts.js";
import { IMcpServerTool } from "./IMcpServerTool.js";
import {
  GetInvoiceTool,
  ListInvoicesTool,
  UpdateInvoiceTool,
} from "./Accounting/Invoices.js";
import { ListJournalsTool } from "./Accounting/Journals.js";
import { ListOrganisationsTool } from "./Accounting/Organisations.js";
import { ListPaymentsTool } from "./Accounting/Payments.js";
import { ListQuotesTool } from "./Accounting/Quotes.js";
import { GetBalanceSheetTool } from "./Reports/BalanceSheet.js";
import { GetBankSummaryTool } from "./Reports/BankSummary.js";
import { GetExecutiveSummaryTool } from "./Reports/ExecutiveSummary.js";
import { GetProfitAndLossTool } from "./Reports/ProfitAndLoss.js";
import { GetTenNinetyNineTool } from "./Reports/TenNinetyNine.js";
import { GetTrialBalanceTool } from "./Reports/TrialBalance.js";
import { ListTenantsTool, SwitchTenantTool } from "./Tenants.js";

export const McpToolsFactory = (function () {
  const tools: IMcpServerTool[] = [
    AddHistoryNoteTool,
    AuthenticateTool,
    CreateBankTransactionsTool,
    CreateContactsTool,
    GetBalanceSheetTool,
    GetBankSummaryTool,
    GetBankTransactionTool,
    GetExecutiveSummaryTool,
    GetInvoiceTool,
    GetProfitAndLossTool,
    GetTenNinetyNineTool,
    GetTrialBalanceTool,
    ListAccountsTool,
    ListBankTransactionsTool,
    ListContactsTool,
    ListInvoicesTool,
    ListJournalsTool,
    ListOrganisationsTool,
    ListPaymentsTool,
    ListQuotesTool,
    ListTenantsTool,
    SwitchTenantTool,
    UpdateBankTransactionTool,
    UpdateInvoiceTool,
    // register new tools here alphabetically
  ];

  return {
    getAllTools: function () {
      return tools.slice();
    },
    findToolByName: function (name: string) {
      return tools.find((tool) => tool.requestSchema.name === name);
    },
  };
})();
