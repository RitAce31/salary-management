export function formatCurrency(
  amount: string | number | undefined | null,
  currency = 'USD'
): string {
  if (amount === undefined || amount === null || amount === '') {
    return '—';
  }

  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(num)) {
    return '—';
  }

  try {
    const localeMap: Record<string, string> = {
      USD: 'en-US',
      INR: 'en-IN',
      EUR: 'de-DE',
      GBP: 'en-GB',
      CAD: 'en-CA',
      AUD: 'en-AU',
    };

    const locale = localeMap[currency.toUpperCase()] || 'en-US';

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${currency.toUpperCase()} ${num.toFixed(2)}`;
  }
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatPercentage(val: number | string): string {
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return '0%';
  return `${num.toFixed(1)}%`;
}
