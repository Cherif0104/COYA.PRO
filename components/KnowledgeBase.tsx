import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import { useModulePermissions } from '../hooks/useModulePermissions';
import { Document, RESOURCE_MANAGEMENT_ROLES } from '../types';
import { summarizeAndCreateDoc, generateKnowledgeDocument, improveKnowledgeContent } from '../services/geminiService';
import ConfirmationModal from './common/ConfirmationModal';
import { supabase } from '../services/supabaseService';

interface KnowledgeBaseProps {
    documents: Document[];
    onAddDocument: (doc: Omit<Document, 'id'>) => Promise<void> | void;
    onUpdateDocument: (doc: Document) => Promise<void> | void;
    onDeleteDocument: (id: string) => Promise<void> | void;
}

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ documents, onAddDocument, onUpdateDocument, onDeleteDocument }) => {
    const { t } = useLocalization();
    const { user } = useAuth();
    const { hasPermission } = useModulePermissions();
    const [inputText, setInputText] = useState('');
    // IA Générative – Composer depuis un prompt
    const [showAIGenerateModal, setShowAIGenerateModal] = useState(false);
    const [genTopic, setGenTopic] = useState('');
    const [genAudience, setGenAudience] = useState('équipe');
    const [genTone, setGenTone] = useState('professionnel');
    const [genLength, setGenLength] = useState<'short'|'medium'|'long'>('medium');
    const [genOutline, setGenOutline] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [authorFilter, setAuthorFilter] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
    const [sortBy, setSortBy] = useState<'date' | 'title' | 'author' | 'views' | 'popularity'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('list');
    const [editingDocument, setEditingDocument] = useState<Document | null>(null);
    const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
    const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const [editTags, setEditTags] = useState<string[]>([]);
    const [editDescription, setEditDescription] = useState('');
    const [editIsPublic, setEditIsPublic] = useState(false);
    const [tagInput, setTagInput] = useState('');

    // Charger les favoris au montage
    useEffect(() => {
        const loadFavorites = async () => {
            if (!user?.profileId) return;
            try {
                const { data } = await supabase
                    .from('document_favorites')
                    .select('document_id')
                    .eq('user_id', user.profileId);
                
                if (data) {
                    setFavorites(new Set(data.map(f => f.document_id)));
                }
            } catch (error) {
                console.error('Erreur chargement favoris:', error);
            }
        };
        loadFavorites();
    }, [user?.profileId]);

    // Extraire toutes les catégories et auteurs uniques
    const { categories, authors } = useMemo(() => {
        const cats = new Set<string>();
        const auths = new Set<string>();
        documents.forEach(doc => {
            if (doc.category) cats.add(doc.category);
            if (doc.createdBy) auths.add(doc.createdBy);
        });
        return {
            categories: Array.from(cats).sort(),
            authors: Array.from(auths).sort()
        };
    }, [documents]);

    // Filtrage et tri des documents avec analytics
    const filteredDocuments = useMemo(() => {
        let filtered = documents.filter(doc => {
            // Recherche
            const matchesSearch = searchQuery === '' || 
                doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.createdBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));

            // Filtre par catégorie
            const matchesCategory = categoryFilter === 'all' || 
                (categoryFilter === 'no_category' && !doc.category) ||
                doc.category === categoryFilter;

            // Filtre par auteur
            const matchesAuthor = authorFilter === 'all' || doc.createdBy === authorFilter;

            // Filtre par date
            const matchesDate = (() => {
                if (dateFilter === 'all') return true;
                const docDate = new Date(doc.createdAt);
                const now = new Date();
                const diffTime = now.getTime() - docDate.getTime();
                const diffDays = diffTime / (1000 * 60 * 60 * 24);
                
                if (dateFilter === 'today') return diffDays < 1;
                if (dateFilter === 'week') return diffDays < 7;
                if (dateFilter === 'month') return diffDays < 30;
                if (dateFilter === 'year') return diffDays < 365;
                return true;
            })();

            return matchesSearch && matchesCategory && matchesAuthor && matchesDate;
        });

        // Tri
        filtered.sort((a, b) => {
            let aValue: any, bValue: any;
            if (sortBy === 'date') {
                aValue = new Date(a.createdAt).getTime();
                bValue = new Date(b.createdAt).getTime();
            } else if (sortBy === 'title') {
                aValue = a.title.toLowerCase();
                bValue = b.title.toLowerCase();
            } else if (sortBy === 'author') {
                aValue = a.createdBy.toLowerCase();
                bValue = b.createdBy.toLowerCase();
            } else if (sortBy === 'views') {
                aValue = a.viewCount || 0;
                bValue = b.viewCount || 0;
            } else if (sortBy === 'popularity') {
                // Popularité = vues + favoris
                const aPop = (a.viewCount || 0) + (favorites.has(a.id) ? 10 : 0);
                const bPop = (b.viewCount || 0) + (favorites.has(b.id) ? 10 : 0);
                aValue = aPop;
                bValue = bPop;
            }
            
            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        return filtered;
    }, [documents, searchQuery, categoryFilter, authorFilter, dateFilter, sortBy, sortOrder, favorites]);

    // Analytics
    const analytics = useMemo(() => {
        const totalViews = documents.reduce((sum, d) => sum + (d.viewCount || 0), 0);
        const mostViewed = [...documents].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))[0];
        const mostActiveAuthor = documents.reduce((acc, doc) => {
            acc[doc.createdBy] = (acc[doc.createdBy] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const topAuthor = Object.entries(mostActiveAuthor).sort((a, b) => b[1] - a[1])[0];
        const recentDocuments = documents.filter(d => {
            const date = new Date(d.createdAt);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return date > weekAgo;
        }).length;

        return {
            totalViews,
            mostViewed,
            topAuthor: topAuthor ? { name: topAuthor[0], count: topAuthor[1] } : null,
            recentDocuments
        };
    }, [documents]);

    const handleSummarize = async () => {
        if (!inputText.trim() || !user) return;
        setLoading(true);
        try {
        const result = await summarizeAndCreateDoc(inputText);
            if (result && result.title && result.content) {
                // Générer une description depuis le contenu (premiers 150 caractères)
                const description = result.content && result.content.length > 0 
                    ? (result.content.substring(0, 150) + (result.content.length > 150 ? '...' : ''))
                    : undefined;
                
                await onAddDocument({
                title: result.title,
                content: result.content,
                    description: description,
                createdAt: new Date().toISOString().split('T')[0],
                    createdBy: user.fullName || user.name || user.email || 'Utilisateur',
                });
            setInputText('');
                setShowCreateModal(false);
            } else {
                console.error('Erreur: Résultat de l\'IA invalide', result);
                alert('Erreur lors de la génération du document. Veuillez réessayer.');
        }
        } catch (error) {
            console.error('Erreur création document:', error);
            alert('Erreur lors de la création du document. Veuillez réessayer.');
        } finally {
        setLoading(false);
        }
    };

    const handleAIGenerate = async () => {
        if (!genTopic.trim() || !user) return;
        setLoading(true);
        try {
            const result = await generateKnowledgeDocument({
                topic: genTopic.trim(),
                audience: genAudience.trim(),
                tone: genTone.trim(),
                length: genLength,
                outline: genOutline.trim() || undefined
            });
            const description = result.content && result.content.length > 0
                ? (result.content.substring(0, 150) + (result.content.length > 150 ? '...' : ''))
                : undefined;
            await onAddDocument({
                title: result.title,
                content: result.content,
                description,
                createdAt: new Date().toISOString().split('T')[0],
                createdBy: user.fullName || user.name || user.email || 'Utilisateur',
            });
            setShowAIGenerateModal(false);
            setGenTopic(''); setGenAudience('équipe'); setGenTone('professionnel'); setGenLength('medium'); setGenOutline('');
        } catch (e) {
            console.error('Erreur génération IA KB:', e);
            alert('Erreur lors de la génération IA.');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDocument = async (doc: Document) => {
        setViewingDocument(doc);
        // Incrémenter le compteur de vues
        if (user?.profileId && doc.id) {
            try {
                await supabase.rpc('increment_document_view', {
                    document_uuid: doc.id,
                    viewer_profile_id: user.profileId
                });
                // Mettre à jour localement
                const updatedDoc = { ...doc, viewCount: (doc.viewCount || 0) + 1 };
                await onUpdateDocument(updatedDoc);
            } catch (error) {
                console.error('Erreur incrément vues:', error);
            }
        }
    };

    const handleToggleFavorite = async (docId: string) => {
        if (!user?.profileId) return;
        
        const isFavorite = favorites.has(docId);
        try {
            if (isFavorite) {
                await supabase
                    .from('document_favorites')
                    .delete()
                    .eq('document_id', docId)
                    .eq('user_id', user.profileId);
                setFavorites(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(docId);
                    return newSet;
                });
            } else {
                await supabase
                    .from('document_favorites')
                    .insert({
                        document_id: docId,
                        user_id: user.profileId
                    });
                setFavorites(prev => new Set([...prev, docId]));
            }
        } catch (error) {
            console.error('Erreur toggle favori:', error);
        }
    };

    const handleEdit = (doc: Document) => {
        setEditingDocument(doc);
        setEditTitle(doc.title);
        setEditContent(doc.content);
        setEditCategory(doc.category || '');
        setEditTags(doc.tags || []);
        setEditDescription(doc.description || '');
        setEditIsPublic(doc.isPublic || false);
    };

    const handleImproveWithAI = async () => {
        if (!editContent.trim()) return;
        setLoading(true);
        try {
            const improved = await improveKnowledgeContent(editContent, 'professionnel');
            if (improved && improved.length > editContent.length * 0.5) {
                setEditContent(improved);
            }
        } catch (e) {
            console.error('Amélioration IA échouée:', e);
            alert("Amélioration IA indisponible pour le moment.");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!editingDocument) return;
        if (!canEditDocument(editingDocument)) {
            alert(t('project_permission_error'));
            return;
        }
        
        const updated: Document = {
            ...editingDocument,
            title: editTitle,
            content: editContent,
            category: editCategory || undefined,
            tags: editTags,
            description: editDescription || undefined,
            isPublic: editIsPublic,
            updatedAt: new Date().toISOString().split('T')[0],
        };
        
        await onUpdateDocument(updated);
        setEditingDocument(null);
        setEditTitle('');
        setEditContent('');
        setEditCategory('');
        setEditTags([]);
        setEditDescription('');
        setEditIsPublic(false);
    };

    const handleAddTag = () => {
        if (tagInput.trim() && !editTags.includes(tagInput.trim())) {
            setEditTags([...editTags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setEditTags(editTags.filter(t => t !== tagToRemove));
    };

    const handleDelete = async () => {
        if (deletingDocumentId) {
            const doc = documents.find(d => d.id === deletingDocumentId) || null;
            if (doc && !canEditDocument(doc)) {
                alert(t('project_permission_error'));
                setDeletingDocumentId(null);
                return;
            }
            await onDeleteDocument(deletingDocumentId);
            setDeletingDocumentId(null);
        }
    };

    // Tous les utilisateurs peuvent gérer documents (isolation gérée par RLS)
    const canManage = useMemo(() => {
        if (!user) return false;
        return RESOURCE_MANAGEMENT_ROLES.includes(user.role);
    }, [user]);
    const canEditDocument = useCallback(
        (doc: Document | null) => {
            if (!user || !doc) return false;
            const isCreator = doc.createdById && user.profileId ? doc.createdById === user.profileId : false;
            return isCreator || RESOURCE_MANAGEMENT_ROLES.includes(user.role);
        },
        [user]
    );

    // Métriques améliorées
    const totalDocuments = documents.length;
    const publicDocuments = documents.filter(d => d.isPublic).length;
    const myDocuments = documents.filter(d => d.createdById === user?.profileId).length;
    const myFavorites = documents.filter(d => favorites.has(d.id)).length;
    const totalViews = analytics.totalViews;

    return (
        <>
            <div className="min-h-screen bg-gray-50">
                {/* Header moderne avec gradient */}
                <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-lg">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <h1 className="text-4xl font-bold mb-2">{t('knowledge_base_title') || 'Knowledge Base'}</h1>
                                <p className="text-emerald-50 text-sm">
                                    {t('knowledge_base_subtitle') || 'Base de connaissances centralisée pour votre équipe'}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowAIGenerateModal(true)}
                                    className="bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 flex items-center shadow-md transition-all"
                                >
                                    <i className="fas fa-wand-magic-sparkles mr-2"></i>
                                    Rédiger avec IA
                                </button>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="bg-white text-emerald-600 font-bold py-2 px-4 rounded-lg hover:bg-emerald-50 flex items-center shadow-md transition-all"
                                >
                                    <i className="fas fa-plus mr-2"></i>
                                    {t('create_doc_from_text') || 'Nouveau Document'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Métriques Power BI style améliorées */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-600">Total Documents</span>
                                <i className="fas fa-file-alt text-2xl text-blue-500"></i>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">{totalDocuments}</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-600">Mes Documents</span>
                                <i className="fas fa-user text-2xl text-green-500"></i>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">{myDocuments}</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-600">Favoris</span>
                                <i className="fas fa-star text-2xl text-yellow-500"></i>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">{myFavorites}</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-600">Vues Total</span>
                                <i className="fas fa-eye text-2xl text-purple-500"></i>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">{totalViews}</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-600">Cette Semaine</span>
                                <i className="fas fa-calendar-week text-2xl text-orange-500"></i>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">{analytics.recentDocuments}</p>
                        </div>
                    </div>

                    {/* Analytics Insights */}
                    {analytics.mostViewed && (
                        <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                <i className="fas fa-chart-line mr-2 text-indigo-600"></i>
                                Insights
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white rounded-lg p-4">
                                    <p className="text-sm text-gray-600 mb-1">Document le plus consulté</p>
                                    <p className="font-semibold text-gray-900">{analytics.mostViewed.title}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {analytics.mostViewed.viewCount || 0} vues
                                    </p>
                                </div>
                                {analytics.topAuthor && (
                                    <div className="bg-white rounded-lg p-4">
                                        <p className="text-sm text-gray-600 mb-1">Auteur le plus actif</p>
                                        <p className="font-semibold text-gray-900">{analytics.topAuthor.name}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {analytics.topAuthor.count} document{analytics.topAuthor.count > 1 ? 's' : ''}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Barre de recherche et filtres avancés */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                        <div className="flex flex-wrap items-center gap-4">
                            {/* Recherche */}
                            <div className="flex-1 min-w-[200px]">
                                <div className="relative">
                                    <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                                    <input
                                        type="text"
                                        placeholder={t('search') || 'Rechercher dans les documents...'}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            {/* Filtre par catégorie */}
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            >
                                <option value="all">Toutes les catégories</option>
                                <option value="no_category">Sans catégorie</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>

                            {/* Filtre par auteur */}
                            {authors.length > 0 && (
                                <select
                                    value={authorFilter}
                                    onChange={(e) => setAuthorFilter(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                >
                                    <option value="all">Tous les auteurs</option>
                                    {authors.map(author => (
                                        <option key={author} value={author}>{author}</option>
                                    ))}
                                </select>
                            )}

                            {/* Filtre par date */}
                            <select
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value as any)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            >
                                <option value="all">Toutes les dates</option>
                                <option value="today">Aujourd'hui</option>
                                <option value="week">Cette semaine</option>
                                <option value="month">Ce mois</option>
                                <option value="year">Cette année</option>
                            </select>

                            {/* Tri */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            >
                                <option value="date">Date</option>
                                <option value="title">Titre</option>
                                <option value="author">Auteur</option>
                                <option value="views">Consultations</option>
                                <option value="popularity">Popularité</option>
                            </select>

                            {/* Ordre de tri */}
                            <button
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                                title={sortOrder === 'asc' ? 'Ordre croissant' : 'Ordre décroissant'}
                            >
                                <i className={`fas ${sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down'} mr-2`}></i>
                                {sortOrder === 'asc' ? '↑' : '↓'}
                            </button>

                            {/* Sélecteur de vue */}
                            <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded transition-colors ${
                                        viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                    title="Vue grille"
                                >
                                    <i className="fas fa-th"></i>
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded transition-colors ${
                                        viewMode === 'list' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                    title="Vue liste"
                                >
                                    <i className="fas fa-list"></i>
                                </button>
                                <button
                                    onClick={() => setViewMode('compact')}
                                    className={`p-2 rounded transition-colors ${
                                        viewMode === 'compact' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                    title="Vue compacte"
                                >
                                    <i className="fas fa-grip-lines"></i>
                                </button>
                            </div>
                        </div>

                        {/* Compteur de résultats */}
                        <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600 flex items-center justify-between">
                            <span>
                                {filteredDocuments.length} {filteredDocuments.length > 1 ? 'documents trouvés' : 'document trouvé'}
                                {searchQuery && (
                                    <span className="ml-2 text-emerald-600">
                                        pour "{searchQuery}"
                                    </span>
                                )}
                            </span>
                            {favorites.size > 0 && (
                                <button
                                    onClick={() => {
                                        // Filtrer pour afficher seulement les favoris
                                        const favDocs = documents.filter(d => favorites.has(d.id));
                                        // On pourrait ajouter un filtre spécial pour favoris
                                    }}
                                    className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center"
                                >
                                    <i className="fas fa-star mr-1"></i>
                                    {myFavorites} favori{myFavorites > 1 ? 's' : ''}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Liste des documents selon le mode de vue */}
                    {filteredDocuments.length === 0 ? (
                        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                            <i className="fas fa-file-alt text-6xl text-gray-300 mb-4"></i>
                            <p className="text-gray-600 text-lg mb-2">
                                {searchQuery || categoryFilter !== 'all' || authorFilter !== 'all' ? 
                                    'Aucun document ne correspond aux critères' : 
                                    'Aucun document'}
                            </p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="mt-4 bg-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
                            >
                                <i className="fas fa-plus mr-2"></i>
                                Créer le premier document
                            </button>
                        </div>
                    ) : (
                        <div className={
                            viewMode === 'grid' ? 
                                'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 
                                viewMode === 'compact' ?
                                'bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden' :
                                'space-y-6'
                        }>
                            {filteredDocuments.map(doc => (
                                viewMode === 'grid' ? (
                                    <div 
                                        key={doc.id} 
                                        className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer border border-gray-200 overflow-hidden"
                                        onClick={() => handleViewDocument(doc)}
                                    >
                                        {doc.thumbnailUrl && (
                                            <div className="h-40 bg-gradient-to-br from-emerald-100 to-blue-100 flex items-center justify-center">
                                                <i className="fas fa-file-alt text-6xl text-gray-400"></i>
                                            </div>
                                        )}
                                        <div className="p-5">
                                            <div className="flex items-start justify-between mb-2">
                                                <h3 className="text-lg font-bold text-gray-900 line-clamp-2">{doc.title}</h3>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleFavorite(doc.id);
                                                    }}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        favorites.has(doc.id) 
                                                            ? 'text-yellow-500 hover:bg-yellow-50' 
                                                            : 'text-gray-400 hover:bg-gray-100'
                                                    }`}
                                                    title={favorites.has(doc.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                                                >
                                                    <i className={`fas ${favorites.has(doc.id) ? 'fa-star' : 'fa-star'}`}></i>
                                                </button>
                                            </div>
                                            {doc.description && (
                                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{doc.description}</p>
                                            )}
                                            <p className="text-xs text-gray-500 mb-3">
                                                Par {doc.createdBy} • {(doc.viewCount || 0)} vues
                                            </p>
                                            {doc.category && (
                                                <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 mb-2">
                                                    {doc.category}
                                                </span>
                                            )}
                                            {canEditDocument(doc) && (
                                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEdit(doc);
                                                        }}
                                                        className="flex-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    >
                                                        <i className="fas fa-edit mr-1"></i>Modifier
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeletingDocumentId(doc.id);
                                                        }}
                                                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : viewMode === 'compact' ? (
                                    <div 
                                        key={doc.id}
                                        className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                                        onClick={() => handleViewDocument(doc)}
                                    >
                                        <div className="px-6 py-4 flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-sm font-semibold text-gray-900 truncate">{doc.title}</h3>
                                                    {favorites.has(doc.id) && (
                                                        <i className="fas fa-star text-yellow-500 text-xs"></i>
                                                    )}
                                                    {doc.category && (
                                                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                                                            {doc.category}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {doc.createdBy} • {new Date(doc.createdAt).toLocaleDateString('fr-FR')} • {(doc.viewCount || 0)} vues
                                                </p>
                                            </div>
                                            {canEditDocument(doc) && (
                                                <div className="flex items-center gap-2 ml-4">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleFavorite(doc.id);
                                                        }}
                                                        className={`p-2 rounded transition-colors ${
                                                            favorites.has(doc.id) ? 'text-yellow-500' : 'text-gray-400'
                                                        }`}
                                                    >
                                                        <i className="fas fa-star"></i>
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEdit(doc);
                                                        }}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    >
                                                        <i className="fas fa-edit"></i>
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeletingDocumentId(doc.id);
                                                        }}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div 
                                        key={doc.id} 
                                        className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer border border-gray-200"
                                        onClick={() => handleViewDocument(doc)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                    <h3 className="text-lg font-bold text-gray-900">{doc.title}</h3>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleFavorite(doc.id);
                                                        }}
                                                        className={`p-1.5 rounded-lg transition-colors ${
                                                            favorites.has(doc.id) 
                                                                ? 'text-yellow-500 bg-yellow-50' 
                                                                : 'text-gray-400 hover:bg-gray-100'
                                                        }`}
                                                        title={favorites.has(doc.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                                                    >
                                                        <i className={`fas ${favorites.has(doc.id) ? 'fa-star' : 'fa-star'}`}></i>
                                                    </button>
                                                    {doc.category && (
                                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                            {doc.category}
                                                        </span>
                                                    )}
                                                    {doc.isPublic && (
                                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                            <i className="fas fa-globe mr-1"></i>Public
                                                        </span>
                                                    )}
                                                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                                        <i className="fas fa-eye mr-1"></i>{doc.viewCount || 0} vues
                                                    </span>
                                                </div>
                                                {doc.description && (
                                                    <p className="text-sm text-gray-600 mb-2">{doc.description}</p>
                                                )}
                                                <p className="text-xs text-gray-500 mb-3">
                                                    Par <span className="font-medium">{doc.createdBy}</span> le {new Date(doc.createdAt).toLocaleDateString('fr-FR', { 
                                                        day: 'numeric', 
                                                        month: 'long', 
                                                        year: 'numeric' 
                                                    })}
                                                    {doc.updatedAt && doc.updatedAt !== doc.createdAt && (
                                                        <span className="ml-2">• Modifié le {new Date(doc.updatedAt).toLocaleDateString('fr-FR', { 
                                                            day: 'numeric', 
                                                            month: 'long', 
                                                            year: 'numeric' 
                                                        })}</span>
                                                    )}
                                                </p>
                                                <p className="text-gray-700 text-sm leading-relaxed line-clamp-3 mb-3">{doc.content}</p>
                                                {doc.tags && doc.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                        {doc.tags.map((tag, idx) => (
                                                            <span key={idx} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors cursor-pointer">
                                                                <i className="fas fa-hashtag mr-1"></i>{tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            {canEditDocument(doc) && (
                                                <div className="flex items-center gap-2 ml-4">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEdit(doc);
                                                        }}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Modifier"
                                                    >
                                                        <i className="fas fa-edit"></i>
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeletingDocumentId(doc.id);
                                                        }}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Supprimer"
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de prévisualisation/détail du document */}
            {viewingDocument && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header de la modal */}
                        <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white px-6 py-4 flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <h2 className="text-2xl font-bold mb-1 truncate">{viewingDocument.title}</h2>
                                <div className="flex items-center gap-4 text-sm text-emerald-50">
                                    <span><i className="fas fa-user mr-1"></i>{viewingDocument.createdBy}</span>
                                    <span><i className="fas fa-calendar mr-1"></i>{new Date(viewingDocument.createdAt).toLocaleDateString('fr-FR')}</span>
                                    <span><i className="fas fa-eye mr-1"></i>{viewingDocument.viewCount || 0} vues</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                                <button
                                    onClick={() => handleToggleFavorite(viewingDocument.id)}
                                    className={`p-2 rounded-lg transition-colors ${
                                        favorites.has(viewingDocument.id) 
                                            ? 'bg-yellow-500 text-white' 
                                            : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                                    }`}
                                    title={favorites.has(viewingDocument.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                                >
                                    <i className="fas fa-star"></i>
                                </button>
                                {canEditDocument(viewingDocument) && (
                                    <button
                                        onClick={() => {
                                            setViewingDocument(null);
                                            handleEdit(viewingDocument);
                                        }}
                                        className="p-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors"
                                        title="Modifier"
                                    >
                                        <i className="fas fa-edit"></i>
                                    </button>
                                )}
                                <button
                                    onClick={() => setViewingDocument(null)}
                                    className="p-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors"
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                        </div>

                        {/* Contenu scrollable */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Métadonnées */}
                            <div className="flex flex-wrap gap-2 mb-6">
                                {viewingDocument.category && (
                                    <span className="px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                                        {viewingDocument.category}
                                    </span>
                                )}
                                {viewingDocument.isPublic && (
                                    <span className="px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                                        <i className="fas fa-globe mr-1"></i>Public
                                    </span>
                                )}
                                {viewingDocument.version && (
                                    <span className="px-3 py-1 text-sm font-semibold rounded-full bg-gray-100 text-gray-800">
                                        Version {viewingDocument.version}
                                    </span>
                                )}
                            </div>

                            {/* Description */}
                            {viewingDocument.description && (
                                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="text-gray-700 leading-relaxed">{viewingDocument.description}</p>
                                </div>
                            )}

                            {/* Tags */}
                            {viewingDocument.tags && viewingDocument.tags.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Tags</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {viewingDocument.tags.map((tag, idx) => (
                                            <span key={idx} className="px-3 py-1 text-sm bg-emerald-100 text-emerald-800 rounded-lg">
                                                <i className="fas fa-hashtag mr-1"></i>{tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Contenu principal */}
                            <div className="prose max-w-none">
                                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {viewingDocument.content}
                                </div>
                            </div>

                            {/* Pièces jointes */}
                            {viewingDocument.attachments && viewingDocument.attachments.length > 0 && (
                                <div className="mt-8 pt-6 border-t border-gray-200">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Pièces jointes</h4>
                                    <div className="space-y-2">
                                        {viewingDocument.attachments.map((att, idx) => (
                                            <a
                                                key={idx}
                                                href={att.url}
                                                download={att.name}
                                                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                            >
                                                <i className="fas fa-file text-gray-400"></i>
                                                <span className="flex-1 text-sm text-gray-700">{att.name}</span>
                                                <span className="text-xs text-gray-500">{(att.size / 1024).toFixed(1)} KB</span>
                                                <i className="fas fa-download text-emerald-600"></i>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer avec actions */}
                        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                {viewingDocument.updatedAt && viewingDocument.updatedAt !== viewingDocument.createdAt && (
                                    <span>Dernière modification le {new Date(viewingDocument.updatedAt).toLocaleDateString('fr-FR')}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        // Export en texte
                                        const blob = new Blob([viewingDocument.content], { type: 'text/plain' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `${viewingDocument.title}.txt`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    }}
                                    className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                                >
                                    <i className="fas fa-download mr-2"></i>Exporter
                                </button>
                                <button
                                    onClick={() => setViewingDocument(null)}
                                    className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal d'édition */}
            {editingDocument && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold">Modifier le document</h2>
                            <button
                                onClick={() => {
                                    setEditingDocument(null);
                                    setEditTitle('');
                                    setEditContent('');
                                    setEditCategory('');
                                    setEditTags([]);
                                    setEditDescription('');
                                    setEditIsPublic(false);
                                }}
                                className="text-white hover:text-gray-200"
                            >
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>

                        {/* Contenu scrollable */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-6">
                                {/* Titre */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Titre *</label>
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Titre du document"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                    <textarea
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        rows={3}
                                        placeholder="Description courte du document"
                                        maxLength={500}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">{editDescription.length}/500</p>
                                </div>

                                {/* Catégorie */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                                        <input
                                            type="text"
                                            value={editCategory}
                                            onChange={(e) => setEditCategory(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Ex: Guide, Documentation, Procédure"
                                        />
                                    </div>

                                    {/* Public/Privé */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Visibilité</label>
                                        <select
                                            value={editIsPublic ? 'public' : 'private'}
                                            onChange={(e) => setEditIsPublic(e.target.value === 'public')}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="private">Privé (moi et admins)</option>
                                            <option value="public">Public (tous les utilisateurs)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Tags */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {editTags.map((tag, idx) => (
                                            <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm">
                                                <i className="fas fa-hashtag"></i>
                                                {tag}
                                                <button
                                                    onClick={() => handleRemoveTag(tag)}
                                                    className="ml-1 hover:text-emerald-900"
                                                >
                                                    <i className="fas fa-times text-xs"></i>
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddTag();
                                                }
                                            }}
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Ajouter un tag (Entrée pour ajouter)"
                                        />
                                        <button
                                            onClick={handleAddTag}
                                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                                        >
                                            <i className="fas fa-plus"></i>
                                        </button>
                                    </div>
                                </div>

                                {/* Contenu */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Contenu *</label>
                                    <textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                                        rows={15}
                                        placeholder="Contenu du document (Markdown supporté)"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        {editContent.length} caractères
                                    </p>
                                    <div className="mt-2">
                                        <button onClick={handleImproveWithAI} disabled={loading || !editContent.trim()} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-60">
                                            <i className="fas fa-wand-magic-sparkles mr-2"></i>Améliorer avec IA
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer avec actions */}
                        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
                            <button
                                onClick={() => {
                                    setEditingDocument(null);
                                    setEditTitle('');
                                    setEditContent('');
                                    setEditCategory('');
                                    setEditTags([]);
                                    setEditDescription('');
                                    setEditIsPublic(false);
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={!editTitle.trim() || !editContent.trim()}
                                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-emerald-300 transition-colors font-semibold"
                            >
                                <i className="fas fa-save mr-2"></i>Sauvegarder
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de création */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                            <h2 className="text-xl font-bold text-gray-800">{t('create_doc_from_text') || 'Créer un document'}</h2>
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setInputText('');
                                }}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    <i className="fas fa-info-circle mr-2"></i>
                                    Collez votre texte brut ici. L'IA générera automatiquement un titre et organisera le contenu.
                                </p>
                            </div>
                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                                placeholder={t('paste_text_here') || 'Collez votre texte ici (notes de réunion, email, article, etc.)...'}
                                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition font-mono text-sm"
                                rows={12}
                    disabled={loading}
                />
                            <div className="mt-4 flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setInputText('');
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Annuler
                                </button>
                <button
                    onClick={handleSummarize}
                    disabled={loading || !inputText.trim()}
                                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:bg-emerald-300 transition-colors flex items-center"
                >
                    {loading ? (
                                        <><i className="fas fa-spinner fa-spin mr-2"></i>{t('generating') || 'Génération...'}</>
                    ) : (
                                        <><i className="fas fa-magic mr-2"></i>{t('summarize_and_create') || 'Générer avec IA'}</>
                    )}
                </button>
            </div>
                 </div>
            </div>
        </div>
            )}

            {/* Modal Composer IA */}
            {showAIGenerateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4">
                        <div className="px-6 py-4 border-b flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-800">Rédiger avec IA</h3>
                            <button onClick={() => setShowAIGenerateModal(false)} className="text-gray-500 hover:text-gray-700">
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sujet / Titre</label>
                                <input
                                    value={genTopic}
                                    onChange={(e)=>setGenTopic(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="Ex: Procédure d'onboarding pour les nouveaux collaborateurs"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Public visé</label>
                                    <input value={genAudience} onChange={(e)=>setGenAudience(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ton</label>
                                    <select value={genTone} onChange={(e)=>setGenTone(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                        <option value="professionnel">Professionnel</option>
                                        <option value="pédagogique">Pédagogique</option>
                                        <option value="convaincant">Convaincant</option>
                                        <option value="neutre">Neutre</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Longueur</label>
                                    <select value={genLength} onChange={(e)=>setGenLength(e.target.value as any)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                        <option value="short">Courte</option>
                                        <option value="medium">Moyenne</option>
                                        <option value="long">Longue</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Plan / Points à couvrir (optionnel)</label>
                                <textarea value={genOutline} onChange={(e)=>setGenOutline(e.target.value)} rows={5} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="Ex:\n- Objectifs\n- Étapes clés\n- Bonnes pratiques\n- Ressources"></textarea>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
                            <button onClick={()=>setShowAIGenerateModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">Annuler</button>
                            <button onClick={handleAIGenerate} disabled={loading || !genTopic.trim()} className="px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-60 flex items-center">
                                {loading ? <><i className="fas fa-spinner fa-spin mr-2"></i>Génération...</> : <><i className="fas fa-wand-magic-sparkles mr-2"></i>Générer</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmation de suppression */}
            {deletingDocumentId && (
                <ConfirmationModal
                    title={t('confirm_delete') || 'Confirmer la suppression'}
                    message={t('confirm_delete_message') || 'Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible.'}
                    onConfirm={handleDelete}
                    onCancel={() => setDeletingDocumentId(null)}
                />
            )}
        </>
    );
};

export default KnowledgeBase;

