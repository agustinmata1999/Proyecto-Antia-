'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { currencyApi } from '@/lib/api';

type Currency = 'EUR' | 'USD';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  exchangeRate: number; // EUR to USD rate
  convert: (amountCents: number, fromCurrency?: Currency) => number;
  formatPrice: (amountCents: number, fromCurrency?: Currency) => string;
  symbol: string;
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('EUR');
  const [exchangeRate, setExchangeRate] = useState(1.08); // Default EUR to USD
  const [loading, setLoading] = useState(true);

  // Load saved currency preference
  useEffect(() => {
    const saved = localStorage.getItem('preferredCurrency');
    if (saved === 'EUR' || saved === 'USD') {
      setCurrencyState(saved);
    }
    loadExchangeRate();
  }, []);

  const loadExchangeRate = async () => {
    try {
      const response = await currencyApi.getRates();
      // Handle both formats: { rates: [...] } or directly [...]
      const rates = response.data?.rates || response.data;
      if (Array.isArray(rates)) {
        // Find EUR to USD rate
        const eurUsd = rates.find((r: any) => r.baseCurrency === 'EUR' && r.targetCurrency === 'USD');
        if (eurUsd) {
          setExchangeRate(eurUsd.rate);
        }
      }
    } catch (error) {
      console.error('Error loading exchange rate:', error);
    } finally {
      setLoading(false);
    }
  };

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('preferredCurrency', newCurrency);
  };

  // Convert cents from one currency to the selected currency
  const convert = (amountCents: number, fromCurrency: Currency = 'EUR'): number => {
    if (fromCurrency === currency) {
      return amountCents;
    }
    
    if (fromCurrency === 'EUR' && currency === 'USD') {
      return Math.round(amountCents * exchangeRate);
    }
    
    if (fromCurrency === 'USD' && currency === 'EUR') {
      return Math.round(amountCents / exchangeRate);
    }
    
    return amountCents;
  };

  // Format price with currency symbol
  const formatPrice = (amountCents: number, fromCurrency: Currency = 'EUR'): string => {
    const convertedCents = convert(amountCents, fromCurrency);
    const amount = convertedCents / 100;
    const sym = currency === 'USD' ? '$' : '€';
    return `${sym}${amount.toFixed(2)}`;
  };

  const symbol = currency === 'USD' ? '$' : '€';

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        exchangeRate,
        convert,
        formatPrice,
        symbol,
        loading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
