/**
 * Champs standardisés pour la collecte participants (ONG / suivi terrain).
 * Clés stables en snake_case pour payload JSON, CRM et grille programme.
 */

export type CollecteParticipantFieldType = 'text' | 'email' | 'tel' | 'number' | 'date' | 'select' | 'textarea';

export type CollecteParticipantFieldGroup = 'identity' | 'location' | 'contact' | 'socio' | 'enterprise' | 'other';

export interface CollecteParticipantFieldDef {
  key: string;
  labelFr: string;
  labelEn: string;
  type: CollecteParticipantFieldType;
  /** Pour select : value = libellé stocké */
  optionsFr?: string[];
  optionsEn?: string[];
  /** largeur en grille formulaire */
  gridSpan?: 1 | 2 | 3;
  group: CollecteParticipantFieldGroup;
  /** Clés alternatives reconnues par upsertParticipantPayloadToCrm (legacy) */
  legacyKeys?: string[];
}

export const COLLECTE_PARTICIPANT_FIELD_DEFS: CollecteParticipantFieldDef[] = [
  // Identité
  {
    key: 'last_name',
    labelFr: 'Nom de famille',
    labelEn: 'Last name',
    type: 'text',
    gridSpan: 1,
    group: 'identity',
    legacyKeys: ['nom', 'lastname', 'family_name'],
  },
  {
    key: 'first_name',
    labelFr: 'Prénom',
    labelEn: 'First name',
    type: 'text',
    gridSpan: 1,
    group: 'identity',
    legacyKeys: ['prenom', 'firstname', 'given_name'],
  },
  {
    key: 'gender',
    labelFr: 'Sexe (auto-déclaré)',
    labelEn: 'Gender (self-reported)',
    type: 'select',
    optionsFr: ['', 'F', 'M', 'Autre', 'Ne souhaite pas répondre'],
    optionsEn: ['', 'F', 'M', 'Other', 'Prefer not to say'],
    gridSpan: 1,
    group: 'identity',
  },
  {
    key: 'age',
    labelFr: 'Âge',
    labelEn: 'Age',
    type: 'number',
    gridSpan: 1,
    group: 'identity',
  },
  {
    key: 'birth_date',
    labelFr: 'Date de naissance',
    labelEn: 'Date of birth',
    type: 'date',
    gridSpan: 1,
    group: 'identity',
  },
  // Localisation
  {
    key: 'country',
    labelFr: 'Pays',
    labelEn: 'Country',
    type: 'text',
    gridSpan: 1,
    group: 'location',
  },
  {
    key: 'region',
    labelFr: 'Région',
    labelEn: 'Region / state',
    type: 'text',
    gridSpan: 1,
    group: 'location',
  },
  {
    key: 'department',
    labelFr: 'Département',
    labelEn: 'Department / district',
    type: 'text',
    gridSpan: 1,
    group: 'location',
  },
  {
    key: 'locality',
    labelFr: 'Commune / localité',
    labelEn: 'Commune / locality',
    type: 'text',
    gridSpan: 2,
    group: 'location',
  },
  // Contact
  {
    key: 'email',
    labelFr: 'Courriel',
    labelEn: 'Email',
    type: 'email',
    gridSpan: 2,
    group: 'contact',
    legacyKeys: ['mail', 'courriel', 'e-mail'],
  },
  {
    key: 'phone',
    labelFr: 'Téléphone',
    labelEn: 'Phone',
    type: 'tel',
    gridSpan: 1,
    group: 'contact',
    legacyKeys: ['telephone', 'tel', 'mobile', 'portable'],
  },
  {
    key: 'whatsapp',
    labelFr: 'WhatsApp',
    labelEn: 'WhatsApp',
    type: 'tel',
    gridSpan: 1,
    group: 'contact',
  },
  // Socio-économique
  {
    key: 'profession',
    labelFr: 'Profession / activité principale',
    labelEn: 'Occupation / main activity',
    type: 'text',
    gridSpan: 2,
    group: 'socio',
  },
  {
    key: 'education_level',
    labelFr: "Niveau d'éducation",
    labelEn: 'Education level',
    type: 'select',
    optionsFr: ['', 'Aucun', 'Primaire', 'Secondaire', 'Technique / pro', 'Supérieur', 'Autre'],
    optionsEn: ['', 'None', 'Primary', 'Secondary', 'Technical / vocational', 'Tertiary', 'Other'],
    gridSpan: 1,
    group: 'socio',
  },
  {
    key: 'sector',
    labelFr: 'Secteur d’activité',
    labelEn: 'Sector of activity',
    type: 'text',
    gridSpan: 1,
    group: 'socio',
  },
  // Formalisation / entreprise (ex. contexte SN NINEA)
  {
    key: 'formal_business',
    labelFr: 'Activité formalisée ?',
    labelEn: 'Formalised activity?',
    type: 'select',
    optionsFr: ['', 'Oui', 'Non', 'Ne sait pas'],
    optionsEn: ['', 'Yes', 'No', 'Unknown'],
    gridSpan: 1,
    group: 'enterprise',
  },
  {
    key: 'commerce_registry',
    labelFr: 'Immatriculé au registre de commerce ?',
    labelEn: 'Registered in trade registry?',
    type: 'select',
    optionsFr: ['', 'Oui', 'Non', 'Ne sait pas'],
    optionsEn: ['', 'Yes', 'No', 'Unknown'],
    gridSpan: 1,
    group: 'enterprise',
  },
  {
    key: 'tax_id_ninea',
    labelFr: 'NINEA / n° identification fiscale',
    labelEn: 'Tax ID / NINEA',
    type: 'text',
    gridSpan: 2,
    group: 'enterprise',
    legacyKeys: ['ninea', 'ninea_numero', 'identifiant_fiscal'],
  },
  // Suivi programme
  {
    key: 'participant_internal_id',
    labelFr: 'ID participant (interne)',
    labelEn: 'Internal participant ID',
    type: 'text',
    gridSpan: 1,
    group: 'other',
  },
  {
    key: 'household_id',
    labelFr: 'ID ménage (dédoublonnage)',
    labelEn: 'Household ID (deduplication)',
    type: 'text',
    gridSpan: 1,
    group: 'other',
  },
  {
    key: 'comments',
    labelFr: 'Commentaires / données qualitatives',
    labelEn: 'Comments / qualitative notes',
    type: 'textarea',
    gridSpan: 3,
    group: 'other',
  },
];

