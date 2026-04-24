import React, { useState, useMemo } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import { useModulePermissions } from '../hooks/useModulePermissions';
import { Course, User } from '../types';
import ConfirmationModal from './common/ConfirmationModal';
import CourseCreatePage from './CourseCreatePage';
import AccessDenied from './common/AccessDenied';

interface CourseManagementProps {
    courses: Course[];
    users: User[];
    onAddCourse: (courseData: Omit<Course, 'id' | 'progress'>) => void;
    onUpdateCourse: (course: Course) => void;
    onDeleteCourse: (courseId: string) => void;
    /** Dans Paramètres : pas de plein écran ni header gradient (aligné design admin). */
    embedded?: boolean;
}

const CourseManagement: React.FC<CourseManagementProps> = ({ courses, users, onAddCourse, onUpdateCourse, onDeleteCourse, embedded = false }) => {
    const { t } = useLocalization();
    const { user } = useAuth();
    const { canAccessModule, hasPermission } = useModulePermissions();
    const [showCourseForm, setShowCourseForm] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const canReadModule = canAccessModule('course_management');
    const canWriteModule = hasPermission('course_management', 'write');
    const canDeleteModule = hasPermission('course_management', 'delete');

    // Extraire toutes les catégories uniques
    const categories = useMemo(() => {
        const cats = new Set<string>();
        courses.forEach(course => {
            if (course.category) cats.add(course.category);
        });
        return Array.from(cats).sort();
    }, [courses]);

    // Filtrage des cours
    const filteredCourses = useMemo(() => {
        return courses.filter(course => {
            const matchesSearch = searchQuery === '' || 
                course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                course.instructor.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesCategory = categoryFilter === 'all' || 
                (categoryFilter === 'no_category' && !course.category) ||
                course.category === categoryFilter;

            const matchesStatus = statusFilter === 'all' || course.status === statusFilter;

            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [courses, searchQuery, categoryFilter, statusFilter]);

    // Métriques
    const totalCourses = courses.length;
    const publishedCourses = courses.filter(c => c.status === 'published').length;
    const draftCourses = courses.filter(c => c.status === 'draft').length;
    const totalStudents = courses.reduce((sum, c) => sum + (c.studentsCount || 0), 0);

    const handleOpenForm = (course: Course | null = null) => {
        if (!canWriteModule) return;
        setEditingCourse(course);
        setShowCourseForm(true);
    };

    const handleCloseForm = () => {
        setShowCourseForm(false);
        setEditingCourse(null);
    };

    const handleSaveCourse = (courseData: Course | Omit<Course, 'id' | 'progress'>) => {
        if (!canWriteModule) return;
        if ('id' in courseData) {
            onUpdateCourse(courseData);
        } else {
            onAddCourse(courseData);
        }
        setShowCourseForm(false);
        setEditingCourse(null);
    };
    
    const handleDelete = (courseId: string) => {
        if (!canDeleteModule) return;
        onDeleteCourse(courseId);
        setDeletingCourseId(null);
    };

    if (!canReadModule) {
        return <AccessDenied description="Vous n’avez pas les permissions nécessaires pour gérer les cours. Veuillez contacter votre administrateur." />;
    }

    // Afficher la page de création/édition si active
    if (showCourseForm) {
        return (
            <CourseCreatePage
                editingCourse={editingCourse}
                users={users}
                onClose={handleCloseForm}
                onSave={handleSaveCourse}
            />
        );
    }

    const metricsGrid = embedded ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase text-slate-500">Total</p>
                <p className="text-2xl font-bold text-slate-900">{totalCourses}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase text-slate-500">Publiés</p>
                <p className="text-2xl font-bold text-slate-900">{publishedCourses}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase text-slate-500">Brouillons</p>
                <p className="text-2xl font-bold text-slate-900">{draftCourses}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase text-slate-500">Étudiants</p>
                <p className="text-2xl font-bold text-slate-900">{totalStudents}</p>
            </div>
        </div>
    ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">Total Cours</span>
                        <i className="fas fa-book text-2xl text-blue-500"></i>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{totalCourses}</p>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">Publiés</span>
                        <i className="fas fa-check-circle text-2xl text-green-500"></i>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{publishedCourses}</p>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">Brouillons</span>
                        <i className="fas fa-edit text-2xl text-yellow-500"></i>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{draftCourses}</p>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">Total Étudiants</span>
                        <i className="fas fa-users text-2xl text-purple-500"></i>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{totalStudents}</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className={embedded ? 'space-y-4' : 'min-h-screen bg-gray-50'}>
            {embedded ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-sm text-slate-600">
                        Créez, modifiez et gérez le catalogue de formations pour votre organisation.
                    </p>
                    <button
                        type="button"
                        onClick={() => handleOpenForm(null)}
                        disabled={!canWriteModule}
                        className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        <i className="fas fa-plus mr-2" />
                        Nouveau cours
                    </button>
                </div>
            ) : (
                <>
                    <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-lg">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <h1 className="text-4xl font-bold mb-2">{t('course_management') || 'Course Management'}</h1>
                                    <p className="text-emerald-50 text-sm">Créez, modifiez et gérez vos formations</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleOpenForm(null)}
                                    disabled={!canWriteModule}
                                    className={`bg-white text-emerald-600 font-bold py-2 px-4 rounded-lg flex items-center shadow-md transition-all ${
                                        canWriteModule ? 'hover:bg-emerald-50' : 'opacity-50 cursor-not-allowed'
                                    }`}
                                >
                                    <i className="fas fa-plus mr-2"></i>
                                    Nouveau Cours
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {metricsGrid}

            {/* Barre de recherche et filtres */}
            <div className={embedded ? 'pb-0' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8'}>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                                <input
                                    type="text"
                                    placeholder="Rechercher un cours..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        {categories.length > 0 && (
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
                        )}

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                            <option value="all">Tous les statuts</option>
                            <option value="published">Publié</option>
                            <option value="draft">Brouillon</option>
                            <option value="archived">Archivé</option>
                        </select>
                            </div>

                    <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
                        {filteredCourses.length} {filteredCourses.length > 1 ? 'cours trouvés' : 'cours trouvé'}
                        {searchQuery && (
                            <span className="ml-2 text-emerald-600">
                                pour "{searchQuery}"
                            </span>
                        )}
                            </div>
                        </div>

                {filteredCourses.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                        <i className="fas fa-book-reader text-6xl text-gray-300 mb-4"></i>
                        <p className="text-gray-600 text-lg mb-2">
                            {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' ? 
                                'Aucun cours ne correspond aux critères' : 
                                'Aucun cours'}
                        </p>
                        <button
                            onClick={() => handleOpenForm(null)}
                            className="mt-4 bg-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
                        >
                            <i className="fas fa-plus mr-2"></i>
                            Créer le premier cours
                            </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredCourses.map(course => (
                            <div key={course.id} className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all border border-gray-200">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4 flex-1">
                                        {course.thumbnailUrl ? (
                                            <div className="w-24 h-24 bg-cover bg-center rounded-lg flex-shrink-0" style={{ backgroundImage: `url(${course.thumbnailUrl})` }}></div>
                                        ) : (
                                            <div className="bg-emerald-100 text-emerald-600 rounded-lg p-4 flex-shrink-0">
                                                <i className={`${course.icon || 'fas fa-book'} fa-2x`}></i>
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-bold text-gray-900">{course.title}</h3>
                                            <p className="text-sm text-gray-500 mt-1">{course.instructor}</p>
                                            {course.description && (
                                                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{course.description}</p>
                                            )}
                                            <div className="flex items-center gap-4 flex-wrap mt-3">
                                                {course.category && (
                                                    <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                        {course.category}
                                                    </span>
                                                )}
                                                {course.level && (
                                                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                                                        course.level === 'beginner' ? 'bg-blue-100 text-blue-800' :
                                                        course.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-green-100 text-green-800'
                                                    }`}>
                                                        {course.level === 'beginner' ? 'Débutant' : course.level === 'intermediate' ? 'Intermédiaire' : 'Avancé'}
                                                    </span>
                                                )}
                                                {course.status && (
                                                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                                                        course.status === 'published' ? 'bg-green-100 text-green-800' :
                                                        course.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                        {course.status === 'published' ? 'Publié' : course.status === 'draft' ? 'Brouillon' : 'Archivé'}
                                                    </span>
                                                )}
                            </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                                        {/* Toggle Actif/Inactif */}
                                        <button
                                            onClick={async () => {
                                                // Déterminer le nouveau statut : toggle entre published et draft
                                                const newStatus = course.status === 'published' ? 'draft' : 'published';
                                                console.log('🔄 Changement de statut:', course.title, 'de', course.status, 'vers', newStatus);
                                                
                                                // Mettre à jour immédiatement le statut
                                                try {
                                                    await onUpdateCourse({ ...course, status: newStatus as any });
                                                    console.log('✅ Statut mis à jour avec succès');
                                                } catch (error: any) {
                                                    console.error('❌ Erreur lors de la mise à jour du statut:', error);
                                                    if (error.code === '23514') {
                                                        alert('Erreur: Le statut "' + newStatus + '" n\'est pas autorisé. Statuts valides: published, draft, archived');
                                                    } else {
                                                        alert('Erreur lors de la mise à jour du statut du cours');
                                                    }
                                                }
                                            }}
                                            className={`p-2 rounded-lg transition-colors ${
                                                course.status === 'published' 
                                                    ? 'text-green-600 hover:bg-green-50' 
                                                    : 'text-gray-400 hover:bg-gray-50'
                                            }`}
                                            title={course.status === 'published' ? 'Désactiver le cours (passer en brouillon)' : 'Activer le cours (publier)'}
                                        >
                                            <i className={`fas ${course.status === 'published' ? 'fa-toggle-on' : 'fa-toggle-off'} text-xl`}></i>
                                        </button>
                                        <button 
                                            onClick={() => handleOpenForm(course)} 
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Modifier"
                                        >
                                            <i className="fas fa-edit"></i>
                            </button>
                    {canDeleteModule && (
                        <button
                            onClick={() => setDeletingCourseId(course.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                        >
                            <i className="fas fa-trash"></i>
                        </button>
                    )}
                                    </div>
                        </div>
                    </div>
                ))}
            </div>
                )}
            </div>

            {/* Modal de confirmation de suppression */}
            {deletingCourseId !== null && (
                <ConfirmationModal 
                    title="Supprimer le cours"
                    message="Êtes-vous sûr de vouloir supprimer ce cours ? Cette action est irréversible."
                    onConfirm={() => handleDelete(deletingCourseId)}
                    onCancel={() => setDeletingCourseId(null)}
                />
            )}
        </div>
    );
};

export default CourseManagement;

