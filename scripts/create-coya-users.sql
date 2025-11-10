-- Script pour créer les utilisateurs natifs SENEGEL
-- Mot de passe par défaut : Senegel2024!

-- Fonction pour créer un utilisateur avec son profil
CREATE OR REPLACE FUNCTION create_senegel_user(
    user_email TEXT,
    user_password TEXT,
    user_full_name TEXT,
    user_phone TEXT,
    user_role TEXT DEFAULT 'employee'
) RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
    new_profile_id UUID;
BEGIN
    -- Générer un UUID pour l'utilisateur
    new_user_id := gen_random_uuid();
    
    -- Insérer dans auth.users (simulation - en réalité cela se fait via Supabase Auth)
    -- Pour l'instant, on crée juste le profil
    
    -- Générer un UUID pour le profil
    new_profile_id := gen_random_uuid();
    
    -- Insérer le profil
    INSERT INTO profiles (
        id,
        user_id,
        email,
        full_name,
        phone_number,
        role,
        skills,
        bio,
        location,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        new_profile_id,
        new_user_id,
        user_email,
        user_full_name,
        user_phone,
        user_role,
        ARRAY['Gestion de projet', 'Communication', 'Travail d\'équipe'],
        'Membre de l\'équipe SENEGEL',
        'Sénégal',
        true,
        NOW(),
        NOW()
    );
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql;

-- Créer tous les utilisateurs SENEGEL
SELECT create_senegel_user('Mariemebl3@gmail.com', 'Senegel2024!', 'BADIANE Marieme', '77 926 24 77', 'employee');
SELECT create_senegel_user('rokhaya@senegel.org', 'Senegel2024!', 'BODIAN Rokhaya', '77 520 32 78', 'manager');
SELECT create_senegel_user('Nabyaminatoul08@gmail.com', 'Senegel2024!', 'DIAGNE Amy', '77 905 14 87', 'employee');
SELECT create_senegel_user('awadiagne1003@gmail.com', 'Senegel2024!', 'DIAGNE Awa', '77 453 44 76', 'employee');
SELECT create_senegel_user('adjadiallo598@gmail.com', 'Senegel2024!', 'DIALLO Adja Mame Sarr', '77 477 39 39', 'employee');
SELECT create_senegel_user('mdiasse26@gmail.com', 'Senegel2024!', 'DIASSE Mouhamadou Lamine', '77 194 87 25', 'employee');
SELECT create_senegel_user('diopiste@yahoo.fr', 'Senegel2024!', 'DIOP Ousmane', '77 511 97 91', 'employee');
SELECT create_senegel_user('bafode@senegel.org', 'Senegel2024!', 'DRAME Bafode', '77 650 96 68', 'employee');
SELECT create_senegel_user('adjabsf92@gmail.com', 'Senegel2024!', 'FAYE Adja Bineta Sylla', '77 484 55 80', 'employee');
SELECT create_senegel_user('gningue04@gmail.com', 'Senegel2024!', 'GNINGUE Oumar', '77 768 49 99', 'employee');
SELECT create_senegel_user('onevisionbmca@gmail.com', 'Senegel2024!', 'GUINDO Mariame Diouldé', '77 564 44 40', 'employee');
SELECT create_senegel_user('rokhayakebe23@gmail.com', 'Senegel2024!', 'KEBE Rokhaya', '76 194 72 04', 'employee');
SELECT create_senegel_user('lyamadoudia@gmail.com', 'Senegel2024!', 'LY Amadou Dia', '+1 (971) 270-8619 / 77 884 96 92', 'employee');
SELECT create_senegel_user('Wowastudios@gmail.com', 'Senegel2024!', 'NDIAYE Cheikh Mohamed', '77 283 55 14', 'employee');
SELECT create_senegel_user('cnyafouna@gmail.com', 'Senegel2024!', 'NYAFOUNA Charles', '+44 7545 341935', 'employee');
SELECT create_senegel_user('pape@senegel.org', 'Senegel2024!', 'SAMB Alioune Badara Pape', '+1 (202) 557-4901 / 75 335 13 84', 'administrator');
SELECT create_senegel_user('sambrokhy700@gmail.com', 'Senegel2024!', 'SAMB Rokhaya', '77 286 33 12', 'employee');
SELECT create_senegel_user('adamasene.fa@gmail.com', 'Senegel2024!', 'SENE Adama Mandaw', '77 705 32 51', 'employee');
SELECT create_senegel_user('contact@senegel.org', 'Senegel2024!', 'SENEGEL CONTACT', '77 853 33 99 / 33 843 63 12', 'super_administrator');

-- Supprimer la fonction temporaire
DROP FUNCTION create_senegel_user(TEXT, TEXT, TEXT, TEXT, TEXT);

-- Afficher les utilisateurs créés
SELECT 
    full_name,
    email,
    phone_number,
    role,
    created_at
FROM profiles 
WHERE email LIKE '%@senegel.org' OR email LIKE '%@gmail.com' OR email LIKE '%@yahoo.fr'
ORDER BY full_name;
