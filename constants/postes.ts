import type { Poste } from '../types';

/**
 * Liste par défaut d'intitulés de poste (référentiel extensible).
 * Peut être remplacée plus tard par une table Supabase ou un service organisation.
 */
export const DEFAULT_POSTES: Pick<Poste, 'id' | 'name'>[] = [
  { id: 'dg', name: 'Directeur(trice) Général(e)' },
  { id: 'daf', name: 'Directeur(trice) Administratif(ve) et Financier(ère)' },
  { id: 'drh', name: 'Directeur(trice) des Ressources Humaines' },
  { id: 'chef_projet', name: 'Chef(fe) de Projet' },
  { id: 'charge_projet', name: 'Chargé(e) de Projet' },
  { id: 'formateur', name: 'Formateur(trice)' },
  { id: 'coach', name: 'Coach' },
  { id: 'facilitateur', name: 'Facilitateur(trice)' },
  { id: 'mentor', name: 'Mentor(e)' },
  { id: 'assistant', name: 'Assistant(e)' },
  { id: 'stagiaire', name: 'Stagiaire' },
  { id: 'entrepreneur', name: 'Entrepreneur(e)' },
  { id: 'autre', name: 'Autre' },
];

export function getPosteNameById(id: string): string | undefined {
  return DEFAULT_POSTES.find((p) => p.id === id)?.name;
}
