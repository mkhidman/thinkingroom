import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);

export const formatDate = (value: string | Date, pattern = 'd MMM yyyy') =>
  format(typeof value === 'string' ? parseISO(value) : value, pattern, { locale: id });

export const toDateInput = (date = new Date()) => format(date, 'yyyy-MM-dd');
export const toMonthKey = (date = new Date()) => format(date, 'yyyy-MM');
export const toDayKey = (date = new Date()) => format(date, 'yyyy-MM-dd');
