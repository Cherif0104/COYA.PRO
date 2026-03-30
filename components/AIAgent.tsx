import React, { useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';

interface AIAgentProps {
  currentView: string;
  onOpenMessaging?: (target?: 'channels' | 'direct') => void;
  onOpenTicketIT?: () => void;
}

const AIAgent: React.FC<AIAgentProps> = ({ onOpenMessaging, onOpenTicketIT }) => {
  const { t } = useLocalization();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="bg-slate-900 text-white w-16 h-16 rounded-full shadow-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-700 flex items-center justify-center transform hover:scale-110 transition-transform"
          aria-label={t('messagerie') || 'Messagerie'}
        >
          <i className={`fas ${isOpen ? 'fa-times' : 'fa-envelope'} text-2xl`} />
        </button>
      </div>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 border border-slate-200 overflow-hidden">
          <header className="bg-slate-900 text-white p-4 rounded-t-2xl flex justify-between items-center">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <i className="fas fa-bolt" />
              {t('messagerie') || 'Messagerie'}
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-white hover:bg-slate-800 rounded-full w-8 h-8 flex items-center justify-center">
              <i className="fas fa-times" />
            </button>
          </header>
          <main className="p-4 bg-slate-50">
            <p className="text-sm text-slate-600 mb-3">
              Raccourcis rapides pour la messagerie et le support.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onOpenMessaging?.('channels');
                  setIsOpen(false);
                }}
                className="text-left text-sm text-slate-700 py-3 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-medium"
              >
                <i className="fas fa-hashtag mr-2" aria-hidden />
                Canaux
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenMessaging?.('direct');
                  setIsOpen(false);
                }}
                className="text-left text-sm text-slate-700 py-3 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-medium"
              >
                <i className="fas fa-comment-dots mr-2" aria-hidden />
                Direct
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenMessaging?.('channels');
                  setIsOpen(false);
                }}
                className="text-left text-sm text-slate-700 py-3 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-medium"
              >
                <i className="fas fa-inbox mr-2" aria-hidden />
                Messagerie
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenTicketIT?.();
                  setIsOpen(false);
                }}
                className="text-left text-sm text-slate-700 py-3 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-medium"
              >
                <i className="fas fa-ticket-alt mr-2" aria-hidden />
                Ticket IT
              </button>
            </div>
          </main>
        </div>
      )}
    </>
  );
};

export default AIAgent;
