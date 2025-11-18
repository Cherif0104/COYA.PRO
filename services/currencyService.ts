import { CurrencyCode, SUPPORTED_CURRENCIES } from '../types';

type ConversionRates = Record<CurrencyCode, number>;

interface ExchangeRateApiResponse {
  result: 'success' | 'error';
  conversion_rates?: Record<string, number>;
}

export interface ConversionResult {
  originalAmount: number;
  originalCurrency: CurrencyCode;
  convertedAmount: number;
  targetCurrency: CurrencyCode;
  rate: number;
  baseAmountUSD: number;
}

export interface ExchangeGainLoss {
  originalUSD: number;
  currentUSD: number;
  gainLoss: number;
  gainLossPercent: number;
}

export interface ManualExchangeRate {
  id: string;
  baseCurrency: CurrencyCode;
  targetCurrency: CurrencyCode;
  rate: number;
  effectiveDate: string;
  endDate?: string;
  source: string;
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

const DEFAULT_USD_RATES: ConversionRates = {
  USD: 1,
  EUR: 0.92,
  XOF: 604
};

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export class CurrencyService {
  private static usdRatesCache: { rates: ConversionRates; timestamp: number } | null = null;

  private static get apiKey(): string | undefined {
    return import.meta.env.VITE_EXCHANGE_RATE_API_KEY || import.meta.env.VITE_EXCHANGE_RATE_APIKEY;
  }

  private static async fetchUsdRates(): Promise<ConversionRates> {
    if (!this.apiKey) {
      console.warn('⚠️ CurrencyService: API key missing, using fallback rates');
      return DEFAULT_USD_RATES;
    }

    try {
      const response = await fetch(`https://v6.exchangerate-api.com/v6/${this.apiKey}/latest/USD`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data: ExchangeRateApiResponse = await response.json();
      if (data.result !== 'success' || !data.conversion_rates) {
        throw new Error('Invalid API response');
      }

      const rates: ConversionRates = SUPPORTED_CURRENCIES.reduce((acc, code) => {
        acc[code] = code === 'USD'
          ? 1
          : data.conversion_rates?.[code] ?? DEFAULT_USD_RATES[code] ?? 1;
        return acc;
      }, {} as ConversionRates);

      return rates;
    } catch (error) {
      console.error('❌ CurrencyService.fetchUsdRates:', error);
      return DEFAULT_USD_RATES;
    }
  }

  static async getUsdConversionRates(forceRefresh = false): Promise<ConversionRates> {
    const now = Date.now();
    if (!forceRefresh && this.usdRatesCache && now - this.usdRatesCache.timestamp < CACHE_TTL) {
      return this.usdRatesCache.rates;
    }

    const rates = await this.fetchUsdRates();
    this.usdRatesCache = { rates, timestamp: now };
    return rates;
  }

  /**
   * Récupère le taux de change vers USD, en priorisant les taux manuels
   * @param currency Devise source
   * @param date Date pour laquelle récupérer le taux (optionnel, défaut = aujourd'hui)
   * @param manualRates Liste des taux manuels à vérifier en premier (optionnel)
   * @returns Taux de change vers USD
   */
  static async getRateToUSD(
    currency: CurrencyCode,
    date?: string,
    manualRates?: ManualExchangeRate[]
  ): Promise<number> {
    if (currency === 'USD') return 1;

    // 1. Vérifier d'abord les taux manuels si fournis
    if (manualRates && manualRates.length > 0) {
      const targetDate = date ? new Date(date) : new Date();
      const manualRate = manualRates.find(rate => {
        if (rate.baseCurrency !== currency || rate.targetCurrency !== 'USD') return false;
        const effectiveDate = new Date(rate.effectiveDate);
        const endDate = rate.endDate ? new Date(rate.endDate) : null;
        return targetDate >= effectiveDate && (!endDate || targetDate <= endDate);
      });
      
      if (manualRate && manualRate.rate > 0) {
        return manualRate.rate;
      }
    }

    // 2. Sinon, utiliser l'API ou les taux par défaut
    const usdRates = await this.getUsdConversionRates();
    const usdToCurrency = usdRates[currency];
    if (!usdToCurrency) return 1;
    return 1 / usdToCurrency;
  }

  static convertUsdToCurrency(amountUSD: number, targetCurrency: CurrencyCode, usdRates: ConversionRates): number {
    const rate = usdRates[targetCurrency] ?? DEFAULT_USD_RATES[targetCurrency] ?? 1;
    return amountUSD * rate;
  }

  static convertCurrencyToUsd(amount: number, currency: CurrencyCode, usdRates: ConversionRates, exchangeRate?: number): number {
    if (typeof exchangeRate === 'number' && exchangeRate > 0) {
      return amount * exchangeRate;
    }
    if (currency === 'USD') return amount;
    const usdToCurrency = usdRates[currency] ?? DEFAULT_USD_RATES[currency];
    if (!usdToCurrency || usdToCurrency === 0) return amount;
    return amount / usdToCurrency;
  }

  static async convertAmount(
    amount: number,
    from: CurrencyCode,
    to: CurrencyCode,
    options?: { 
      exchangeRate?: number;
      date?: string;
      manualRates?: ManualExchangeRate[];
    }
  ): Promise<ConversionResult> {
    // Si un taux de change est fourni manuellement, l'utiliser directement
    if (options?.exchangeRate && options.exchangeRate > 0) {
      const baseAmountUSD = amount * options.exchangeRate;
      const usdRates = await this.getUsdConversionRates();
      const convertedAmount = this.convertUsdToCurrency(baseAmountUSD, to, usdRates);
      
      return {
        originalAmount: amount,
        originalCurrency: from,
        convertedAmount,
        targetCurrency: to,
        rate: convertedAmount / (amount || 1),
        baseAmountUSD
      };
    }

    // Sinon, utiliser les taux manuels ou API
    const rateToUSD = await this.getRateToUSD(from, options?.date, options?.manualRates);
    const baseAmountUSD = amount * rateToUSD;
    const usdRates = await this.getUsdConversionRates();
    const convertedAmount = this.convertUsdToCurrency(baseAmountUSD, to, usdRates);

    return {
      originalAmount: amount,
      originalCurrency: from,
      convertedAmount,
      targetCurrency: to,
      rate: convertedAmount / (amount || 1),
      baseAmountUSD
    };
  }

  static async calculateExchangeGainLoss(
    amount: number,
    currency: CurrencyCode,
    originalExchangeRate?: number
  ): Promise<ExchangeGainLoss> {
    if (currency === 'USD') {
      return {
        originalUSD: amount,
        currentUSD: amount,
        gainLoss: 0,
        gainLossPercent: 0
      };
    }

    const originalRate = originalExchangeRate || await this.getRateToUSD(currency);
    const currentRate = await this.getRateToUSD(currency);

    const originalUSD = amount * originalRate;
    const currentUSD = amount * currentRate;
    const gainLoss = currentUSD - originalUSD;
    const gainLossPercent = originalUSD === 0 ? 0 : (gainLoss / originalUSD) * 100;

    return {
      originalUSD,
      currentUSD,
      gainLoss,
      gainLossPercent
    };
  }

  static formatCurrency(amount: number, currency: CurrencyCode, locale: string = 'en-US'): string {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      console.warn('⚠️ CurrencyService.formatCurrency fallback:', error);
      return `${currency} ${amount.toFixed(2)}`;
    }
  }
}

