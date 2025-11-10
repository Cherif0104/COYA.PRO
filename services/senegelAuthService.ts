import { supabase } from './supabaseService';

// Service d'authentification spécialisé pour les utilisateurs SENEGEL natifs
export class SenegelAuthService {
  // Mot de passe universel pour tous les utilisateurs SENEGEL
  private static readonly UNIVERSAL_PASSWORD = 'Senegel2024!';

  // Liste des utilisateurs SENEGEL natifs avec leurs rôles MVP
  private static readonly SENEGEL_USERS = [
    { email: 'Mariemebl3@gmail.com', fullName: 'BADIANE Marieme', phone: '77 926 24 77', role: 'manager' },
    { email: 'rokhaya@senegel.org', fullName: 'BODIAN Rokhaya', phone: '77 520 32 78', role: 'super_administrator' },
    { email: 'Nabyaminatoul08@gmail.com', fullName: 'DIAGNE Amy', phone: '77 905 14 87', role: 'supervisor' },
    { email: 'awadiagne1003@gmail.com', fullName: 'DIAGNE Awa', phone: '77 453 44 76', role: 'supervisor' },
    { email: 'adjadiallo598@gmail.com', fullName: 'DIALLO Adja Mame Sarr', phone: '77 477 39 39', role: 'supervisor' },
    { email: 'mdiasse26@gmail.com', fullName: 'DIASSE Mouhamadou Lamine', phone: '77 194 87 25', role: 'trainer' },
    { email: 'diopiste@yahoo.fr', fullName: 'DIOP Ousmane', phone: '77 511 97 91', role: 'trainer' },
    { email: 'bafode@senegel.org', fullName: 'DRAME Bafode', phone: '77 650 96 68', role: 'facilitator' },
    { email: 'adjabsf92@gmail.com', fullName: 'FAYE Adja Bineta Sylla', phone: '77 484 55 80', role: 'mentor' },
    { email: 'gningue04@gmail.com', fullName: 'GNINGUE Oumar', phone: '77 768 49 99', role: 'entrepreneur' },
    { email: 'onevisionbmca@gmail.com', fullName: 'GUINDO Mariame Diouldé', phone: '77 564 44 40', role: 'publisher' },
    { email: 'rokhayakebe23@gmail.com', fullName: 'KEBE Rokhaya', phone: '76 194 72 04', role: 'producer' },
    { email: 'lyamadoudia@gmail.com', fullName: 'LY Amadou Dia', phone: '+1 (971) 270-8619 / 77 884 96 92', role: 'funder' },
    { email: 'Wowastudios@gmail.com', fullName: 'NDIAYE Cheikh Mohamed', phone: '77 283 55 14', role: 'artist' },
    { email: 'cnyafouna@gmail.com', fullName: 'NYAFOUNA Charles', phone: '+44 7545 341935', role: 'administrator' },
    { email: 'pape@senegel.org', fullName: 'SAMB Alioune Badara Pape', phone: '+1 (202) 557-4901 / 75 335 13 84', role: 'super_administrator' },
    { email: 'sambrokhy700@gmail.com', fullName: 'SAMB Rokhaya', phone: '77 286 33 12', role: 'editor' },
    { email: 'adamasene.fa@gmail.com', fullName: 'SENE Adama Mandaw', phone: '77 705 32 51', role: 'intern' },
    { email: 'contact@senegel.org', fullName: 'SENEGEL CONTACT', phone: '77 853 33 99 / 33 843 63 12', role: 'administrator' }
  ];

  // Vérifier si un email appartient à un utilisateur SENEGEL natif
  static isSenegelUser(email: string): boolean {
    return this.SENEGEL_USERS.some(user => user.email.toLowerCase() === email.toLowerCase());
  }

  // Obtenir les informations d'un utilisateur SENEGEL
  static getSenegelUser(email: string) {
    return this.SENEGEL_USERS.find(user => user.email.toLowerCase() === email.toLowerCase());
  }

  // Authentification pour les utilisateurs SENEGEL natifs
  static async signInSenegelUser(email: string, password: string) {
    try {
      console.log('🇸🇳 SenegelAuthService.signInSenegelUser appelé avec:', { email, password: '***' });
      
      // Vérifier si c'est un utilisateur SENEGEL et si le mot de passe est correct
      const isSenegel = this.isSenegelUser(email);
      const isPasswordCorrect = password === this.UNIVERSAL_PASSWORD;
      
      console.log('🔍 Vérifications:', { isSenegel, isPasswordCorrect });
      
      if (!isSenegel || !isPasswordCorrect) {
        console.log('❌ Email ou mot de passe incorrect');
        return { user: null, error: new Error('Email ou mot de passe incorrect') };
      }

      console.log('✅ Utilisateur SENEGEL valide, récupération du profil...');
      
      // Utiliser les données locales au lieu de l'API REST
      const userInfo = this.getSenegelUser(email);
      if (!userInfo) {
        console.error('❌ Informations utilisateur SENEGEL non trouvées');
        return { user: null, error: new Error('Informations utilisateur non trouvées') };
      }

      console.log('👤 Profil SENEGEL trouvé:', userInfo);

      // Retourner l'utilisateur authentifié avec les données locales
      const result = {
        user: {
          id: crypto.randomUUID(), // UUID valide au lieu d'un ID personnalisé
          email: email,
          full_name: userInfo.fullName,
          role: userInfo.role,
          avatar_url: '', // Pas d'avatar pour l'instant
          phone_number: userInfo.phone
        },
        error: null
      };
      
      console.log('✅ Authentification SENEGEL réussie !', result);
      return result;

    } catch (error) {
      console.error('💥 Erreur authentification SENEGEL:', error);
      return { user: null, error };
    }
  }

  // Obtenir la liste des utilisateurs SENEGEL pour affichage
  static getSenegelUsersList() {
    return this.SENEGEL_USERS.map(user => ({
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role
    }));
  }

  // Créer un utilisateur SENEGEL dans Supabase Auth (pour usage futur)
  static async createSenegelUserInAuth(email: string) {
    try {
      const userInfo = this.getSenegelUser(email);
      if (!userInfo) {
        throw new Error('Utilisateur SENEGEL non trouvé');
      }

      // Créer l'utilisateur dans Supabase Auth
      const { data, error } = await supabase.auth.admin.createUser({
        email: email,
        password: this.UNIVERSAL_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: userInfo.fullName,
          phone_number: userInfo.phone,
          role: userInfo.role
        }
      });

      if (error) throw error;

      // Créer le profil correspondant
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            email: email,
            full_name: userInfo.fullName,
            phone_number: userInfo.phone,
            role: userInfo.role,
            skills: ['Gestion de projet', 'Communication', 'Travail d\'équipe'],
            bio: 'Membre de l\'équipe SENEGEL',
            location: 'Sénégal',
            is_active: true
          });

        if (profileError) {
          console.error('Erreur création profil:', profileError);
        }
      }

      return { user: data.user, error: null };
    } catch (error) {
      console.error('Erreur création utilisateur SENEGEL:', error);
      return { user: null, error };
    }
  }
}