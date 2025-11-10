import React, { useState, useEffect, useRef } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { runAuthAIAssistant } from '../services/geminiService';

interface AgentMessage {
  role: 'user' | 'ai';
  content: string;
}

interface AuthAIAssistantProps {
  onClose: () => void;
  context: 'login' | 'signup';
  initialPrompt?: string;
}

const AuthAIAssistant: React.FC<AuthAIAssistantProps> = ({ onClose, context, initialPrompt }) => {
  const { t } = useLocalization();
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userInput, setUserInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = {
      login: [
          { text: t('auth_ai_prompt_password'), prompt: t('auth_ai_prompt_password') },
      ],
      signup: [
          { text: t('auth_ai_prompt_roles'), prompt: t('auth_ai_prompt_roles') },
      ]
  };

  const handleSend = async (promptToSend: string) => {
    if (!promptToSend.trim() || isLoading) return;

    const newMessages: AgentMessage[] = [...messages, { role: 'user', content: promptToSend }];
    setMessages(newMessages);
    setUserInput('');
    setIsLoading(true);

    try {
        const aiResponse = await runAuthAIAssistant(promptToSend);
        const cleaned = (aiResponse || '').trim();
        if (!cleaned) {
            setMessages(prev => [...prev, { role: 'ai', content: "Je n'ai pas pu générer de réponse. Réessayez avec une autre question." }]);
        } else if (cleaned.toLowerCase().includes('clé api')) {
            setMessages(prev => [...prev, { role: 'ai', content: `${cleaned}\n\nPensez à configurer les variables VITE_GEMINI_API_KEY ou VITE_GROQ_API_KEY dans votre environnement.` }]);
        } else {
            setMessages(prev => [...prev, { role: 'ai', content: cleaned }]);
        }
    } catch (error) {
        console.error('❌ Erreur AuthAIAssistant:', error);
        setMessages(prev => [...prev, { role: 'ai', content: "Je rencontre un souci technique. Vérifiez la connexion internet ou la configuration des clés API, puis réessayez." }]);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (initialPrompt) {
        handleSend(initialPrompt);
    }
  }, [initialPrompt]);


  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[70] p-4">
      <div className="w-full max-w-md h-[70vh] bg-white rounded-2xl shadow-2xl flex flex-col transform transition-all duration-300 ease-in-out origin-bottom animate-slide-in">
        <header className="bg-blue-600 text-white p-4 rounded-t-2xl flex justify-between items-center">
          <h3 className="font-bold text-lg flex items-center"><i className="fas fa-question-circle mr-2"></i> {t('auth_ai_assistant_title')}</h3>
          <button onClick={onClose} className="text-white hover:bg-blue-700 rounded-full w-8 h-8 flex items-center justify-center"><i className="fas fa-times"></i></button>
        </header>

        <main className="flex-1 p-4 overflow-y-auto bg-gray-50">
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'ai' && <i className="fas fa-robot w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-blue-600 text-lg"></i>}
                <div className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                   <p className="text-sm" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\*(.*?)\*/g, '<i>$1</i>') }}></p>
                </div>
              </div>
            ))}
             {isLoading && (
               <div className="flex items-end gap-2 justify-start">
                  <i className="fas fa-robot w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-blue-600 text-lg"></i>
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
            {messages.length <= 1 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {quickPrompts[context].map((item, index) => (
                        <button key={index} onClick={() => handleSend(item.prompt)} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full">
                            {item.text}
                        </button>
                    ))}
                </div>
            )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend(userInput)}
              placeholder={t('ai_agent_placeholder')}
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button onClick={() => handleSend(userInput)} disabled={isLoading || !userInput.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-300 transition-colors">
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </footer>
        <style>{`
            @keyframes slide-in {
                from { opacity: 0; transform: translateY(20px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .animate-slide-in { animation: slide-in 0.3s ease-out forwards; }
        `}</style>
      </div>
    </div>
  );
};

export default AuthAIAssistant;
