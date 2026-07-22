import type { Account, Transaction } from '../types';

export const getAccountBalance = (account: Account, transactions: Transaction[]) =>
  transactions.reduce((balance, transaction) => {
    if (transaction.type === 'income' && transaction.accountId === account.id) return balance + transaction.amount;
    if (transaction.type === 'expense' && transaction.accountId === account.id) return balance - transaction.amount;
    if (transaction.type === 'transfer' && transaction.accountId === account.id) return balance - transaction.amount;
    if (transaction.type === 'transfer' && transaction.toAccountId === account.id) return balance + transaction.amount;
    return balance;
  }, account.openingBalance);

export const getMonthTotals = (transactions: Transaction[], monthKey: string) =>
  transactions
    .filter((transaction) => transaction.date.startsWith(monthKey))
    .reduce(
      (totals, transaction) => {
        if (transaction.type === 'income') totals.income += transaction.amount;
        if (transaction.type === 'expense') totals.expense += transaction.amount;
        return totals;
      },
      { income: 0, expense: 0 }
    );
