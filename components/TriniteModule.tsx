import React from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { Language } from '../types';
import { useAppNavigation } from '../contexts/AppNavigationContext';

/** Trinité : scoring Ndiguel, Yar, Barké – liens vers RH et parc pour alimenter les indicateurs */
const TriniteModule: React.FC = () => {
  const { language } = useLocalization();
  const isFr = language === Language.FR;
  const nav = useAppNavigation();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 text-slate-900">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <i className="fas fa-gem text-slate-600" />
          Trinité
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          {isFr
            ? 'Ndiguel, Yar, Barké : la moyenne sert aux évaluations trimestrielles, semestrielles ou annuelles. Les données RH et le parc automobile peuvent nourrir les indicateurs.'
            : 'Ndiguel, Yar, Barké: averages feed quarterly, semi-annual, or annual reviews. HR and fleet data can feed indicators.'}
        </p>
      </header>

      <div className="space-y-6">
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <i className="fas fa-chart-line text-slate-600" />
            {isFr ? 'Connexions métier' : 'Business connections'}
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            {isFr
              ? 'Ouvrez les modules sources pour alimenter ou consolider le scoring Trinité.'
              : 'Open the source modules to feed or consolidate Trinité scoring.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => nav?.setView('rh')}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50"
            >
              <i className="fas fa-users-cog mr-2" />
              {isFr ? 'Ressources humaines' : 'Human resources'}
            </button>
            <button
              type="button"
              onClick={() => nav?.setView('parc_auto')}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50"
            >
              <i className="fas fa-car mr-2" />
              {isFr ? 'Parc automobile' : 'Fleet'}
            </button>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <i className="fas fa-calculator text-slate-600" />
            {isFr ? 'Scores (à brancher)' : 'Scores (to be wired)'}
          </h2>
          <p className="text-sm text-slate-600">
            {isFr
              ? 'Le tableau de scoring Ndiguel / Yar / Barké sera affiché ici une fois le calcul branché sur les données.'
              : 'The Ndiguel / Yar / Barké score grid will appear here once wired to data.'}
          </p>
        </section>
      </div>
    </div>
  );
};

export default TriniteModule;
