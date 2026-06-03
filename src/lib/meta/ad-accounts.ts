export type MetaAdAccount = {
  id: string;
  name: string;
  account_id: string;
  currency: string;
  status: string;
};

export const mockMetaAdAccounts: MetaAdAccount[] = [
  {
    id: "acct_001",
    name: "Acme Retail",
    account_id: "act_1001",
    currency: "USD",
    status: "active",
  },
  {
    id: "acct_002",
    name: "Northwind Commerce",
    account_id: "act_1002",
    currency: "USD",
    status: "active",
  },
  {
    id: "acct_003",
    name: "Summit Labs",
    account_id: "act_1003",
    currency: "EUR",
    status: "pending",
  },
];

export function getMockMetaAdAccounts(): MetaAdAccount[] {
  return mockMetaAdAccounts;
}