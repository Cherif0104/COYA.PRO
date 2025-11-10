import { supabase } from '../services/supabaseService';

// Liste des utilisateurs SENEGEL avec leurs rôles selon la vision MVP
const senegelUsers = [
  {
    full_name: "BADIANE Marieme",
    email: "Mariemebl3@gmail.com",
    phone_number: "77 926 24 77",
    role: "administrator", // Rôle administratif
    department: "Administration"
  },
  {
    full_name: "BODIAN Rokhaya",
    email: "rokhaya@senegel.org",
    phone_number: "77 520 32 78",
    role: "super_administrator", // Super administrateur
    department: "Direction"
  },
  {
    full_name: "DIAGNE Amy",
    email: "Nabyaminatoul08@gmail.com",
    phone_number: "77 905 14 87",
    role: "manager", // Manager
    department: "Gestion"
  },
  {
    full_name: "DIAGNE Awa",
    email: "awadiagne1003@gmail.com",
    phone_number: "77 453 44 76",
    role: "supervisor", // Superviseur
    department: "Supervision"
  },
  {
    full_name: "DIALLO Adja Mame Sarr",
    email: "adjadiallo598@gmail.com",
    phone_number: "77 477 39 39",
    role: "trainer", // Formateur
    department: "Formation"
  },
  {
    full_name: "DIASSE Mouhamadou Lamine",
    email: "mdiasse26@gmail.com",
    phone_number: "77 194 87 25",
    role: "implementer", // Implémenteur
    department: "Implémentation"
  },
  {
    full_name: "DIOP Ousmane",
    email: "diopiste@yahoo.fr",
    phone_number: "77 511 97 91",
    role: "coach", // Coach
    department: "Coaching"
  },
  {
    full_name: "DRAME Bafode",
    email: "bafode.drame@senegel.org", // Email généré
    phone_number: "77 650 96 68",
    role: "facilitator", // Facilitateur
    department: "Facilitation"
  },
  {
    full_name: "FAYE Adja Bineta Sylla",
    email: "adjabsf92@gmail.com",
    phone_number: "77 484 55 80",
    role: "mentor", // Mentor
    department: "Mentorat"
  },
  {
    full_name: "GNINGUE Oumar",
    email: "gningue04@gmail.com",
    phone_number: "77 768 49 99",
    role: "entrepreneur", // Entrepreneur
    department: "Entrepreneuriat"
  },
  {
    full_name: "GUINDO Mariame Diouldé",
    email: "onevisionbmca@gmail.com",
    phone_number: "77 564 44 40",
    role: "publisher", // Éditeur
    department: "Édition"
  },
  {
    full_name: "KEBE Rokhaya",
    email: "rokhayakebe23@gmail.com",
    phone_number: "76 194 72 04",
    role: "producer", // Producteur
    department: "Production"
  },
  {
    full_name: "LY Amadou Dia",
    email: "lyamadoudia@gmail.com",
    phone_number: "+1 (971) 270-8619 / 77 884 96 92",
    role: "funder", // Financeur
    department: "Finance"
  },
  {
    full_name: "NDIAYE Cheikh Mohamed",
    email: "Wowastudios@gmail.com",
    phone_number: "77 283 55 14",
    role: "artist", // Artiste
    department: "Création"
  },
  {
    full_name: "NYAFOUNA Charles",
    email: "cnyafouna@gmail.com",
    phone_number: "+44 7545 341935",
    role: "administrator", // Administrateur
    department: "Administration"
  },
  {
    full_name: "SAMB Alioune Badara Pape",
    email: "pape@senegel.org",
    phone_number: "+1 (202) 557-4901 / 75 335 13 84",
    role: "super_administrator", // Super administrateur
    department: "Direction"
  },
  {
    full_name: "SAMB Rokhaya",
    email: "sambrokhy700@gmail.com",
    phone_number: "77 286 33 12",
    role: "editor", // Éditeur
    department: "Édition"
  },
  {
    full_name: "SENE Adama Mandaw",
    email: "adamasene.fa@gmail.com",
    phone_number: "77 705 32 51",
    role: "intern", // Stagiaire
    department: "Stages"
  },
  {
    full_name: "SENEGEL CONTACT",
    email: "contact@senegel.org",
    phone_number: "77 853 33 99 / 33 843 63 12",
    role: "administrator", // Contact général
    department: "Contact"
  }
];

export async function createSenegelUsers() {
  console.log('🚀 Création des utilisateurs SENEGEL natifs...');
  
  const results = [];
  
  for (const user of senegelUsers) {
    try {
      // Vérifier si l'utilisateur existe déjà
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', user.email)
        .single();
      
      if (existingUser) {
        console.log(`⚠️  Utilisateur ${user.full_name} existe déjà`);
        results.push({ user: user.full_name, status: 'exists', data: existingUser });
        continue;
      }
      
      // Créer le profil utilisateur
      const { data: profile, error } = await supabase
        .from('profiles')
        .insert({
          full_name: user.full_name,
          email: user.email,
          phone_number: user.phone_number,
          role: user.role,
          department: user.department,
          is_native_user: true, // Marquer comme utilisateur natif
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error(`❌ Erreur création ${user.full_name}:`, error);
        results.push({ user: user.full_name, status: 'error', error });
      } else {
        console.log(`✅ Utilisateur ${user.full_name} créé avec succès`);
        results.push({ user: user.full_name, status: 'created', data: profile });
      }
      
    } catch (error) {
      console.error(`❌ Erreur pour ${user.full_name}:`, error);
      results.push({ user: user.full_name, status: 'error', error });
    }
  }
  
  console.log('\n📊 RÉSUMÉ DE LA CRÉATION:');
  console.log(`✅ Créés: ${results.filter(r => r.status === 'created').length}`);
  console.log(`⚠️  Existants: ${results.filter(r => r.status === 'exists').length}`);
  console.log(`❌ Erreurs: ${results.filter(r => r.status === 'error').length}`);
  
  return results;
}

// Fonction pour tester la connexion
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) throw error;
    console.log('✅ Connexion Supabase réussie');
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion Supabase:', error);
    return false;
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  (async () => {
    const connected = await testSupabaseConnection();
    if (connected) {
      await createSenegelUsers();
    }
  })();
}
