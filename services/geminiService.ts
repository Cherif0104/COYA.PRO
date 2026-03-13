// Service IA avec intégration Google Gemini API et fallback Groq
import { Project, Task, User, Contact } from '../types';

// Configuration Gemini
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_API_BASE =
  import.meta.env.VITE_GEMINI_API_BASE ||
  'https://generativelanguage.googleapis.com/v1beta';

// Configuration Groq (fallback)
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL = import.meta.env.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_API_BASE = 'https://api.groq.com/openai/v1';

console.log('🔑 Debug Gemini API_KEY:', GEMINI_API_KEY ? 'Trouvée ✅' : 'Non trouvée ❌');
console.log('🔑 Debug Groq API_KEY:', GROQ_API_KEY ? 'Trouvée ✅' : 'Non trouvée ❌');

// Fonction d'appel à l'API Gemini
const callGeminiAPI = async (prompt: string, systemPrompt?: string): Promise<string> => {
  if (!GEMINI_API_KEY) {
    throw new Error("Clé API Gemini non configurée");
  }

  const url = `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{ text: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt }]
      }]
    })
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`API Gemini error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("La réponse Gemini est vide ou mal formée.");
  }
  return text;
};

// Fonction d'appel à l'API Groq
const callGroqAPI = async (prompt: string, systemPrompt?: string): Promise<string> => {
  if (!GROQ_API_KEY) {
    throw new Error("Clé API Groq non configurée");
  }

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: messages,
      temperature: 0.7,
      max_tokens: 4096,
    })
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`API Groq error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "Aucune réponse générée.";
};

// Fonction principale avec fallback automatique Gemini -> Groq
const callAI = async (prompt: string, systemPrompt?: string): Promise<string> => {
  // Essayer Gemini en premier si disponible
  if (GEMINI_API_KEY) {
    try {
      const result = await callGeminiAPI(prompt, systemPrompt);
      console.log('✅ Réponse Gemini réussie');
      return result;
    } catch (error: any) {
      console.warn('⚠️ Gemini a échoué, bascule vers Groq:', error.message);
      // Continuer vers Groq
    }
  }

  // Fallback vers Groq
  if (GROQ_API_KEY) {
    try {
      const result = await callGroqAPI(prompt, systemPrompt);
      console.log('✅ Réponse Groq réussie');
      return result;
    } catch (error: any) {
      console.error('❌ Groq a également échoué:', error.message);
      return "Erreur lors de la communication avec l'IA. Veuillez réessayer.";
    }
  }

  return "Aucune clé API configurée. Veuillez définir VITE_GEMINI_API_KEY ou VITE_GROQ_API_KEY dans le fichier .env";
};

// Modules AI Coach et Gen AI Lab retirés de la plateforme (Phase 1 ERP 360°)
// Ces exports sont conservés pour éviter les erreurs si un lien résiduel les appelle.
/** @deprecated Module ai_coach retiré - utiliser un autre module */
export const runAICoach = async (_prompt: string): Promise<string> => {
  return "Ce module n'est plus disponible.";
};

/** @deprecated Module gen_ai_lab retiré - utiliser un autre module */
export const runGenAILab = async (_prompt: string): Promise<string> => {
  return "Ce module n'est plus disponible.";
};

export const enhanceTask = async (task: Task): Promise<Task> => {
  return task;
};

export const identifyRisks = async (project: Project): Promise<string[]> => {
  return ["Risque technique", "Risque de délai"];
};

export const generateOKRs = async (projectDescription: string, projectTitle?: string, projectStatus?: string, projectTasks?: any[]): Promise<any[]> => {
  console.log('🤖 Génération IA OKRs - Démarrage pour projet:', projectTitle || 'Sans titre');
  
  // Construire un prompt détaillé pour l'IA
  const projectContext = `
Projet: ${projectTitle || 'Sans titre'}
Description: ${projectDescription || 'Aucune description'}
Statut: ${projectStatus || 'Non défini'}
${projectTasks && projectTasks.length > 0 ? `Tâches principales:\n${projectTasks.slice(0, 5).map((t: any) => `- ${t.text || t.title || 'Tâche'}`).join('\n')}` : ''}
  `.trim();

  const systemPrompt = `Tu es un expert en gestion d'objectifs et OKRs (Objectives and Key Results). 
