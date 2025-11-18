-- Migration: Gestion manuelle des taux de change
-- Date: 2025-01-17
-- Description: Permet la saisie manuelle des taux de change par période

-- ===== CRÉATION DE LA TABLE DES TAUX DE CHANGE MANUELS =====
CREATE TABLE IF NOT EXISTS manual_exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  base_currency VARCHAR(3) NOT NULL,
  target_currency VARCHAR(3) NOT NULL,
  rate NUMERIC NOT NULL CHECK (rate > 0),
  effective_date DATE NOT NULL,
  end_date DATE,
  source VARCHAR(50) DEFAULT 'manual',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(base_currency, target_currency, effective_date)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_manual_rates_date ON manual_exchange_rates(effective_date);
CREATE INDEX IF NOT EXISTS idx_manual_rates_currencies ON manual_exchange_rates(base_currency, target_currency);
CREATE INDEX IF NOT EXISTS idx_manual_rates_date_range ON manual_exchange_rates(effective_date, end_date);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_manual_exchange_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER trigger_update_manual_exchange_rates_updated_at
  BEFORE UPDATE ON manual_exchange_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_manual_exchange_rates_updated_at();

-- Commentaires pour documentation
COMMENT ON TABLE manual_exchange_rates IS 'Table pour stocker les taux de change saisis manuellement par période';
COMMENT ON COLUMN manual_exchange_rates.base_currency IS 'Devise de base (ex: EUR)';
COMMENT ON COLUMN manual_exchange_rates.target_currency IS 'Devise cible (ex: USD)';
COMMENT ON COLUMN manual_exchange_rates.rate IS 'Taux de change: 1 base_currency = rate target_currency';
COMMENT ON COLUMN manual_exchange_rates.effective_date IS 'Date de début d''application du taux';
COMMENT ON COLUMN manual_exchange_rates.end_date IS 'Date de fin d''application (NULL = toujours valide)';
COMMENT ON COLUMN manual_exchange_rates.source IS 'Source du taux: manual, api, bank, etc.';
COMMENT ON COLUMN manual_exchange_rates.notes IS 'Notes ou commentaires sur le taux';

-- RLS Policies
ALTER TABLE manual_exchange_rates ENABLE ROW LEVEL SECURITY;

-- Policy: Tout le monde peut lire les taux
CREATE POLICY "Anyone can read manual exchange rates"
  ON manual_exchange_rates
  FOR SELECT
  USING (true);

-- Policy: Seuls les rôles de gestion peuvent créer/modifier/supprimer
CREATE POLICY "Management roles can manage manual exchange rates"
  ON manual_exchange_rates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_administrator', 'administrator', 'manager', 'supervisor', 'trainer')
    )
  );


