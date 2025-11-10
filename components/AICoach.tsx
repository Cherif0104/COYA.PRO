import React, { useState, useRef, useEffect } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { runAICoach } from '../services/geminiService';

interface Conversation {
  id: string;
  userPrompt: string;
  aiResponse: string;
  timestamp: Date;
}

const AICoach: React.FC = () => {
  const { t } = useLocalization();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setErrorMessage(null);
    setResponse('');
    try {
      const result = await runAICoach(prompt);
      const cleaned = (result || '').trim();
      setResponse(cleaned);

      if (!cleaned) {
        setErrorMessage("L'assistant n'a pas pu générer de réponse. Réessayez plus tard.");
      } else if (cleaned.toLowerCase().includes('clé api')) {
        setErrorMessage("Les clés API IA (Gemini ou Groq) ne sont pas configurées. Ajoutez-les dans votre fichier .env pour activer les fonctionnalités IA.");
      }

      if (cleaned) {
        const newConversation: Conversation = {
          id: `conv-${Date.now()}`,
          userPrompt: prompt,
          aiResponse: cleaned,
          timestamp: new Date()
        };
        setConversations(prev => [newConversation, ...prev]);
        setSelectedConversation(newConversation.id);
      }
    } catch (error: any) {
      console.error("❌ Erreur AICoach:", error);
      setErrorMessage("Impossible de contacter l'assistant IA. Vérifiez votre connexion internet ou la configuration des clés API, puis réessayez.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (responseRef.current) {
        responseRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [response, conversations]);
  
  const formatResponse = (text: string) => {
    return text
      .split('\n')
      .map((line, index) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return <h3 key={index} className="text-lg font-bold mt-4 mb-2 text-gray-800">{line.replace(/\*\*/g, '')}</h3>;
        }
        if (line.startsWith('* ')) {
          return <li key={index} className="ml-5 list-disc">{line.substring(2)}</li>;
        }
        return <p key={index} className="mb-2">{line}</p>;
      });
  };

  const handleClearHistory = () => {
    setErrorMessage(null);
    setConversations([]);
    setResponse('');
    setSelectedConversation(null);
  };

  const quickPrompts = [
    { label: 'Conseils de productivité', prompt: 'Donne-moi 5 conseils pour améliorer ma productivité au travail' },
    { label: 'Gestion du temps', prompt: 'Comment mieux gérer mon temps pour mes projets ?' },
    { label: 'Communication d\'équipe', prompt: 'Conseils pour améliorer la communication avec mon équipe' },
    { label: 'Gestion du stress', prompt: 'Comment gérer le stress au travail efficacement ?' },
  ];

  const metrics = {
    totalConversations: conversations.length,
    thisWeek: conversations.filter(c => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return c.timestamp >= weekAgo;
    }).length,
    responseTime: '2.5s'
  };

  return (
    <div>
      {/* Header avec gradient */}
      <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-t-lg overflow-hidden mb-6">
        <div className="p-6 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center">
                <i className="fas fa-robot mr-3"></i>
                {t('ai_coach_title')}
              </h1>
              <p className="text-emerald-100">{t('ai_coach_subtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Métriques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Conversations Totales</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{metrics.totalConversations}</p>
            </div>
            <div className="bg-emerald-100 rounded-full p-3">
              <i className="fas fa-comments text-emerald-600 text-xl"></i>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Cette Semaine</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{metrics.thisWeek}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <i className="fas fa-calendar-week text-blue-600 text-xl"></i>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-teal-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Temps de Réponse</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{metrics.responseTime}</p>
            </div>
            <div className="bg-teal-100 rounded-full p-3">
              <i className="fas fa-clock text-teal-600 text-xl"></i>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulaire de conversation */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Nouvelle Conversation</h2>
              {errorMessage && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <i className="fas fa-circle-exclamation mr-2"></i>
                  {errorMessage}
                </div>
              )}
              
              {/* Suggestions rapides */}
              {!response && conversations.length === 0 && (
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-3">Suggestions rapides :</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {quickPrompts.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => setPrompt(suggestion.prompt)}
                        className="text-left p-3 border border-gray-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
                      >
                        <p className="text-sm font-medium text-gray-700">{suggestion.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t('ai_coach_prompt_placeholder')}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            rows={4}
            disabled={loading}
          />
          <button
            type="submit"
                  disabled={loading || !prompt.trim()}
                  className="mt-4 w-full bg-gradient-to-r from-emerald-600 to-blue-600 text-white py-3 rounded-md font-semibold hover:from-emerald-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                {t('ai_coach_thinking')}
              </>
            ) : (
                    <>
                      <i className="fas fa-paper-plane mr-2"></i>
                      {t('ai_coach_button')}
                    </>
            )}
          </button>
        </form>
      </div>

            {/* Réponse AI */}
      {(loading || response) && (
              <div ref={responseRef} className="px-6 pb-6 border-t border-gray-200">
                <h3 className="text-lg font-bold text-gray-700 my-4">{t('ai_coach_response_title')}</h3>
                <div className="bg-gray-50 p-6 rounded-lg min-h-[100px]">
                {loading && (
                    <div className="flex justify-center items-center h-full">
                      <div className="text-center">
                        <i className="fas fa-spinner fa-spin text-3xl text-emerald-500 mb-2"></i>
                        <p className="text-gray-600">L'IA réfléchit...</p>
                      </div>
                    </div>
                )}
                {response && (
                    <div className="prose prose-emerald max-w-none text-gray-700">{formatResponse(response)}</div>
                )}
            </div>
        </div>
      )}
          </div>
        </div>

        {/* Historique des conversations */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">Historique</h2>
            {conversations.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="text-sm text-red-600 hover:text-red-700"
                title="Effacer l'historique"
              >
                <i className="fas fa-trash mr-1"></i>
                Effacer
              </button>
            )}
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <i className="fas fa-comments text-4xl mb-3 opacity-20"></i>
                <p>Aucune conversation</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setSelectedConversation(conv.id);
                      setResponse(conv.aiResponse);
                      setPrompt(conv.userPrompt);
                    }}
                    className={`p-4 cursor-pointer hover:bg-emerald-50 transition-colors ${
                      selectedConversation === conv.id ? 'bg-emerald-100' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-xs text-gray-500">
                        {conv.timestamp.toLocaleDateString('fr-FR', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">{conv.userPrompt}</p>
                    <p className="text-xs text-emerald-600 mt-1 line-clamp-1">{conv.aiResponse.substring(0, 50)}...</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AICoach;
