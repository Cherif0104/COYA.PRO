-- Script SQL pour s'assurer que la colonne paid_amount existe dans la table invoices
-- À exécuter dans l'éditeur SQL de Supabase

-- Vérifier si la colonne existe et l'ajouter si elle n'existe pas
DO $$
BEGIN
    -- Vérifier si la colonne paid_amount existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'paid_amount'
    ) THEN
        -- Ajouter la colonne paid_amount
        ALTER TABLE invoices 
        ADD COLUMN paid_amount NUMERIC(10, 2) DEFAULT NULL;
        
        RAISE NOTICE 'Colonne paid_amount ajoutée à la table invoices';
    ELSE
        RAISE NOTICE 'Colonne paid_amount existe déjà';
    END IF;
    
    -- Vérifier si la colonne invoice_number existe (au cas où)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'invoice_number'
    ) THEN
        -- Si elle n'existe pas, utiliser 'number' qui existe déjà
        RAISE NOTICE 'Colonne invoice_number n''existe pas, utilisation de number';
    END IF;
    
    -- Vérifier si la colonne paid_date existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'paid_date'
    ) THEN
        ALTER TABLE invoices 
        ADD COLUMN paid_date DATE DEFAULT NULL;
        
        RAISE NOTICE 'Colonne paid_date ajoutée à la table invoices';
    ELSE
        RAISE NOTICE 'Colonne paid_date existe déjà';
    END IF;
    
    -- Vérifier si les colonnes de receipt existent
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'receipt_file_name'
    ) THEN
        ALTER TABLE invoices 
        ADD COLUMN receipt_file_name TEXT DEFAULT NULL;
        
        RAISE NOTICE 'Colonne receipt_file_name ajoutée à la table invoices';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'receipt_data_url'
    ) THEN
        ALTER TABLE invoices 
        ADD COLUMN receipt_data_url TEXT DEFAULT NULL;
        
        RAISE NOTICE 'Colonne receipt_data_url ajoutée à la table invoices';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'recurring_source_id'
    ) THEN
        ALTER TABLE invoices 
        ADD COLUMN recurring_source_id UUID DEFAULT NULL;
        
        RAISE NOTICE 'Colonne recurring_source_id ajoutée à la table invoices';
    END IF;
END $$;

-- Vérifier les colonnes existantes (pour diagnostic)
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'invoices' 
ORDER BY ordinal_position;
