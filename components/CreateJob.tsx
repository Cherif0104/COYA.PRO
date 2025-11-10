
import React, { useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import { Job } from '../types';

interface CreateJobProps {
  onAddJob: (job: Job) => void;
  onBack: () => void;
}

const CreateJob: React.FC<CreateJobProps> = ({ onAddJob, onBack }) => {
  const { t } = useLocalization();
  const { user } = useAuth();
  
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState<'Full-time' | 'Part-time' | 'Contract' | 'Freelance' | 'Internship' | 'Temporary' | 'Fixed-term' | 'Permanent' | 'Seasonal' | 'Volunteer'>('Full-time');
  const [description, setDescription] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [sector, setSector] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<'Entry' | 'Mid' | 'Senior' | 'Executive' | 'Intern' | 'Graduate'>('Mid');
  const [remoteWork, setRemoteWork] = useState<'Remote' | 'Hybrid' | 'On-site'>('On-site');
  const [salary, setSalary] = useState('');
  const [benefits, setBenefits] = useState('');
  const [education, setEducation] = useState('');
  const [languages, setLanguages] = useState('');
  const [applicationLink, setApplicationLink] = useState('');
  const [applicationEmail, setApplicationEmail] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [status, setStatus] = useState<'published' | 'draft'>('published');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !company || !description) return;

    const newJob: Job = {
      id: Date.now(),
      title,
      company,
      location,
      type,
      description,
      requiredSkills: requiredSkills.split(',').map(skill => skill.trim()).filter(Boolean),
      postedDate: new Date().toLocaleDateString('fr-FR'),
      applicants: [],
      status: status, // Statut choisi
      // Champs supplémentaires
      sector: sector || undefined,
      experienceLevel: experienceLevel || undefined,
      remoteWork: remoteWork || undefined,
      salary: salary || undefined,
      benefits: benefits || undefined,
      education: education || undefined,
      languages: languages || undefined,
      applicationLink: applicationLink || undefined,
      applicationEmail: applicationEmail || undefined,
      companyWebsite: companyWebsite || undefined
    };
    onAddJob(newJob);
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto">
      {/* Header sticky */}
      <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-lg z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <i className="fas fa-arrow-left text-xl"></i>
              </button>
    <div>
                <h1 className="text-2xl font-bold">
                  {t('create_new_job')}
                </h1>
                <p className="text-emerald-50 text-sm mt-1">
                  Créez une nouvelle offre d'emploi pour attirer les talents
                </p>
              </div>
            </div>
             <button
               type="submit"
               form="job-form"
               className={`text-white font-bold py-2 px-6 rounded-lg transition-all shadow-md ${
                 status === 'published' 
                   ? 'bg-emerald-600 hover:bg-emerald-700' 
                   : 'bg-gray-600 hover:bg-gray-700'
               }`}
             >
               <i className={`fas ${status === 'published' ? 'fa-globe' : 'fa-save'} mr-2`}></i>
               {status === 'published' ? 'Publier' : 'Brouillon'}
      </button>
          </div>
        </div>
      </div>

      {/* Formulaire scrollable */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form id="job-form" onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          <div>
            <label htmlFor="job-title" className="block text-sm font-medium text-gray-700">{t('job_title')}</label>
            <input type="text" id="job-title" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"/>
          </div>
          <div>
            <label htmlFor="company-name" className="block text-sm font-medium text-gray-700">{t('company_name')}</label>
            <input type="text" id="company-name" value={company} onChange={e => setCompany(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"/>
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">{t('job_location')}</label>
            <input type="text" id="location" value={location} onChange={e => setLocation(e.target.value)} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"/>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="job-type" className="block text-sm font-medium text-gray-700 mb-2">Type de contrat *</label>
              <select id="job-type" value={type} onChange={e => setType(e.target.value as any)} className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                <option value="Full-time">Temps plein</option>
                <option value="Part-time">Temps partiel</option>
                <option value="Contract">CDD</option>
                <option value="Freelance">Freelance / Indépendant</option>
                <option value="Internship">Stage</option>
                <option value="Temporary">Intérim</option>
                <option value="Fixed-term">Contrat à durée déterminée</option>
                <option value="Permanent">Permanent / CDI</option>
                <option value="Seasonal">Saisonnier</option>
                <option value="Volunteer">Bénévole</option>
              </select>
            </div>

            <div>
              <label htmlFor="experience-level" className="block text-sm font-medium text-gray-700 mb-2">Niveau d'expérience *</label>
              <select id="experience-level" value={experienceLevel} onChange={e => setExperienceLevel(e.target.value as any)} className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                <option value="Entry">Débutant (0-2 ans)</option>
                <option value="Mid">Intermédiaire (2-5 ans)</option>
                <option value="Senior">Sénior (5-10 ans)</option>
                <option value="Executive">Executive (10+ ans)</option>
                <option value="Intern">Stagiaire</option>
                <option value="Graduate">Junior / Diplômé</option>
              </select>
            </div>

            <div>
              <label htmlFor="remote-work" className="block text-sm font-medium text-gray-700 mb-2">Mode de travail *</label>
              <select id="remote-work" value={remoteWork} onChange={e => setRemoteWork(e.target.value as any)} className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                <option value="On-site">Sur site</option>
                <option value="Hybrid">Hybride (mixte)</option>
                <option value="Remote">Télétravail complet</option>
              </select>
            </div>

          <div>
              <label htmlFor="sector" className="block text-sm font-medium text-gray-700 mb-2">Secteur d'activité</label>
              <select id="sector" value={sector} onChange={e => setSector(e.target.value)} className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                <option value="">Sélectionner un secteur</option>
                <option value="IT & Tech">IT & Technologie</option>
                <option value="Finance">Finance & Banque</option>
                <option value="Healthcare">Santé & Médecine</option>
                <option value="Education">Éducation & Formation</option>
                <option value="Marketing">Marketing & Communication</option>
                <option value="Sales">Vente & Commercial</option>
                <option value="HR">Ressources Humaines</option>
                <option value="Engineering">Ingénierie</option>
                <option value="Design">Design & Créatif</option>
                <option value="Legal">Juridique</option>
                <option value="Consulting">Conseil</option>
                <option value="Real Estate">Immobilier</option>
                <option value="Hospitality">Hôtellerie & Restauration</option>
                <option value="Retail">Commerce & Distribution</option>
                <option value="Manufacturing">Industrie & Manufacturing</option>
                <option value="Media">Médias & Presse</option>
                <option value="Non-profit">Associatif & ONG</option>
                <option value="Other">Autre</option>
            </select>
            </div>
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">{t('job_description')}</label>
            <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} required rows={5} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"></textarea>
          </div>
          <div>
            <label htmlFor="required-skills" className="block text-sm font-medium text-gray-700 mb-2">Compétences requises *</label>
            <input 
              type="text" 
              id="required-skills" 
              value={requiredSkills} 
              onChange={e => setRequiredSkills(e.target.value)} 
              placeholder="Ex: JavaScript, React, MongoDB, Git (séparées par des virgules)"
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <p className="mt-1 text-xs text-gray-500">Listez les compétences techniques et professionnelles requises, séparées par des virgules</p>
          </div>

          <div>
            <label htmlFor="education" className="block text-sm font-medium text-gray-700 mb-2">Formation / Diplôme</label>
            <input 
              type="text" 
              id="education" 
              value={education} 
              onChange={e => setEducation(e.target.value)} 
              placeholder="Ex: Bac+2, Licence, Master, Ingénieur..."
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="languages" className="block text-sm font-medium text-gray-700 mb-2">Langues requises</label>
            <input 
              type="text" 
              id="languages" 
              value={languages} 
              onChange={e => setLanguages(e.target.value)} 
              placeholder="Ex: Français (courant), Anglais (professionnel), Espagnol (bases)"
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="salary" className="block text-sm font-medium text-gray-700 mb-2">Rémunération</label>
              <input 
                type="text" 
                id="salary" 
                value={salary} 
                onChange={e => setSalary(e.target.value)} 
                placeholder="Ex: 45-55K€, Selon profil, À négocier"
                className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="benefits" className="block text-sm font-medium text-gray-700 mb-2">Avantages</label>
              <input 
                type="text" 
                id="benefits" 
                value={benefits} 
                onChange={e => setBenefits(e.target.value)} 
                placeholder="Ex: Mutuelle, CE, télétravail, voiture..."
                className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Section Liens communiqués */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              <i className="fas fa-link mr-2 text-emerald-600"></i>
              Liens et Informations de Contact
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Fournissez les informations nécessaires pour que les candidats puissent postuler à cette offre.
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="application-link" className="block text-sm font-medium text-gray-700 mb-2">
                  <i className="fas fa-external-link-alt mr-2"></i>
                  Lien de candidature (URL)
                </label>
                <input 
                  type="url" 
                  id="application-link" 
                  value={applicationLink} 
                  onChange={e => setApplicationLink(e.target.value)} 
                  placeholder="https://career.company.com/apply/job123"
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <p className="mt-1 text-xs text-gray-500">Lien vers le formulaire de candidature en ligne</p>
              </div>

              <div>
                <label htmlFor="application-email" className="block text-sm font-medium text-gray-700 mb-2">
                  <i className="fas fa-envelope mr-2"></i>
                  Email de candidature
                </label>
                <input 
                  type="email" 
                  id="application-email" 
                  value={applicationEmail} 
                  onChange={e => setApplicationEmail(e.target.value)} 
                  placeholder="recruitment@company.com"
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <p className="mt-1 text-xs text-gray-500">Email où les candidats doivent envoyer leur CV</p>
          </div>

          <div>
                <label htmlFor="company-website" className="block text-sm font-medium text-gray-700 mb-2">
                  <i className="fas fa-globe mr-2"></i>
                  Site web de l'entreprise
                </label>
                <input 
                  type="url" 
                  id="company-website" 
                  value={companyWebsite} 
                  onChange={e => setCompanyWebsite(e.target.value)} 
                  placeholder="https://www.company.com"
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <p className="mt-1 text-xs text-gray-500">Site officiel de l'entreprise</p>
              </div>
            </div>
          </div>

          {/* Statut de publication */}
          <div className="pt-4 border-t border-gray-200">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              <i className="fas fa-eye mr-2 text-emerald-600"></i>
              Statut de publication
            </label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="published"
                  checked={status === 'published'}
                  onChange={(e) => setStatus(e.target.value as 'published' | 'draft')}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  <i className="fas fa-globe mr-1 text-green-500"></i>
                  Publié (visible par tous)
                </span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="draft"
                  checked={status === 'draft'}
                  onChange={(e) => setStatus(e.target.value as 'published' | 'draft')}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  <i className="fas fa-save mr-1 text-gray-500"></i>
                  Brouillon (non visible)
                </span>
              </label>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {status === 'published' 
                ? 'L\'offre sera immédiatement visible pour tous les utilisateurs.' 
                : 'L\'offre sera sauvegardée mais ne sera pas visible publiquement.'}
            </p>
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={onBack}
              className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                status === 'published' 
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              <i className={`fas ${status === 'published' ? 'fa-globe' : 'fa-save'} mr-2`}></i>
              {status === 'published' ? 'Publier l\'offre' : 'Sauvegarder en brouillon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateJob;