export const COLLECTE_GRID_COLUMN_KEYS = COLLECTE_PARTICIPANT_FIELD_DEFS.map((d) => d.key);

export function emptyParticipantPayload(): Record<string, string> {
  const o: Record<string, string> = {};
  COLLECTE_PARTICIPANT_FIELD_DEFS.forEach((d) => {
    o[d.key] = '';
  });
  return o;
}

export function collecteGroupLabel(group: CollecteParticipantFieldGroup, isFr: boolean): string {
  const m: Record<CollecteParticipantFieldGroup, [string, string]> = {
    identity: ['Identité', 'Identity'],
    location: ['Localisation', 'Location'],
    contact: ['Coordonnées', 'Contact'],
    socio: ['Profil socio-économique', 'Socio-economic profile'],
    enterprise: ['Formalisation / entreprise', 'Formalisation / business'],
    other: ['Suivi programme', 'Programme tracking'],
  };
  return isFr ? m[group][0] : m[group][1];
}

export function buildFullNameFromPayload(payload: Record<string, string>): string {
  const fn = (payload.first_name || '').trim();
  const ln = (payload.last_name || '').trim();
  if (fn && ln) return `${fn} ${ln}`.trim();
  return fn || ln || '';
}

const defByKey = new Map(COLLECTE_PARTICIPANT_FIELD_DEFS.map((d) => [d.key, d]));

export function getCollecteColumnLabel(key: string, isFr: boolean): string {
  const d = defByKey.get(key);
  if (d) return isFr ? d.labelFr : d.labelEn;
  return key;
}

/** Colonnes grille : ordre standard + clés legacy ou custom présentes dans les lignes. */
export function collecteGridColumnKeysForRows(rows: { rowData: Record<string, string> }[]): string[] {
  const extra = new Set<string>();
  rows.forEach((r) => {
    Object.keys(r.rowData || {}).forEach((k) => {
      if (!COLLECTE_GRID_COLUMN_KEYS.includes(k)) extra.add(k);
    });
  });
  return [...COLLECTE_GRID_COLUMN_KEYS, ...Array.from(extra).sort()];
}