Analyse le projet fourni et génère 2-3 objectifs stratégiques adaptés et pertinents pour ce projet spécifique.
Chaque objectif doit avoir 2-4 Key Results mesurables avec des unités appropriées (%, nombre, score, etc.).
Les OKRs doivent être:
- Spécifiques au projet (pas génériques)
- Mesurables et actionnables
- Réalistes mais ambitieux
- Alignés avec les objectifs du projet

Retourne uniquement un JSON valide avec cette structure exacte:
[
  {
    "title": "Titre de l'objectif stratégique",
    "keyResults": [
      {
        "title": "Description du Key Result mesurable",
        "target": nombre_cible,
        "unit": "unité (% ou texte)"
      }
    ]
  }
]`;

  const prompt = `${projectContext}\n\nGénère des OKRs professionnels et adaptés pour ce projet.`;

  try {
    if (GEMINI_API_KEY || GROQ_API_KEY) {
      // Utiliser l'API IA (Gemini ou Groq) pour générer des OKRs vraiment adaptés
      const response = await callAI(prompt, systemPrompt);
      
      // Essayer de parser la réponse JSON
      try {
        // Extraire le JSON de la réponse (peut contenir du markdown)
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('✅ Génération IA OKRs - OKRs générés par Gemini:', parsed.length);
          return parsed;
        }
      } catch (parseError) {
        console.warn('⚠️ Impossible de parser la réponse Gemini, utilisation des OKRs par défaut');
      }
    }
    
    // Fallback: Analyse basique + OKRs adaptés au contexte
    const lowerDesc = (projectDescription || '').toLowerCase();
    const lowerTitle = (projectTitle || '').toLowerCase();
    const combined = `${lowerTitle} ${lowerDesc}`;
    
    // Détecter le type de projet plus précisément
    const isMarketing = combined.includes('marketing') || combined.includes('campagne') || 
                       combined.includes('promotion') || combined.includes('publicité');
    const isTech = combined.includes('développement') || combined.includes('plateforme') ||
                  combined.includes('application') || combined.includes('software') ||
                  combined.includes('web') || combined.includes('mobile');
    const isBusiness = combined.includes('partenariat') || combined.includes('client') ||
                      combined.includes('vente') || combined.includes('commercial') ||
                      combined.includes('business');
    const isProduct = combined.includes('produit') || combined.includes('feature') ||
                      combined.includes('fonctionnalité');
    const isHR = combined.includes('rh') || combined.includes('recrutement') ||
                combined.includes('talent') || combined.includes('ressource humaine');
    
    // Générer des OKRs plus adaptés
    let objectives: any[] = [];
  
  if (isMarketing) {
    objectives = [
      {
          title: `Lancer avec succès ${projectTitle || 'le projet'} et obtenir une adoption rapide`,
        keyResults: [
            { title: "Atteindre 10 000 inscriptions d'utilisateurs au cours du premier mois", target: 10000, unit: "utilisateurs" },
            { title: "Sécuriser 50 partenaires pour intégrer la solution", target: 50, unit: "partenaires" },
            { title: "Atteindre un score de satisfaction de 8,5/10", target: 8.5, unit: "/10" }
        ]
      },
      {
        title: "Maximiser l'impact de la campagne et générer un ROI positif",
        keyResults: [
            { title: "Générer 100 000 impressions sur les réseaux sociaux", target: 100000, unit: "impressions" },
            { title: "Atteindre un taux de clic de 3% sur les publicités", target: 3, unit: "%" },
            { title: "Convertir 500 prospects qualifiés en clients", target: 500, unit: "clients" }
        ]
      }
    ];
  } else if (isTech) {
    objectives = [
      {
          title: `Développer et déployer ${projectTitle || 'la solution'} avec excellence technique`,
        keyResults: [
            { title: "Réduire le temps de chargement de 50%", target: 50, unit: "%" },
            { title: "Atteindre 99,9% de disponibilité de la plateforme", target: 99.9, unit: "%" },
            { title: "Implémenter 100% des fonctionnalités demandées", target: 100, unit: "%" },
            { title: "Obtenir un score de qualité de code de 9/10", target: 9, unit: "/10" }
          ]
        },
        {
          title: "Optimiser l'expérience utilisateur et les performances",
          keyResults: [
            { title: "Atteindre un score d'utilisabilité de 8,5/10", target: 8.5, unit: "/10" },
            { title: "Réduire les erreurs critiques de 90%", target: 90, unit: "%" },
            { title: "Former 100% de l'équipe aux nouvelles technologies", target: 100, unit: "%" }
          ]
        }
      ];
    } else if (isBusiness || isProduct) {
    objectives = [
      {
          title: `Développer ${projectTitle || 'les objectifs business'} et augmenter les revenus`,
        keyResults: [
            { title: "Signer 20 nouveaux partenariats stratégiques", target: 20, unit: "partenariats" },
            { title: "Augmenter les revenus de 30%", target: 30, unit: "%" },
            { title: "Atteindre un taux de satisfaction partenaire de 9/10", target: 9, unit: "/10" }
          ]
        }
      ];
    } else if (isHR) {
      objectives = [
        {
          title: `Améliorer les processus RH et développer les talents pour ${projectTitle || 'le projet'}`,
          keyResults: [
            { title: "Recruter 10 talents qualifiés", target: 10, unit: "talents" },
            { title: "Atteindre un taux de rétention de 95%", target: 95, unit: "%" },
            { title: "Former 100% de l'équipe aux nouvelles compétences", target: 100, unit: "%" }
        ]
      }
    ];
  } else {
      // OKRs adaptés au projet générique mais personnalisés
    objectives = [
      {
          title: `Réussir ${projectTitle || 'le projet'} dans les délais et le budget`,
        keyResults: [
            { title: "Respecter 100% des échéances du projet", target: 100, unit: "%" },
            { title: "Maintenir le budget dans les limites prévues", target: 100, unit: "%" },
            { title: "Atteindre un score de satisfaction de 8/10", target: 8, unit: "/10" }
          ]
        },
        {
          title: `Délivrer ${projectTitle || 'les livrables'} avec excellence et qualité`,
          keyResults: [
            { title: "Compléter 100% des livrables prévus", target: 100, unit: "%" },
            { title: "Obtenir une validation client de 9/10", target: 9, unit: "/10" },
            { title: "Réduire les retours/corrections de 80%", target: 80, unit: "%" }
        ]
      }
    ];
  }
  
    // Retourner 2-3 objectifs
  const shuffled = objectives.sort(() => 0.5 - Math.random());
    const selectedObjectives = shuffled.slice(0, Math.min(3, objectives.length));
  
    console.log('✅ Génération IA OKRs - OKRs générés (fallback):', selectedObjectives.length);
  return selectedObjectives;
  } catch (error) {
    console.error('❌ Erreur génération OKRs:', error);
    // Retourner des OKRs génériques en dernier recours
    return [
      {
        title: `Atteindre les objectifs de ${projectTitle || 'ce projet'}`,
        keyResults: [
          { title: "Respecter les échéances à 100%", target: 100, unit: "%" },
          { title: "Maintenir le budget prévu", target: 100, unit: "%" },
          { title: "Atteindre une satisfaction de 8/10", target: 8, unit: "/10" }
        ]
      }
    ];
  }
};

export const draftSalesEmail = async (contact: Contact, context: string): Promise<string> => {
  const prompt = `Rédige un email commercial professionnel pour contacter ${contact.name} de ${contact.company || 'leur entreprise'} concernant: ${context}. Email à ${contact.email}. Ton amical mais professionnel, de 2-3 paragraphes maximum.`;
  return await callAI(prompt, "Tu es un expert en communication commerciale B2B.");
};

export const summarizeAndCreateDoc = async (text: string): Promise<{ title: string, content: string } | null> => {
  if (!text || !text.trim()) return null;

  // Si pas de clé, fallback local (toujours fonctionnel)
  if (!GEMINI_API_KEY && !GROQ_API_KEY) {
    const lines = text.split('\n').filter(l => l.trim());
    const firstLine = lines[0] || text.substring(0, 60);
    const title = (firstLine || 'Document').slice(0, 80).trim();
    return { title: title || 'Document', content: text.trim() };
  }

  try {
    const systemPrompt = `Tu es un assistant de documentation professionnel.
