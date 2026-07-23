import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { addMonths, format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, ChevronLeft, ChevronRight, Landmark, Pencil, Plus, ReceiptText, Trash2, WalletCards } from 'lucide-react';
import { useAppStore } from '../store/AppStore';
import { AccountModal } from '../components/AccountModal';
import { TransactionModal } from '../components/TransactionModal';
import { BudgetModal } from '../components/BudgetModal';
import { formatCurrency, toMonthKey } from '../lib/format';
import { getAccountBalance, getMonthTotals } from '../lib/finance';
import type { Account, Budget, Transaction } from '../types';
import { consumePendingFocus } from '../lib/navigation';

export const FinancePage = () => {
  const { data, addTransaction, toggleTask, deleteTransaction, deleteAccount, deleteBudget } = useAppStore();
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [monthKey, setMonthKey] = useState(() => toMonthKey());
  const [transactionPage, setTransactionPage] = useState(0);
  const monthDate = parseISO(`${monthKey}-01`);
  const totals = getMonthTotals(data.transactions, monthKey);
  const accounts = data.accounts.map((account) => ({ ...account, balance: getAccountBalance(account, data.transactions) }));
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

  const monthExpensesByCategory = useMemo(() => {
    return data.transactions
      .filter((transaction) => transaction.type === 'expense' && transaction.date.startsWith(monthKey))
      .reduce<Record<string, number>>((accumulator, transaction) => {
        const categoryKey = transaction.category.trim().toLocaleLowerCase('id-ID');
        accumulator[categoryKey] = (accumulator[categoryKey] ?? 0) + transaction.amount;
        return accumulator;
      }, {});
  }, [data.transactions, monthKey]);

  const monthTransactions = data.transactions
    .filter((transaction) => transaction.date.startsWith(monthKey))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const pageSize = 20;
  const transactionPages = Math.max(1, Math.ceil(monthTransactions.length / pageSize));
  const transactions = monthTransactions.slice(transactionPage * pageSize, (transactionPage + 1) * pageSize);
  const upcomingBills = data.tasks
    .filter((task) => task.status === 'todo' && task.labels.some((label) => label.toLocaleLowerCase('id-ID') === 'tagihan'))
    .sort((a, b) => (a.deadlineAt ?? a.dueAt ?? '9999').localeCompare(b.deadlineAt ?? b.dueAt ?? '9999'))
    .slice(0, 4);

  useEffect(() => {
    setTransactionPage(0);
  }, [monthKey]);

  useEffect(() => {
    const focusId = consumePendingFocus('finance');
    if (!focusId) return;
    const transaction = data.transactions.find((item) => item.id === focusId);
    if (transaction) {
      setMonthKey(transaction.date.slice(0, 7));
      setEditingTransaction(transaction);
      setTransactionOpen(true);
    }
  }, [data.transactions]);

  const moveMonth = (offset: number) => setMonthKey(toMonthKey(addMonths(monthDate, offset)));

  const openNewTransaction = () => {
    setEditingTransaction(null);
    setTransactionOpen(true);
  };

  const openNewAccount = () => {
    setEditingAccount(null);
    setAccountOpen(true);
  };

  const openNewBudget = () => {
    setEditingBudget(null);
    setBudgetOpen(true);
  };

  const removeAccount = (account: Account) => {
    if (!window.confirm(`Hapus rekening “${account.name}”? Rekening hanya dapat dihapus jika belum dipakai transaksi.`)) return;
    const deleted = deleteAccount(account.id);
    if (!deleted) window.alert('Rekening tidak dapat dihapus karena masih digunakan oleh transaksi. Hapus atau pindahkan transaksi terkait terlebih dahulu.');
  };

  const payBill = (task: (typeof data.tasks)[number]) => {
    if (!task.billAmount || !task.billAccountId) return;
    const account = data.accounts.find((item) => item.id === task.billAccountId);
    if (!account) return;
    if (!window.confirm(`Catat pembayaran ${task.title} sebesar ${formatCurrency(task.billAmount)} dari ${account.name}?`)) return;
    addTransaction({
      type: 'expense',
      amount: task.billAmount,
      accountId: task.billAccountId,
      category: task.billCategory ?? 'Tagihan',
      note: task.title,
      date: format(new Date(), 'yyyy-MM-dd')
    });
    toggleTask(task.id);
  };

  return (
    <div className="page-stack">
      <section className="finance-hero">
        <div><span>Total saldo</span><strong>{formatCurrency(totalBalance)}</strong><p>{accounts.length} rekening aktif · diperbarui dari seluruh mutasi</p></div>
        <div className="finance-hero-actions"><button className="light-button" onClick={openNewTransaction}><Plus size={17} /> Transaksi</button><button className="ghost-light-button" onClick={openNewAccount}>Tambah rekening</button></div>
      </section>

      <section className="metric-grid three-metrics finance-metrics">
        <article className="metric-card month-selector-card">
          <div className="month-selector">
            <button className="icon-button" onClick={() => moveMonth(-1)} aria-label="Bulan sebelumnya"><ChevronLeft size={17} /></button>
            <div><span>Periode</span><strong>{format(monthDate, 'MMMM yyyy', { locale: id })}</strong></div>
            <button className="icon-button" onClick={() => moveMonth(1)} aria-label="Bulan berikutnya"><ChevronRight size={17} /></button>
          </div>
          {monthKey !== toMonthKey() && <button className="text-button" onClick={() => setMonthKey(toMonthKey())}>Kembali ke bulan ini</button>}
        </article>
        <article className="metric-card"><div className="metric-icon income-icon"><ArrowDownLeft size={20} /></div><span>Pemasukan</span><strong>{formatCurrency(totals.income)}</strong><p>{totals.expense ? `${Math.round((totals.expense / Math.max(1, totals.income)) * 100)}% terpakai` : 'Belum ada pengeluaran'}</p></article>
        <article className="metric-card"><div className="metric-icon expense-icon"><ArrowUpRight size={20} /></div><span>Pengeluaran</span><strong>{formatCurrency(totals.expense)}</strong><p>Selisih {formatCurrency(totals.income - totals.expense)}</p></article>
      </section>

      <section className="account-grid">
        {accounts.map((account) => (
          <article className="account-card" key={account.id} style={{ '--account-color': account.color } as CSSProperties}>
            <div className="account-card-top"><div><Landmark size={19} /><span>{account.type === 'cash' ? 'Tunai' : account.type === 'ewallet' ? 'E-Wallet' : 'Bank'}</span></div><div className="row-actions always-visible"><button className="row-action-button" onClick={() => { setEditingAccount(account); setAccountOpen(true); }} aria-label="Edit rekening"><Pencil size={13} /></button><button className="row-action-button danger" onClick={() => removeAccount(account)} aria-label="Hapus rekening"><Trash2 size={13} /></button></div></div>
            <strong>{account.name}</strong>
            <p>{formatCurrency(account.balance)}</p>
          </article>
        ))}
        <button className="account-add-card" onClick={openNewAccount}><Plus size={20} /><span>Tambah rekening</span></button>
      </section>

      <div className="content-split finance-split">
        <section className="panel">
          <div className="panel-header"><div><h3>Transaksi terbaru</h3><p>Transfer tidak dihitung sebagai pemasukan atau pengeluaran.</p></div><button className="text-button" onClick={openNewTransaction}><Plus size={14} /> Tambah</button></div>
          <div className="transaction-list">
            {transactions.map((transaction) => {
              const account = data.accounts.find((item) => item.id === transaction.accountId);
              const Icon = transaction.type === 'income' ? ArrowDownLeft : transaction.type === 'expense' ? ArrowUpRight : ArrowRightLeft;
              return (
                <article className="transaction-row" key={transaction.id}>
                  <div className={`transaction-icon ${transaction.type}`}><Icon size={17} /></div>
                  <div className="transaction-copy"><strong>{transaction.note}</strong><span>{transaction.category} · {account?.name ?? 'Rekening dihapus'} · {format(parseISO(transaction.date), 'd MMM', { locale: id })}</span></div>
                  <strong className={transaction.type === 'income' ? 'positive' : transaction.type === 'expense' ? 'negative' : ''}>{transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}{formatCurrency(transaction.amount)}</strong>
                  <div className="row-actions always-visible"><button className="row-action-button" onClick={() => { setEditingTransaction(transaction); setTransactionOpen(true); }} aria-label="Edit transaksi"><Pencil size={13} /></button><button className="row-action-button danger" onClick={() => { if (window.confirm(`Hapus transaksi “${transaction.note}”?`)) deleteTransaction(transaction.id); }} aria-label="Hapus transaksi"><Trash2 size={13} /></button></div>
                </article>
              );
            })}
            {monthTransactions.length === 0 && <div className="empty-state"><ReceiptText size={26} /><strong>Belum ada transaksi</strong><p>Tidak ada transaksi pada {format(monthDate, 'MMMM yyyy', { locale: id })}.</p></div>}
          </div>
          {transactionPages > 1 && (
            <div className="pagination-controls">
              <button className="secondary-button" disabled={transactionPage === 0} onClick={() => setTransactionPage((page) => page - 1)}>Sebelumnya</button>
              <span>Halaman {transactionPage + 1} dari {transactionPages}</span>
              <button className="secondary-button" disabled={transactionPage + 1 >= transactionPages} onClick={() => setTransactionPage((page) => page + 1)}>Berikutnya</button>
            </div>
          )}
        </section>

        <aside className="right-stack">
          <section className="panel">
            <div className="panel-header"><div><h3>Anggaran kategori</h3><p>Batas sederhana untuk keputusan bulanan.</p></div><button className="text-button" onClick={openNewBudget}><Plus size={14} /> Tambah</button></div>
            <div className="budget-list">
              {data.budgets.filter((budget) => budget.month === monthKey).map((budget) => {
                const spent = monthExpensesByCategory[budget.category.trim().toLocaleLowerCase('id-ID')] ?? 0;
                const percentage = Math.min(100, Math.round((spent / budget.limit) * 100));
                return (
                  <article key={budget.id} className="budget-row">
                    <div className="budget-row-heading"><div><strong>{budget.category}</strong><span>{formatCurrency(spent)} dari {formatCurrency(budget.limit)}</span></div><div className="row-actions always-visible"><button className="row-action-button" onClick={() => { setEditingBudget(budget); setBudgetOpen(true); }} aria-label="Edit anggaran"><Pencil size={12} /></button><button className="row-action-button danger" onClick={() => { if (window.confirm(`Hapus anggaran ${budget.category}?`)) deleteBudget(budget.id); }} aria-label="Hapus anggaran"><Trash2 size={12} /></button></div></div>
                    <strong>{percentage}%</strong>
                    <div className="progress-track"><i className={percentage >= 90 ? 'danger-progress' : ''} style={{ width: `${percentage}%` }} /></div>
                  </article>
                );
              })}
              {data.budgets.filter((budget) => budget.month === monthKey).length === 0 && <div className="empty-state compact"><ReceiptText size={23} /><strong>Belum ada anggaran</strong><p>Tambahkan batas kategori untuk bulan ini.</p></div>}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header"><div><h3>Tagihan mendatang</h3><p>Tagihan memakai recurrence engine tugas.</p></div></div>
            {upcomingBills.length ? (
              <div className="bill-list">
                {upcomingBills.map((task) => (
                  <article key={task.id}>
                    <div>
                      <strong>{task.title}</strong>
                      <span>
                        {task.deadlineAt
                          ? `Deadline ${format(parseISO(task.deadlineAt), 'd MMM yyyy', { locale: id })}`
                          : task.dueAt
                            ? `Jadwal ${format(parseISO(task.dueAt), 'd MMM yyyy', { locale: id })}`
                            : 'Tanpa tanggal'}
                        {task.billAmount ? ` · ${formatCurrency(task.billAmount)}` : ''}
                      </span>
                    </div>
                    {task.billAmount && task.billAccountId
                      ? <button className="secondary-button small-button" onClick={() => payBill(task)}>Bayar</button>
                      : <span>{task.recurrence ? 'Berulang' : 'Lengkapi detail'}</span>}
                  </article>
                ))}
              </div>
            ) : <div className="empty-state compact"><ReceiptText size={24} /><strong>Belum ada tagihan</strong><p>Buat tugas dengan label “tagihan”.</p></div>}
          </section>
        </aside>
      </div>

      <TransactionModal open={transactionOpen} transaction={editingTransaction} onClose={() => { setTransactionOpen(false); setEditingTransaction(null); }} />
      <AccountModal open={accountOpen} account={editingAccount} onClose={() => { setAccountOpen(false); setEditingAccount(null); }} />
      <BudgetModal open={budgetOpen} budget={editingBudget} defaultMonth={monthKey} onClose={() => { setBudgetOpen(false); setEditingBudget(null); }} />
    </div>
  );
};
