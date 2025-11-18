-- Migration: Ajout des colonnes de gestion des devises
-- Date: 2025-01-XX
-- Description: Ajoute les colonnes currency_code, exchange_rate, base_amount_usd, transaction_date
--              aux tables invoices, expenses, recurring_invoices, recurring_expenses, budgets

-- ===== INVOICES =====
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC,
ADD COLUMN IF NOT EXISTS base_amount_usd NUMERIC,
ADD COLUMN IF NOT EXISTS transaction_date DATE;

-- ===== EXPENSES =====
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC,
ADD COLUMN IF NOT EXISTS base_amount_usd NUMERIC,
ADD COLUMN IF NOT EXISTS transaction_date DATE;

-- ===== RECURRING_INVOICES =====
ALTER TABLE recurring_invoices 
ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC,
ADD COLUMN IF NOT EXISTS base_amount_usd NUMERIC;

-- ===== RECURRING_EXPENSES =====
ALTER TABLE recurring_expenses 
ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC,
ADD COLUMN IF NOT EXISTS base_amount_usd NUMERIC;

-- ===== BUDGETS =====
ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC,
ADD COLUMN IF NOT EXISTS base_amount_usd NUMERIC;

-- ===== MISE À JOUR DES DONNÉES EXISTANTES =====
-- Mettre à jour les factures existantes (USD par défaut, taux = 1, base_amount_usd = amount)
UPDATE invoices 
SET 
    currency_code = 'USD', 
    exchange_rate = 1, 
    base_amount_usd = amount,
    transaction_date = COALESCE(due_date, created_at::date)
WHERE currency_code IS NULL OR exchange_rate IS NULL;

-- Mettre à jour les dépenses existantes
UPDATE expenses 
SET 
    currency_code = 'USD', 
    exchange_rate = 1, 
    base_amount_usd = amount,
    transaction_date = COALESCE(date, created_at::date)
WHERE currency_code IS NULL OR exchange_rate IS NULL;

-- Mettre à jour les factures récurrentes existantes
UPDATE recurring_invoices 
SET 
    currency_code = 'USD', 
    exchange_rate = 1, 
    base_amount_usd = amount
WHERE currency_code IS NULL OR exchange_rate IS NULL;

-- Mettre à jour les dépenses récurrentes existantes
UPDATE recurring_expenses 
SET 
    currency_code = 'USD', 
    exchange_rate = 1, 
    base_amount_usd = amount
WHERE currency_code IS NULL OR exchange_rate IS NULL;

-- Mettre à jour les budgets existants
UPDATE budgets 
SET 
    currency_code = 'USD', 
    exchange_rate = 1, 
    base_amount_usd = amount
WHERE currency_code IS NULL OR exchange_rate IS NULL;

-- ===== CRÉATION DE LA TABLE DE CACHE DES TAUX DE CHANGE (OPTIONNEL) =====
CREATE TABLE IF NOT EXISTS currency_exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  base_currency VARCHAR(3) NOT NULL,
  target_currency VARCHAR(3) NOT NULL,
  rate NUMERIC NOT NULL,
  date DATE NOT NULL,
  source VARCHAR(50) DEFAULT 'api',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(base_currency, target_currency, date)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_currency_rates_date ON currency_exchange_rates(date);
CREATE INDEX IF NOT EXISTS idx_currency_rates_currencies ON currency_exchange_rates(base_currency, target_currency);

-- Commentaires pour documentation
COMMENT ON COLUMN invoices.currency_code IS 'Code devise originale de la transaction (USD, EUR, XOF)';
COMMENT ON COLUMN invoices.exchange_rate IS 'Taux de change vers USD à la date de la transaction';
COMMENT ON COLUMN invoices.base_amount_usd IS 'Montant converti en USD pour comparaisons';
COMMENT ON COLUMN invoices.transaction_date IS 'Date de la transaction pour calcul historique des taux';

COMMENT ON COLUMN expenses.currency_code IS 'Code devise originale de la transaction (USD, EUR, XOF)';
COMMENT ON COLUMN expenses.exchange_rate IS 'Taux de change vers USD à la date de la transaction';
COMMENT ON COLUMN expenses.base_amount_usd IS 'Montant converti en USD pour comparaisons';
COMMENT ON COLUMN expenses.transaction_date IS 'Date de la transaction pour calcul historique des taux';