Résume et structure le texte fourni en Markdown clair et hiérarchisé (titres, listes, tableaux si utile).
Donne un TITRE court et informatif (<= 80 caractères).
Réponds exclusivement en JSON de la forme:
{"title":"...","content":"markdown"}`;

    const raw = await callAI(text, systemPrompt);

    // Essayer d'extraire JSON { title, content }
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed?.title && parsed?.content) {
        return { title: String(parsed.title).slice(0, 80), content: String(parsed.content) };
      }
    }

    // Deuxième tentative: générer séparément titre puis contenu
    const titleOnly = await callAI('Propose un titre concis (<=80 caractères) pour ce contenu:\n' + text,
      'Réponds uniquement par le titre, sans guillemets.');
    const contentMd = await callAI('Réécris et structure ce texte en Markdown clair:\n' + text,
      'Structure en sections, listes, et éventuellement tableaux.');
  return {
      title: (titleOnly || 'Document').replace(/\n/g, ' ').slice(0, 80).trim(),
      content: contentMd || text.trim()
    };
  } catch (error) {
    console.error('Erreur Gemini pour Knowledge Base:', error);
    return { title: 'Document', content: text.trim() };
  }
};

export interface KnowledgeDocParams {
  topic: string;
  audience?: string; // ex: équipe, clients, débutants, avancés
  tone?: string; // professionnel, pédagogique, convaincant
  length?: 'short' | 'medium' | 'long';
  outline?: string; // points clés à couvrir
}

export const generateKnowledgeDocument = async (params: KnowledgeDocParams): Promise<{ title: string, content: string }> => {
  const { topic, audience = 'équipe', tone = 'professionnel', length = 'medium', outline } = params;

  if (!GEMINI_API_KEY && !GROQ_API_KEY) {
    const title = `Note: ${topic}`.slice(0, 80);
    const content = `# ${title}\n\nContenu généré (mode hors-ligne).\n\n- Public: ${audience}\n- Ton: ${tone}\n- Longueur: ${length}\n\nPoints à couvrir:\n${(outline || '').split('\n').map(l=>`- ${l}`).join('\n')}`.trim();
    return { title, content };
  }

  const lengthHint = length === 'short' ? '300-500 mots' : length === 'long' ? '900-1200 mots' : '600-800 mots';
  const systemPrompt = `Tu es un rédacteur technique. Rédige un document de base de connaissances clair et structuré en Markdown. Utilise des titres (H1..H3), listes, et si utile des tableaux.
Le ton doit être ${tone}. Public visé: ${audience}. Longueur cible: ${lengthHint}.
Termine par une section "Ressources complémentaires" si pertinent.
Réponds en JSON {"title":"...","content":"markdown"}.`;
  const prompt = `Sujet: ${topic}\n\n$${outline ? `Plan/points à couvrir:\n${outline}\n\n` : ''}Rédige maintenant le document complet.`.replace('$', '');

  const raw = await callAI(prompt, systemPrompt);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed?.title && parsed?.content) {
        return { title: String(parsed.title).slice(0, 80), content: String(parsed.content) };
      }
    } catch {}
  }
  // Fallback si parsing échoue
  const titleOnly = await callAI(`Propose un titre concis pour: ${topic}`, 'Réponds uniquement par le titre.');
  const contentMd = await callAI(`Rédige en Markdown un document ${tone} pour ${audience} sur: ${topic}. ${outline ? `Plan:\n${outline}` : ''}`, 'Structure claire avec titres et listes.');
  return { title: (titleOnly || topic).slice(0,80), content: contentMd || `# ${topic}` };
};

