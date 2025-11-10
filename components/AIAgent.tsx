import React, { useState, useEffect, useRef } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { runAIAgent } from '../services/geminiService';
import { AgentMessage } from '../types';

interface AIAgentProps {
  currentView: string;
  proactiveSuggestion?: {
    text: string;
    prompt: string;
  } | null;
}

const AIAgent: React.FC<AIAgentProps> = ({ currentView, proactiveSuggestion }) => {
  const { t } = useLocalization();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const getWelcomeMessage = (view: string) => {
    const key = `ai_agent_welcome_${view}` as any;
    const welcomeText = t(key);
    // If a specific welcome message doesn't exist for the view, it will fall back to the key name.
    // Check if the fallback happened and provide a default.
    if (welcomeText === key || !welcomeText) {
        return t('ai_agent_welcome_default');
    }
    return welcomeText;
  };
  
  const isDisallowed = (text: string): boolean => {
    const bannedPatterns = [
      /insulte/i, /injure/i, /grossièreté/i, /racisme/i, /haine/i, /sexuel/i, /porn/i,
      /violence gratuite/i, /terror/i, /arnaque/i
    ];
    return bannedPatterns.some((rx) => rx.test(text));
  };

  const handleSend = async (promptOverride?: string) => {
    const promptToSend = promptOverride || userInput;
    if (!promptToSend.trim() || isLoading) return;

    if (isDisallowed(promptToSend)) {
      setMessages(prev => [...prev, { role: 'user', content: promptToSend }]);
      setUserInput('');
      setMessages(prev => [...prev, { role: 'ai', content: "Je ne peux pas traiter ce type de demande. Merci de rester dans un cadre professionnel, constructif et respectueux." }]);
      return;
    }

    const newMessages: AgentMessage[] = [...messages, { role: 'user', content: promptToSend }];
    setMessages(newMessages);
    const currentInput = promptToSend;
    setUserInput('');
    setIsLoading(true);

    try {
        const aiResponse = await runAIAgent(currentInput, currentView);
        const cleaned = (aiResponse || '').trim();
        if (!cleaned) {
          setMessages(prev => [...prev, { role: 'ai', content: "Je n'ai pas pu générer de réponse pour l'instant. Réessayez avec une formulation différente." }]);
        } else {
          if (cleaned.toLowerCase().includes('clé api')) {
            setMessages(prev => [...prev, { role: 'ai', content: `${cleaned}\n\nAstuce : configurez les variables d'environnement VITE_GEMINI_API_KEY ou VITE_GROQ_API_KEY pour activer les fonctionnalités IA.` }]);
          } else {
            setMessages(prev => [...prev, { role: 'ai', content: cleaned }]);
          }
        }
    } catch (error) {
        console.error('❌ Erreur AIAgent:', error);
        setMessages(prev => [...prev, { role: 'ai', content: "Je rencontre une difficulté technique pour le moment. Vérifiez votre connexion ou la configuration des clés API, puis réessayez." }]);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
        const initialMessage: AgentMessage = {
            role: 'ai',
            content: getWelcomeMessage(currentView)
        };
        setMessages([initialMessage]);
    }
  }, [currentView, isOpen, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(prev => {
        if (!prev) setMessages([]); // Reset messages when opening
        return !prev;
    });
  };

  const handleSuggestionClick = () => {
    if (!proactiveSuggestion) return;
    setIsOpen(true);
    // We need to initialize with welcome message before sending the suggestion
    const initialMessage: AgentMessage = { role: 'ai', content: getWelcomeMessage(currentView) };
    setMessages([initialMessage]);
    // Use a timeout to ensure state updates before sending the next message
    setTimeout(() => handleSend(proactiveSuggestion.prompt), 100);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSend();
      }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
          {proactiveSuggestion && !isOpen && (
            <div className="relative mb-2">
                 <button 
                    onClick={handleSuggestionClick}
                    className="bg-white p-3 rounded-lg shadow-lg text-sm text-gray-800 text-left animate-fade-in-up"
                 >
                    <span className="font-bold text-emerald-600">Coya ✨</span> {proactiveSuggestion.text}
                 </button>
            </div>
          )}
          <button 
            onClick={handleToggle} 
            className="bg-emerald-600 text-white w-16 h-16 rounded-full shadow-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 flex items-center justify-center transform hover:scale-110 transition-transform"
            aria-label={t('ai_agent_title')}
          >
            <i className={`fas ${isOpen ? 'fa-times' : 'fa-robot'} text-2xl`}></i>
          </button>
      </div>


      {isOpen && (
        <div className="fixed bottom-24 right-6 w-full max-w-sm h-[60vh] bg-white rounded-2xl shadow-2xl flex flex-col z-50 transform transition-all duration-300 ease-in-out origin-bottom-right animate-slide-in">
          <header className="bg-emerald-600 text-white p-4 rounded-t-2xl flex justify-between items-center">
            <h3 className="font-bold text-lg flex items-center"><i className="fas fa-robot mr-2"></i> Coya</h3>
            <button onClick={handleToggle} className="text-white hover:bg-emerald-700 rounded-full w-8 h-8 flex items-center justify-center"><i className="fas fa-times"></i></button>
          </header>

          <main className="flex-1 p-4 overflow-y-auto bg-gray-50">
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'ai' && <img src="https://picsum.photos/seed/ai-agent/40/40" className="w-8 h-8 rounded-full"/>}
                  <div className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-emerald-500 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                     <p className="text-sm" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\*(.*?)\*/g, '<i>$1</i>') }}></p>
                  </div>
                </div>
              ))}
              {isLoading && (
                 <div className="flex items-end gap-2 justify-start">
                    <img src="https://picsum.photos/seed/ai-agent/40/40" className="w-8 h-8 rounded-full"/>
                    <div className="max-w-[80%] p-3 rounded-2xl bg-gray-200 text-gray-800 rounded-bl-none">
                        <div className="flex items-center justify-center gap-1">
                            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                        </div>
                    </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </main>
          
          <footer className="p-3 border-t bg-white rounded-b-2xl">
            <div className="flex items-center gap-2">
              <textarea
                ref={inputRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('ai_agent_placeholder')}
                className="flex-1 p-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                rows={1}
                disabled={isLoading}
              />
              <button onClick={() => handleSend()} disabled={isLoading || !userInput.trim()} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 disabled:bg-emerald-300 transition-colors">
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </footer>
          <style>{`
            @keyframes slide-in {
                from { opacity: 0; transform: translateY(20px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes fade-in-up {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-slide-in { animation: slide-in 0.3s ease-out forwards; }
            .animate-fade-in-up { animation: fade-in-up 0.5s ease-out forwards; }
          `}</style>
        </div>
      )}
    </>
  );
};

export default AIAgent;
