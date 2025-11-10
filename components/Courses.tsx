import React, { useState, useMemo } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import { Course, User } from '../types';
import LinkPreview from './common/LinkPreview';

interface CoursesProps {
  onSelectCourse: (id: string) => void;
  courses: Course[];
  users?: User[];
  // Module consultatif uniquement - pas de création/édition
}

const Courses: React.FC<CoursesProps> = ({ courses, users = [], onSelectCourse }) => {
  const { t } = useLocalization();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'instructor' | 'rating' | 'students'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid');

  // Extraire toutes les catégories uniques
  const categories = useMemo(() => {
    const cats = new Set<string>();
    courses.forEach(course => {
      if (course.category) cats.add(course.category);
    });
    return Array.from(cats).sort();
  }, [courses]);

  // Filtrage et tri des cours
  const filteredCourses = useMemo(() => {
    let filtered = courses.filter(course => {
      // IMPORTANT: Ne montrer que les cours publiés dans le module Courses (consultation)
      // Les cours en brouillon (draft) ou archivés ne doivent pas apparaître
      if (course.status !== 'published') {
        return false;
      }

      // Recherche
      const matchesSearch = searchQuery === '' || 
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.instructor.toLowerCase().includes(searchQuery.toLowerCase());

      // Filtre par catégorie
      const matchesCategory = categoryFilter === 'all' || 
        (categoryFilter === 'no_category' && !course.category) ||
        course.category === categoryFilter;

      // Filtre par niveau
      const matchesLevel = levelFilter === 'all' || course.level === levelFilter;

      return matchesSearch && matchesCategory && matchesLevel;
    });

    // Tri
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      if (sortBy === 'date') {
        aValue = new Date(a.createdAt || '').getTime();
        bValue = new Date(b.createdAt || '').getTime();
      } else if (sortBy === 'title') {
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
      } else if (sortBy === 'instructor') {
        aValue = a.instructor.toLowerCase();
        bValue = b.instructor.toLowerCase();
      } else if (sortBy === 'rating') {
        aValue = a.rating || 0;
        bValue = b.rating || 0;
      } else if (sortBy === 'students') {
        aValue = a.studentsCount || 0;
        bValue = b.studentsCount || 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [courses, searchQuery, categoryFilter, levelFilter, sortBy, sortOrder]);

  // Métriques
  const totalCourses = courses.length;
  const publishedCourses = courses.filter(c => c.status === 'published').length;
  const draftCourses = courses.filter(c => c.status === 'draft').length;
  const totalStudents = courses.reduce((sum, c) => sum + (c.studentsCount || 0), 0);

  // Format duration
  const formatDuration = (duration: number | string | undefined): string => {
    if (!duration) return 'N/A';
    if (typeof duration === 'string') return duration;
    return `${Math.ceil(duration / 40)} Weeks`;
  };

  // Format rating
  const formatRating = (rating: number | undefined): string => {
    if (!rating) return '0.0';
    return rating.toFixed(1);
  };

  return (
      <div className="min-h-screen bg-gray-50">
        {/* Header moderne avec gradient */}
        <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2">{t('courses') || 'Courses'}</h1>
                <p className="text-emerald-50 text-sm">
                {t('view_all_courses') || 'Consultez et suivez vos formations'}
                </p>
              </div>
            </div>
            </div>
        </div>

        {/* Métriques Power BI style */}
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

        {/* Barre de recherche et filtres */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              {/* Recherche */}
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    placeholder={t('search') || 'Rechercher un cours...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Filtre par catégorie */}
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

              {/* Filtre par niveau */}
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="all">Tous les niveaux</option>
                <option value="beginner">Débutant</option>
                <option value="intermediate">Intermédiaire</option>
                <option value="advanced">Avancé</option>
              </select>

            {/* Note: Seuls les cours publiés sont affichés */}
            <div className="px-4 py-2 text-sm text-gray-500 italic">
              <i className="fas fa-info-circle mr-2"></i>
              Cours publiés uniquement
            </div>

              {/* Tri */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="date">Date</option>
                <option value="title">Titre</option>
                <option value="instructor">Instructeur</option>
                <option value="rating">Note</option>
                <option value="students">Étudiants</option>
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
            <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
              {filteredCourses.length} {filteredCourses.length > 1 ? 'cours trouvés' : 'cours trouvé'}
              {searchQuery && (
                <span className="ml-2 text-emerald-600">
                  pour "{searchQuery}"
                </span>
              )}
            </div>
          </div>

          {/* Liste des cours selon le mode de vue */}
          {filteredCourses.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <i className="fas fa-book-reader text-6xl text-gray-300 mb-4"></i>
              <p className="text-gray-600 text-lg mb-2">
                {searchQuery || categoryFilter !== 'all' || levelFilter !== 'all' ? 
                'Aucun cours publié ne correspond aux critères' : 
                t('no_courses_found') || 'Aucun cours publié disponible'}
            </p>
            </div>
          ) : (
            <div className={
              viewMode === 'grid' ? 
                'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 
                viewMode === 'compact' ?
                'bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden' :
                'space-y-6'
            }>
              {filteredCourses.map(course => (
                viewMode === 'grid' ? (
                  <div
                    key={course.id}
                    onClick={() => onSelectCourse(course.id)}
                    className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer border border-gray-200 overflow-hidden"
                  >
                    {course.thumbnailUrl ? (
                      <div className="h-40 bg-cover bg-center" style={{ backgroundImage: `url(${course.thumbnailUrl})` }}></div>
                    ) : (
                      <div className="h-40 bg-gradient-to-br from-emerald-100 to-blue-100 flex items-center justify-center">
                        <i className={`${course.icon || 'fas fa-book'} text-6xl text-gray-400`}></i>
                      </div>
                    )}
                    <div className="p-5">
                    <h3 className="text-lg font-bold text-gray-900 line-clamp-2 mb-2">{course.title}</h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{course.description}</p>
                      <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
                        <span><i className="fas fa-user mr-1"></i>{course.instructor}</span>
                        <span>•</span>
                        <span><i className="fas fa-clock mr-1"></i>{formatDuration(course.duration)}</span>
                        {course.level && (
                          <>
                            <span>•</span>
                            <span className={`px-2 py-0.5 rounded ${
                              course.level === 'beginner' ? 'bg-blue-100 text-blue-800' :
                              course.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {course.level === 'beginner' ? 'Débutant' : course.level === 'intermediate' ? 'Intermédiaire' : 'Avancé'}
                            </span>
                          </>
                        )}
                      </div>
                      {course.category && (
                        <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 mb-2">
                          {course.category}
                        </span>
                      )}
                      {/* Aperçus de liens */}
                      {(course.youtubeUrl || course.driveUrl) && (
                        <div className="mt-3 space-y-2">
                          {course.youtubeUrl && (
                            <LinkPreview url={course.youtubeUrl} type="youtube" className="text-xs" />
                          )}
                          {course.driveUrl && (
                            <LinkPreview url={course.driveUrl} type="drive" className="text-xs" />
                          )}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          {course.rating && course.rating > 0 && (
                            <span className="flex items-center">
                              <i className="fas fa-star text-yellow-500 mr-1"></i>
                              {formatRating(course.rating)}
                            </span>
                          )}
                          {course.studentsCount && course.studentsCount > 0 && (
                            <span className="flex items-center">
                              <i className="fas fa-users text-gray-400 mr-1"></i>
                              {course.studentsCount}
                            </span>
                          )}
                        </div>
                        {course.status && (
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
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
                ) : viewMode === 'compact' ? (
                  <div
                    key={course.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onSelectCourse(course.id)}
                  >
                    <div className="px-6 py-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">{course.title}</h3>
                          {course.category && (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                              {course.category}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {course.instructor} • {formatDuration(course.duration)} • {course.studentsCount || 0} étudiants
                        </p>
                      </div>
                    </div>
        </div>
      ) : (
                  <div
                    key={course.id}
                    onClick={() => onSelectCourse(course.id)}
                    className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer border border-gray-200"
                  >
                    <div className="flex items-start gap-5">
                      {course.thumbnailUrl ? (
                        <div className="w-32 h-32 bg-cover bg-center rounded-lg flex-shrink-0" style={{ backgroundImage: `url(${course.thumbnailUrl})` }}></div>
                      ) : (
                        <div className="w-32 h-32 bg-gradient-to-br from-emerald-100 to-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <i className={`${course.icon || 'fas fa-book'} text-4xl text-gray-400`}></i>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-1">{course.title}</h3>
                            <p className="text-sm text-gray-600 mb-3">{course.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <span className="flex items-center">
                            <i className="fas fa-user mr-2 text-gray-400"></i>
                            {course.instructor}
                          </span>
                          <span className="flex items-center">
                            <i className="fas fa-clock mr-2 text-gray-400"></i>
                            {formatDuration(course.duration)}
                          </span>
                          {course.level && (
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              course.level === 'beginner' ? 'bg-blue-100 text-blue-800' :
                              course.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {course.level === 'beginner' ? 'Débutant' : course.level === 'intermediate' ? 'Intermédiaire' : 'Avancé'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 flex-wrap">
                          {course.category && (
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {course.category}
                            </span>
                          )}
                          {course.rating && course.rating > 0 && (
                            <span className="flex items-center text-sm">
                              <i className="fas fa-star text-yellow-500 mr-1"></i>
                              {formatRating(course.rating)}
                            </span>
                          )}
                          {course.studentsCount && course.studentsCount > 0 && (
                            <span className="flex items-center text-sm text-gray-600">
                              <i className="fas fa-users text-gray-400 mr-1"></i>
                              {course.studentsCount} étudiant{course.studentsCount > 1 ? 's' : ''}
                            </span>
                          )}
                          {course.status && (
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
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
                  </div>
                )
              ))}
        </div>
      )}
        </div>
    </div>
  );
};

export default Courses;