export const improveKnowledgeContent = async (
  content: string,
  tone: string = 'professionnel'
): Promise<string> => {
  if (!content || !content.trim()) return content;
  if (!GEMINI_API_KEY && !GROQ_API_KEY) return content; // fallback neutre

  const systemPrompt = `Tu es un éditeur technique. Réécris et améliore ce contenu en Markdown avec un ton ${tone}. Clarifie, structure (H2/H3), corrige les fautes, ajoute une courte intro et une conclusion utile. Ne change pas le sens.`;
  const improved = await callAI(content, systemPrompt);
  return improved || content;
};

export const runAIAgent = async (prompt: string, context?: string): Promise<string> => {
  const professionalPolicy = `
Tu es "Coya", un assistant IA professionnel intégré à la plateforme COYA.
Objectif: aider sur le travail, les modules de l'application, procédures administratives, réglementation sénégalaise, gestion de projet, RH, Finance, Juridique, et bonnes pratiques professionnelles.
Règles:
- Ton: professionnel, clair, concis, actionnable.
- Refuse poliment tout contenu inapproprié (insultes, haine, sexe, violence, spam) et réoriente vers un sujet professionnel.
- Pour les sujets réglementaires sénégalais: précise si nécessaire que l'information peut nécessiter validation officielle et cite les références connues quand possible.
- Structure quand utile avec listes, étapes, et exemples.
- Si la question est ambiguë, pose 1-2 questions de clarification.
- Si tu n'es pas certain, indique les hypothèses.
`;

  const scopedContext = context
    ? `Contexte module: ${context}.`
    : '';

  const systemPrompt = `${professionalPolicy}\n${scopedContext}`.trim();
  return await callAI(prompt, systemPrompt);
};

