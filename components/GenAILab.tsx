import React, { useState, useRef, useMemo } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { generateImage, editImage, runGenAILab } from '../services/geminiService';

interface ImageGeneration {
    id: string;
    prompt: string;
    imageUrl: string;
    timestamp: Date;
}

const GenAILab: React.FC = () => {
    const { t } = useLocalization();
    const [activeTab, setActiveTab] = useState<'generate' | 'edit' | 'text'>('generate');

    // State for Image Generation
    const [prompt, setPrompt] = useState('');
    const [loadingGen, setLoadingGen] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [generations, setGenerations] = useState<ImageGeneration[]>([]);

    // State for Text Generation
    const [textPrompt, setTextPrompt] = useState('');
    const [loadingText, setLoadingText] = useState(false);
    const [textResponse, setTextResponse] = useState('');
    const [textError, setTextError] = useState<string | null>(null);

    // State for Image Editing
    const [originalImage, setOriginalImage] = useState<{ data: string, mime: string, name: string } | null>(null);
    const [editPrompt, setEditPrompt] = useState('');
    const [loadingEdit, setLoadingEdit] = useState(false);
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleGenerateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || loadingGen) return;
        setLoadingGen(true);
        setGeneratedImage(null);
        try {
            const result = await generateImage(prompt);
            if (result) {
                const imageUrl = `data:image/png;base64,${result}`;
                setGeneratedImage(imageUrl);
                
                // Ajouter à l'historique
                const newGeneration: ImageGeneration = {
                    id: `gen-${Date.now()}`,
                    prompt,
                    imageUrl,
                    timestamp: new Date()
                };
                setGenerations(prev => [newGeneration, ...prev]);
            }
        } catch (error: any) {
            console.error('Erreur génération d\'image:', error);
            alert(`Erreur lors de la génération d'image: ${error.message || 'Erreur inconnue'}`);
        } finally {
            setLoadingGen(false);
        }
    };

    const handleTextSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!textPrompt.trim() || loadingText) return;
        setLoadingText(true);
        setTextResponse('');
        setTextError(null);
        try {
            const result = await runGenAILab(textPrompt);
            const cleaned = (result || '').trim();
            setTextResponse(cleaned);

            if (!cleaned) {
                setTextError("L'IA n'a pas pu générer de texte pour cette requête. Veuillez réessayer avec un autre prompt.");
            } else if (cleaned.toLowerCase().includes('clé api')) {
                setTextError("Les clés API IA (Gemini ou Groq) ne sont pas configurées. Ajoutez-les dans votre fichier .env pour activer la génération de texte.");
            }
        } catch (error: any) {
            console.error('❌ Erreur génération de texte IA:', error);
            setTextError("Impossible de contacter l'IA créative. Vérifiez votre connexion et la configuration des clés API.");
        } finally {
            setLoadingText(false);
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!originalImage || !editPrompt.trim() || loadingEdit) return;
        setLoadingEdit(true);
        setEditedImage(null);
        try {
            const result = await editImage(originalImage.data, originalImage.mime, editPrompt);
            if (result && result.image) {
                setEditedImage(`data:${originalImage.mime};base64,${result.image}`);
            }
        } catch (error: any) {
            console.error('Erreur édition d\'image:', error);
            alert(`Erreur lors de l'édition d'image: ${error.message || 'Erreur inconnue'}`);
        } finally {
            setLoadingEdit(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                const base64String = (loadEvent.target?.result as string).split(',')[1];
                setOriginalImage({
                    data: base64String,
                    mime: file.type,
                    name: file.name
                });
                setEditedImage(null); // Clear previous edit result
            };
            reader.readAsDataURL(file);
        }
    };
    
    const TabButton: React.FC<{tabKey: 'generate' | 'edit' | 'text', label: string}> = ({ tabKey, label }) => (
        <button
            onClick={() => setActiveTab(tabKey)}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === tabKey
                ? 'bg-emerald-600 text-white'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
        >
            {label}
        </button>
    );

    const metrics = useMemo(() => {
        return {
            totalGenerations: generations.length,
            thisWeek: generations.filter(g => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return g.timestamp >= weekAgo;
            }).length,
            successRate: '95%'
        };
    }, [generations]);

    return (
        <div>
            {/* Header avec gradient */}
            <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-t-lg overflow-hidden mb-6">
                <div className="p-6 pb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold mb-2 flex items-center">
                                <i className="fas fa-flask mr-3"></i>
                                {t('gen_ai_lab_title')}
                            </h1>
                            <p className="text-emerald-100">{t('gen_ai_lab_subtitle')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Métriques */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-emerald-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium">Générations Totales</p>
                            <p className="text-2xl font-bold text-gray-800 mt-1">{metrics.totalGenerations}</p>
                        </div>
                        <div className="bg-emerald-100 rounded-full p-3">
                            <i className="fas fa-images text-emerald-600 text-xl"></i>
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
                            <p className="text-gray-600 text-sm font-medium">Taux de Réussite</p>
                            <p className="text-2xl font-bold text-gray-800 mt-1">{metrics.successRate}</p>
                        </div>
                        <div className="bg-teal-100 rounded-full p-3">
                            <i className="fas fa-check-circle text-teal-600 text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto">
                <div className="flex justify-center space-x-2 p-2 bg-gray-100 rounded-lg mb-6">
                    <TabButton tabKey="generate" label={t('image_generator')} />
                    <TabButton tabKey="edit" label={t('image_editing')} />
                    <TabButton tabKey="text" label="Génération de Texte" />
                </div>
                
                {activeTab === 'generate' && (
                    <div className="bg-white p-8 rounded-xl shadow-lg">
                        <h2 className="text-xl font-bold text-gray-800 mb-2">{t('image_generator')}</h2>
                        <p className="text-sm text-gray-500 mb-6">{t('image_generator_subtitle')}</p>
                        <form onSubmit={handleGenerateSubmit}>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder={t('image_prompt_placeholder')}
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500"
                                rows={3}
                                disabled={loadingGen}
                            />
                            <button 
                                type="submit" 
                                disabled={loadingGen || !prompt.trim()} 
                                className="mt-4 w-full bg-gradient-to-r from-emerald-600 to-blue-600 text-white py-3 rounded-md font-semibold hover:from-emerald-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {loadingGen ? <><i className="fas fa-spinner fa-spin mr-2"></i>{t('generating')}</> : <><i className="fas fa-image mr-2"></i>{t('generate_image')}</>}
                            </button>
                        </form>
                        {(loadingGen || generatedImage) && (
                            <div className="mt-8">
                                <h3 className="text-lg font-bold text-gray-700 mb-4">{t('ai_coach_response_title')}</h3>
                                <div className="bg-gray-100 p-4 rounded-lg aspect-square flex justify-center items-center">
                                    {loadingGen && <div className="flex flex-col items-center text-emerald-500"><i className="fas fa-spinner fa-spin text-4xl"></i><p className="mt-4">{t('generating')}</p></div>}
                                    {generatedImage && <img src={generatedImage} alt="Generated by AI" className="rounded-lg object-contain max-w-full max-h-full" />}
                                </div>
                                {generatedImage && !loadingGen && (
                                    <div className="mt-4 text-center">
                                        <a
                                            href={generatedImage}
                                            download="senegel-workflow-generated-image.png"
                                            className="inline-flex items-center bg-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
                                        >
                                            <i className="fas fa-download mr-2"></i>
                                            {t('download_image')}
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'edit' && (
                    <div className="bg-white p-8 rounded-xl shadow-lg">
                         <h2 className="text-xl font-bold text-gray-800 mb-2">{t('image_editing')}</h2>
                         <p className="text-sm text-gray-500 mb-6">Powered by Gemini ('Nano Banana')</p>
                        
                        {!originalImage ? (
                            <div className="text-center border-2 border-dashed border-gray-300 p-12 rounded-lg">
                                <i className="fas fa-upload text-4xl text-gray-400"></i>
                                <p className="mt-4 text-gray-600">{t('upload_image_to_edit')}</p>
                                <button onClick={() => fileInputRef.current?.click()} className="mt-4 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-md font-semibold hover:bg-emerald-200">
                                    {t('upload_evidence')}
                                </button>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden"/>
                            </div>
                        ) : (
                            <form onSubmit={handleEditSubmit}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('original_image')}</label>
                                    <div className="relative">
                                        <img src={`data:${originalImage.mime};base64,${originalImage.data}`} alt="Original" className="rounded-lg w-full"/>
                                        <button onClick={() => setOriginalImage(null)} className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-75" title={t('remove_image')}>
                                            <i className="fas fa-times"></i>
                                        </button>
                                    </div>
                                </div>
                                 <textarea
                                    value={editPrompt}
                                    onChange={(e) => setEditPrompt(e.target.value)}
                                    placeholder={t('editing_prompt_placeholder')}
                                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500"
                                    rows={3}
                                    disabled={loadingEdit}
                                />
                                <button 
                                    type="submit" 
                                    disabled={loadingEdit || !editPrompt.trim()} 
                                    className="mt-4 w-full bg-gradient-to-r from-emerald-600 to-blue-600 text-white py-3 rounded-md font-semibold hover:from-emerald-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                >
                                    {loadingEdit ? <><i className="fas fa-spinner fa-spin mr-2"></i>{t('generating')}</> : <><i className="fas fa-magic mr-2"></i>{t('generate_edit')}</>}
                                </button>
                            </form>
                        )}
                        {(loadingEdit || editedImage) && (
                            <div className="mt-8">
                                <h3 className="text-lg font-bold text-gray-700 mb-4">{t('edited_image')}</h3>
                                <div className="bg-gray-100 p-4 rounded-lg aspect-square flex justify-center items-center">
                                    {loadingEdit && <div className="flex flex-col items-center text-emerald-500"><i className="fas fa-spinner fa-spin text-4xl"></i><p className="mt-4">{t('generating')}</p></div>}
                                    {editedImage && <img src={editedImage} alt="Edited by AI" className="rounded-lg object-contain max-w-full max-h-full" />}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'text' && (
                    <div className="bg-white p-8 rounded-xl shadow-lg">
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Génération de Texte Créatif</h2>
                        <p className="text-sm text-gray-500 mb-6">Génère du contenu textuel créatif avec l'IA</p>
                        <form onSubmit={handleTextSubmit}>
                            {textError && (
                                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    <i className="fas fa-circle-exclamation mr-2"></i>
                                    {textError}
                                </div>
                            )}
                            <textarea
                                value={textPrompt}
                                onChange={(e) => setTextPrompt(e.target.value)}
                                placeholder="Ex: Écris une histoire courte sur l'innovation technologique..."
                                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500"
                                rows={4}
                                disabled={loadingText}
                            />
                            <button 
                                type="submit" 
                                disabled={loadingText || !textPrompt.trim()} 
                                className="mt-4 w-full bg-gradient-to-r from-emerald-600 to-blue-600 text-white py-3 rounded-md font-semibold hover:from-emerald-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {loadingText ? (
                                    <><i className="fas fa-spinner fa-spin mr-2"></i>Génération en cours...</>
                                ) : (
                                    <><i className="fas fa-sparkles mr-2"></i>Générer du Texte</>
                                )}
                            </button>
                        </form>
                        {(loadingText || textResponse) && (
                            <div className="mt-8">
                                <h3 className="text-lg font-bold text-gray-700 mb-4">Réponse IA</h3>
                                <div className="bg-gray-50 p-6 rounded-lg">
                                    {loadingText && (
                                        <div className="flex flex-col items-center text-emerald-500">
                                            <i className="fas fa-spinner fa-spin text-4xl"></i>
                                            <p className="mt-4">Génération en cours...</p>
                                        </div>
                                    )}
                                    {textResponse && (
                                        <div className="prose prose-emerald max-w-none text-gray-700 whitespace-pre-wrap">
                                            {textResponse}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GenAILab;
