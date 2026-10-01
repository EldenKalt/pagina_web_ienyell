'use client';

import { useEffect, useState } from 'react';

const CURRENCIES = [
  { symbol: '₡', code: 'CRC', label: 'Colones' },
  { symbol: '$', code: 'USD', label: 'Dollars' },
  { symbol: '€', code: 'EUR', label: 'Euros' },
];

function parseBudget(raw) {
  if (!raw) return { currency: '$', amount: '' };
  const value = String(raw).trim();
  for (const currency of CURRENCIES) {
    if (value.startsWith(currency.symbol) || value.startsWith(currency.code)) {
      return {
        currency: currency.symbol,
        amount: value
          .replace(currency.symbol, '')
          .replace(currency.code, '')
          .replace(/\s/g, '')
          .trim(),
      };
    }
  }
  return { currency: '$', amount: value.replace(/[^0-9]/g, '') };
}

function formatAmount(value) {
  const number = String(value).replace(/[^0-9]/g, '');
  return number.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export default function PortfolioBudgetInput({ value, onChange }) {
  const parsed = parseBudget(value);
  const [currency, setCurrency] = useState(parsed.currency);
  const [amount, setAmount] = useState(parsed.amount);

  useEffect(() => {
    const nextValue = parseBudget(value);
    setCurrency(nextValue.currency);
    setAmount(nextValue.amount);
  }, [value]);

  const emit = (nextCurrency, nextAmount) => {
    const clean = String(nextAmount).replace(/[^0-9]/g, '');
    onChange(clean ? `${nextCurrency}${clean}` : '');
  };

  return (
    <div className="cms-budget-input">
      <select
        value={currency}
        onChange={(event) => {
          setCurrency(event.target.value);
          emit(event.target.value, amount);
        }}
        className="cms-input cms-budget-currency"
      >
        {CURRENCIES.map((currencyOption) => (
          <option key={currencyOption.symbol} value={currencyOption.symbol}>
            {currencyOption.symbol} {currencyOption.label}
          </option>
        ))}
      </select>
      <input
        type="text"
        inputMode="numeric"
        value={formatAmount(amount)}
        onChange={(event) => {
          const raw = event.target.value.replace(/[^0-9]/g, '');
          setAmount(raw);
          emit(currency, raw);
        }}
        placeholder="0"
        className="cms-input cms-budget-amount"
      />
    </div>
  );
}