// Exports manquants identifiés dans les erreurs
export const runAuthAIAssistant = async (prompt: string): Promise<string> => {
  const systemPrompt = "Tu es un assistant IA spécialisé dans l'aide et le support pour les utilisateurs. Réponds de manière professionnelle et utile.";
  return await callAI(prompt, systemPrompt);
};

// Configuration pour la génération d'images
const IMAGE_API_PROVIDER = import.meta.env.VITE_IMAGE_API_PROVIDER || 'replicate';
const REPLICATE_API_TOKEN = import.meta.env.VITE_REPLICATE_API_TOKEN || '';
const STABILITY_AI_API_KEY = import.meta.env.VITE_STABILITY_AI_API_KEY || '';

// Génération d'images avec Replicate (support CORS) ou Stability AI
const PLACEHOLDER_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4AWNgYGD4DwABBAEAQP/4YQAAAABJRU5ErkJggg==';
export const generateImage = async (prompt: string): Promise<string> => {
  if (!prompt || !prompt.trim()) {
    throw new Error("Le prompt est requis pour générer une image");
  }

  if (!REPLICATE_API_TOKEN && !STABILITY_AI_API_KEY) {
    console.warn('⚠️ Aucune clé API image configurée, utilisation du placeholder.');
    return PLACEHOLDER_IMAGE_BASE64;
  }

  try {
    if (REPLICATE_API_TOKEN && IMAGE_API_PROVIDER === 'replicate') {
      const model = "stability-ai/stable-diffusion:27b93a2413e7f36cd83da926f3656280b2931564ff050bf9575f1f9be9c32123";
      const apiUrl = "https://api.replicate.com/v1/predictions";
      
      // Créer une prédiction
      const createResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        },
        body: JSON.stringify({
          version: "27b93a2413e7f36cd83da926f3656280b2931564ff050bf9575f1f9be9c32123",
          input: {
            prompt: prompt,
            width: 512,
            height: 512,
            num_outputs: 1,
          }
        })
      });

      if (!createResponse.ok) {
        throw new Error(`Erreur API Replicate ${createResponse.status}`);
      }

      const prediction = await createResponse.json();
      let status = prediction.status;
      let getUrl = prediction.urls?.get;

      // Attendre que la prédiction soit complète (polling)
      while (status === 'starting' || status === 'processing') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const getResponse = await fetch(getUrl, {
          headers: {
            'Authorization': `Token ${REPLICATE_API_TOKEN}`,
          }
        });
        const updated = await getResponse.json();
        status = updated.status;
        if (updated.output) {
          // Récupérer l'image depuis l'URL
          const imageResponse = await fetch(updated.output[0]);
          const blob = await imageResponse.blob();
          const reader = new FileReader();
          return new Promise((resolve, reject) => {
            reader.onloadend = () => {
              const base64String = (reader.result as string).split(',')[1];
              resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      }

      throw new Error(`La génération d'image a échoué avec le statut: ${status}`);
    }

    if (STABILITY_AI_API_KEY && IMAGE_API_PROVIDER === 'stability') {
      const apiUrl = "https://api.stability.ai/v2beta/stable-image/generate/sd3";
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STABILITY_AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          output_format: 'png',
          aspect_ratio: '1:1',
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur API Stability AI ${response.status}`);
      }

      const blob = await response.blob();
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    return PLACEHOLDER_IMAGE_BASE64;
  } catch (error: any) {
    console.error('❌ Erreur génération d\'image:', error);
    return PLACEHOLDER_IMAGE_BASE64;
  }
};

// Édition d'images avec Replicate Instruct Pix2Pix
export const editImage = async (
  imageData: string, 
  mimeType: string, 
  editPrompt: string
): Promise<{ image: string }> => {
  if (!imageData || !editPrompt || !editPrompt.trim()) {
    throw new Error("L'image et le prompt d'édition sont requis");
  }

  try {
    // Utiliser Replicate Instruct Pix2Pix si une clé API est fournie
    if (REPLICATE_API_TOKEN && IMAGE_API_PROVIDER === 'replicate') {
      const model = "timbrooks/instruct-pix2pix:0eb9b1f5-4d1c-4c7a-8f7b-5e6d7c8b9a0f";
      const apiUrl = "https://api.replicate.com/v1/predictions";
      
      // Convertir l'image base64 en blob puis en URL de données
      const imageBlob = await fetch(`data:${mimeType};base64,${imageData}`).then(r => r.blob());
      const imageUrl = URL.createObjectURL(imageBlob);
      
      // Créer une prédiction pour l'édition
      const createResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        },
        body: JSON.stringify({
          version: "0eb9b1f5-4d1c-4c7a-8f7b-5e6d7c8b9a0f",
          input: {
            image: imageUrl,
            prompt: editPrompt,
            num_outputs: 1,
          }
        })
      });

      if (!createResponse.ok) {
        throw new Error(`Erreur API Replicate ${createResponse.status}`);
      }

      const prediction = await createResponse.json();
      let status = prediction.status;
      let getUrl = prediction.urls?.get;

      // Attendre que la prédiction soit complète
      while (status === 'starting' || status === 'processing') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const getResponse = await fetch(getUrl, {
          headers: {
            'Authorization': `Token ${REPLICATE_API_TOKEN}`,
          }
        });
        const updated = await getResponse.json();
        status = updated.status;
        if (updated.output) {
          const imageResponse = await fetch(updated.output[0]);
          const blob = await imageResponse.blob();
          const reader = new FileReader();
          return new Promise((resolve, reject) => {
            reader.onloadend = () => {
              const base64String = (reader.result as string).split(',')[1];
              resolve({ image: base64String });
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      }

      throw new Error(`L'édition d'image a échoué avec le statut: ${status}`);
    }

    // Fallback: Si l'édition n'est pas disponible, utiliser la génération avec le prompt amélioré
    console.log('🔄 Utilisation du fallback pour l\'édition d\'image...');
    const enhancedPrompt = `${editPrompt}, based on the original image, same style and composition`;
    const generatedBase64 = await generateImage(enhancedPrompt);
    return { image: generatedBase64 };
  } catch (error: any) {
    console.error('❌ Erreur édition d\'image:', error);
    
    // Dernier recours: utiliser la génération avec le prompt amélioré
    try {
      console.log('🔄 Tentative de fallback final pour l\'édition d\'image...');
      const enhancedPrompt = `${editPrompt}, based on the original image, same style and composition`;
      const generatedBase64 = await generateImage(enhancedPrompt);
      return { image: generatedBase64 };
    } catch (fallbackError: any) {
      throw new Error(`Erreur lors de l'édition d'image: ${error.message}. Note: L'édition d'images nécessite une clé API Replicate (VITE_REPLICATE_API_TOKEN).`);
    }
  }
};

export const enhanceProjectTasks = async (tasks: Task[]): Promise<Task[]> => {
  return tasks;
};

export const generateStatusReport = async (project: Project): Promise<string> => {
  const taskSummary = project.tasks.map(t => `- ${t.text} (${t.status})`).join('\n');
  const prompt = `Génère un rapport de statut professionnel pour le projet "${project.title}". Description: ${project.description}. Statut: ${project.status}. Tâches:\n${taskSummary}\n\nDate échéance: ${project.dueDate || 'Non définie'}`;
  const systemPrompt = "Tu es un expert en gestion de projet. Génère des rapports de statut clairs et professionnels.";
  return await callAI(prompt, systemPrompt);
};

export const summarizeTasks = async (tasks: Task[]): Promise<string> => {
  const taskList = tasks.map((t, i) => `${i + 1}. ${t.text} (Priorité: ${t.priority}, Statut: ${t.status})`).join('\n');
  const prompt = `Résume et analyse les tâches suivantes:\n${taskList}\n\nFournis un résumé concis de l'état d'avancement.`;
  const systemPrompt = "Tu es un expert en gestion de projets. Résume efficacement l'état des tâches.";
  return await callAI(prompt, systemPrompt);
};