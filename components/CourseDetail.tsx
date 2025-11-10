import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { useAuth } from '../contexts/AuthContextSupabase';
import { Course, Lesson, Module, TimeLog, Project, EvidenceDocument } from '../types';
import LogTimeModal from './LogTimeModal';
import { DataService } from '../services/dataService';
import { logger } from '../services/loggerService';
import LinkPreview from './common/LinkPreview';
import RealtimeService from '../services/realtimeService';

type LessonTimerState = {
    lessonId: string | null;
    startedAt: number | null;
    elapsedMs: number;
    isRunning: boolean;
};

const INITIAL_TIMER_STATE: LessonTimerState = {
    lessonId: null,
    startedAt: null,
    elapsedMs: 0,
    isRunning: false,
};

interface CourseDetailProps {
    course: Course;
    onBack: () => void;
    timeLogs: TimeLog[];
    onAddTimeLog: (log: Omit<TimeLog, 'id' | 'userId'>) => void;
    projects: Project[];
    onCourseChange: (course: Course) => void;
}

// Interface pour les notes par leçon
interface LessonNote {
    lessonId: string;
    note: string;
    updatedAt: string;
}

// Composant pour une leçon avec statut et notes
const EnhancedLessonItem: React.FC<{
    lesson: Lesson;
    moduleIndex: number;
    lessonIndex: number;
    isCompleted: boolean;
    isInProgress: boolean;
    isNext: boolean;
    note: string;
    onToggle: (id: string) => void;
    onStart: (lesson: Lesson) => void;
    onNoteChange: (lessonId: string, note: string) => void;
    course: Course;
    isLocked: boolean;
    timerSeconds?: number;
    timerIsRunning?: boolean;
    onPauseResume?: () => void;
}> = ({ lesson, isCompleted, isInProgress, isNext, note, onToggle, onStart, onNoteChange, course, isLocked, timerSeconds, timerIsRunning, onPauseResume }) => {
    const [showNote, setShowNote] = useState(false);
    const [editingNote, setEditingNote] = useState(note);
    
    const formatSeconds = (totalSeconds: number) => {
        const safeValue = Math.max(0, totalSeconds);
        const minutes = Math.floor(safeValue / 60);
        const seconds = safeValue % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // Déterminer le statut visuel
    const getStatusBadge = () => {
        if (isCompleted) {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800"><i className="fas fa-check-circle mr-1"></i>Terminé</span>;
        }
        if (isInProgress) {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"><i className="fas fa-play-circle mr-1"></i>En cours</span>;
        }
        if (isNext) {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800"><i className="fas fa-arrow-right mr-1"></i>Prochaine</span>;
        }
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600"><i className="far fa-circle mr-1"></i>À faire</span>;
    };

    const handleNoteSave = () => {
        onNoteChange(lesson.id, editingNote);
        setShowNote(false);
    };

    return (
        <div className={`p-4 rounded-lg border-2 transition-all duration-200 ${
            isNext ? 'border-purple-400 bg-purple-50 shadow-md' :
            isCompleted ? 'border-emerald-200 bg-emerald-50' :
            isInProgress ? 'border-blue-200 bg-blue-50' :
            'border-gray-200 bg-white hover:border-gray-300'
        }`}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-start flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 flex-shrink-0 ${
                        isCompleted ? 'bg-emerald-500' :
                        isInProgress ? 'bg-blue-500' :
                        isNext ? 'bg-purple-500' :
                        'bg-gray-300'
                    }`}>
                        <i className={`${
                            isCompleted ? 'fas fa-check text-white' :
                            isInProgress ? 'fas fa-play text-white' :
                            isNext ? 'fas fa-arrow-right text-white' :
                            'far fa-circle text-gray-600'
                        }`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-bold text-lg ${
                                isCompleted ? 'text-emerald-800' :
                                isInProgress ? 'text-blue-800' :
                                isNext ? 'text-purple-800' :
                                'text-gray-800'
                            }`}>
                                {lesson.title}
                            </h4>
                            {getStatusBadge()}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                            <span className="flex items-center">
                                <i className={`${lesson.icon || 'fas fa-play-circle'} mr-1`}></i>
                                {lesson.type === 'video' ? '📹 Vidéo' : lesson.type === 'reading' ? '📖 Lecture' : lesson.type === 'quiz' ? '❓ Quiz' : '📄 Document'}
                            </span>
                            <span className="flex items-center">
                                <i className="fas fa-clock mr-1"></i>
                                {lesson.duration}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mb-3">
                {!isCompleted && (
                    <button
                        onClick={() => {
                            if (isLocked) return;
                            onStart(lesson);
                        }}
                        disabled={isLocked}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center ${
                            isNext 
                                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 shadow-md' 
                                : isInProgress
                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                                : 'bg-gray-600 text-white hover:bg-gray-700'
                        } ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                        <i className={`fas ${isNext ? 'fa-play' : isInProgress ? 'fa-redo' : 'fa-play'} mr-2`}></i>
                        {isNext ? 'Continuer' : isInProgress ? 'Reprendre' : 'Commencer'}
                    </button>
                )}
                <button
                    onClick={() => {
                        if (isLocked) return;
                        onToggle(lesson.id);
                    }}
                    disabled={isLocked}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                        isCompleted
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                    <i className={`fas ${isCompleted ? 'fa-undo' : 'fa-check'} mr-2`}></i>
                    {isCompleted ? 'Marquer non terminé' : 'Marquer terminé'}
                </button>
                {typeof timerSeconds === 'number' && onPauseResume && (
                    <button
                        onClick={onPauseResume}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center ${
                            timerIsRunning ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        }`}
                    >
                        <i className={`fas ${timerIsRunning ? 'fa-pause' : 'fa-play'} mr-2`}></i>
                        {timerIsRunning ? 'Pause' : 'Reprendre'}
                    </button>
                )}
                <button
                    onClick={() => setShowNote(!showNote)}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                        note ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                    <i className={`fas ${note ? 'fa-sticky-note' : 'fa-sticky-note'} mr-2`}></i>
                    Notes {note ? `(${note.length} caractères)` : ''}
                </button>
            </div>

            {/* Zone de notes */}
            {showNote && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <textarea
                        value={editingNote}
                        onChange={(e) => setEditingNote(e.target.value)}
                        placeholder="Ajoutez vos notes sur cette leçon..."
                        className="w-full p-2 border border-yellow-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 min-h-[100px]"
                    />
                    <div className="flex justify-end gap-2 mt-2">
                        <button
                            onClick={() => {
                                setEditingNote(note);
                                setShowNote(false);
                            }}
                            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleNoteSave}
                            className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
                        >
                            Enregistrer
                        </button>
                    </div>
                </div>
            )}

            {typeof timerSeconds === 'number' && (
                <div className="mt-3 px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-between">
                    <span className="font-mono text-xl text-gray-800">
                        {formatSeconds(timerSeconds)}
                    </span>
                    {timerIsRunning !== undefined && (
                        <span className={`text-xs font-semibold uppercase ${timerIsRunning ? 'text-green-600' : 'text-gray-500'}`}>
                            {timerIsRunning ? 'Chrono en cours' : 'Chrono en pause'}
                        </span>
                    )}
                </div>
            )}

            {/* Ressource principale */}
            {(lesson.contentUrl || course.youtubeUrl) && (
                <div className="mt-3 text-sm">
                    <p className="text-gray-500 flex items-center gap-2 mb-1">
                        <i className="fas fa-external-link-alt text-emerald-600"></i>
                        Ressource principale
                    </p>
                    <a
                        href={lesson.contentUrl || course.youtubeUrl || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold"
                    >
                        Ouvrir le contenu
                        <i className="fas fa-arrow-right"></i>
                    </a>
                </div>
            )}

            {/* Pièces jointes de la leçon */}
            {lesson.attachments && lesson.attachments.length > 0 && (
                <div className="mt-3">
                    <p className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                        <i className="fas fa-paperclip text-emerald-600"></i>
                        Pièces jointes
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {lesson.attachments.map((attachment, index) => (
                            <a
                                key={`${attachment.fileName}-${index}`}
                                href={attachment.dataUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={attachment.fileName}
                                className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-sm rounded-lg text-emerald-700 hover:bg-emerald-100 transition"
                            >
                                <i className="fas fa-file-alt mr-1"></i>
                                {attachment.fileName}
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Liens complémentaires */}
            {lesson.externalLinks && lesson.externalLinks.length > 0 && (
                <div className="mt-3">
                    <p className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                        <i className="fas fa-link text-blue-600"></i>
                        Liens complémentaires
                    </p>
                    <ul className="space-y-1 text-sm">
                        {lesson.externalLinks.map((link, index) => (
                            <li key={`${link.url}-${index}`}>
                                <a
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700"
                                >
                                    {link.label || link.url}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

const CourseDetail: React.FC<CourseDetailProps> = ({ course, onBack, timeLogs, onAddTimeLog, projects, onCourseChange }) => {
    const { t } = useLocalization();
    const { user } = useAuth();
    const [isLogTimeModalOpen, setLogTimeModalOpen] = useState(false);
    const [isLoadingModules, setIsLoadingModules] = useState(true);
    const [lessonNotes, setLessonNotes] = useState<Record<string, string>>({});
    const [inProgressLessons, setInProgressLessons] = useState<string[]>([]);
    const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
    const [lessonTimer, setLessonTimer] = useState<LessonTimerState>({ ...INITIAL_TIMER_STATE });
    const [timerTick, setTimerTick] = useState(0);
    const modulesLoadedRef = useRef<string | null>(null);

    useEffect(() => {
        if (!lessonTimer.isRunning || !lessonTimer.lessonId) {
            return;
        }
        const interval = window.setInterval(() => {
            setTimerTick(tick => tick + 1);
        }, 1000);
        return () => window.clearInterval(interval);
    }, [lessonTimer.isRunning, lessonTimer.lessonId]);

    const resetLessonTimer = () => {
        setLessonTimer({ ...INITIAL_TIMER_STATE });
        setTimerTick(0);
    };

    const getElapsedMsForLesson = useCallback((lessonId: string) => {
        if (lessonTimer.lessonId !== lessonId) return 0;
        let total = lessonTimer.elapsedMs;
        if (lessonTimer.isRunning && lessonTimer.startedAt) {
            total += Date.now() - lessonTimer.startedAt;
        }
        return total;
    }, [lessonTimer]);

    const parseDurationToMinutes = useCallback((duration?: string | null) => {
        if (!duration) return null;
        const trimmed = duration.trim().toLowerCase();
        const minuteMatch = trimmed.match(/([0-9]+)\s*(min|minutes|m)/);
        if (minuteMatch) {
            return Math.max(1, parseInt(minuteMatch[1], 10));
        }
        const hourMatch = trimmed.match(/([0-9]+)\s*(h|heures|hours)/);
        if (hourMatch) {
            return Math.max(1, parseInt(hourMatch[1], 10) * 60);
        }
        return null;
    }, []);

    const computeModuleStates = useMemo(() => {
        if (!course.modules || course.modules.length === 0) return [];

        const completedSet = new Set(course.completedLessons || []);
        let lockedForNext = course.sequentialModules ? false : false;
        let lockReasonForNext = '';

        return course.modules.map((module, index) => {
            const lessons = module.lessons || [];
            const completedCount = lessons.filter(lesson => completedSet.has(lesson.id)).length;
            const moduleCompleted = lessons.length === 0 ? true : completedCount === lessons.length;
            const awaitingValidation = module.requiresValidation && moduleCompleted;

            const isLocked = course.sequentialModules ? lockedForNext : false;
            const lockedReason = course.sequentialModules && lockedForNext ? (lockReasonForNext || 'Terminez le module précédent pour continuer.') : '';

            if (course.sequentialModules) {
                if (!moduleCompleted) {
                    lockedForNext = true;
                    lockReasonForNext = 'Terminez ce module pour débloquer le suivant.';
                } else if (module.requiresValidation && module.unlocksNextModule === false) {
                    lockedForNext = true;
                    lockReasonForNext = 'Un instructeur doit valider ce module pour débloquer le suivant.';
                } else if (module.unlocksNextModule === false) {
                    lockedForNext = true;
                    lockReasonForNext = 'Ce module est verrouillé par un administrateur.';
                } else {
                    lockedForNext = false;
                    lockReasonForNext = '';
                }
            }

            return {
                moduleIndex: index,
                isLocked,
                lockedReason,
                awaitingValidation,
                moduleCompleted
            };
        });
    }, [course.modules, course.completedLessons, course.sequentialModules]);

    if (!user) return null;

    // Trouver la prochaine leçon non complétée
    const getNextLesson = useCallback(() => {
        if (!course.modules || course.modules.length === 0) return null;
        
        const completed = new Set(course.completedLessons || []);
        
        for (const module of course.modules) {
            for (const lesson of module.lessons) {
                if (!completed.has(lesson.id)) {
                    return lesson.id;
                }
            }
        }
        
        return null;
    }, [course.modules, course.completedLessons]);

    const nextLessonId = useMemo(() => getNextLesson(), [getNextLesson]);

    const selectedLesson = useMemo(() => {
        if (!course.modules) return null;
        const lessonId = selectedLessonId || nextLessonId;
        if (!lessonId) return null;
        for (const module of course.modules) {
            const found = module.lessons.find(lesson => lesson.id === lessonId);
            if (found) {
                return found;
            }
        }
        return null;
    }, [course.modules, selectedLessonId, nextLessonId]);

    const activeElapsedSeconds = useMemo(() => {
        if (!selectedLesson) return 0;
        return Math.floor(getElapsedMsForLesson(selectedLesson.id) / 1000);
    }, [selectedLesson, getElapsedMsForLesson, timerTick]);

    const handlePauseResumeTimer = () => {
        setLessonTimer(prev => {
            if (!prev.lessonId) {
                return prev;
            }
            if (prev.isRunning) {
                const accumulated = prev.startedAt ? prev.elapsedMs + (Date.now() - prev.startedAt) : prev.elapsedMs;
                return { ...prev, elapsedMs: accumulated, startedAt: null, isRunning: false };
            }
            return { ...prev, startedAt: Date.now(), isRunning: true };
        });
    };

    useEffect(() => {
        if (!course.modules || course.modules.length === 0) return;
        const exists = selectedLessonId && course.modules.some(module => module.lessons.some(lesson => lesson.id === selectedLessonId));
        if (!exists) {
            const fallback = nextLessonId || course.modules[0]?.lessons[0]?.id || null;
            if (fallback) {
                setSelectedLessonId(fallback);
            }
        }
    }, [course.modules, selectedLessonId, nextLessonId]);

    useEffect(() => {
        if (!course.modules || course.modules.length === 0) return;
        setExpandedModules(prev => {
            const next = { ...prev };
            let changed = false;

            if (Object.keys(next).length === 0) {
                course.modules.forEach((module, index) => {
                    const shouldOpen = module.lessons.some(lesson => lesson.id === (selectedLesson?.id || nextLessonId));
                    next[module.id] = shouldOpen || index === 0;
                });
                changed = true;
            } else if (selectedLesson) {
                course.modules.forEach(module => {
                    if (module.lessons.some(lesson => lesson.id === selectedLesson.id) && !next[module.id]) {
                        next[module.id] = true;
                        changed = true;
                    }
                });
            }

            return changed ? next : prev;
        });
    }, [course.modules, selectedLesson, nextLessonId]);

    const selectedModuleIndex = useMemo(() => {
        if (!course.modules || !selectedLesson) return 0;
        const idx = course.modules.findIndex(module => module.lessons.some(lesson => lesson.id === selectedLesson.id));
        return idx >= 0 ? idx : 0;
    }, [course.modules, selectedLesson]);

    const selectedLessonIndex = useMemo(() => {
        if (!course.modules || !selectedLesson) return 0;
        const module = course.modules[selectedModuleIndex];
        if (!module) return 0;
        const idx = module.lessons.findIndex(lesson => lesson.id === selectedLesson.id);
        return idx >= 0 ? idx : 0;
    }, [course.modules, selectedModuleIndex, selectedLesson]);

    const selectedModuleState = useMemo(() => {
        if (!selectedLesson) return undefined;
        return computeModuleStates[selectedModuleIndex] || undefined;
    }, [computeModuleStates, selectedLesson, selectedModuleIndex]);

    const selectedLessonLocked = useMemo(() => {
        if (!selectedLesson) return false;
        if (!selectedModuleState) return false;
        const isCompleted = (course.completedLessons || []).includes(selectedLesson.id);
        return selectedModuleState.isLocked && !isCompleted;
    }, [selectedLesson, selectedModuleState, course.completedLessons]);

    const selectedModule = useMemo(() => {
        if (!course.modules || course.modules.length === 0) return undefined;
        return course.modules[selectedModuleIndex];
    }, [course.modules, selectedModuleIndex]);

    // Charger les modules et la progression
    useEffect(() => {
        const loadCourseData = async () => {
            if (!user || !course.id) return;
            
            if (modulesLoadedRef.current === course.id) {
                setIsLoadingModules(false);
                return;
            }
            
            setIsLoadingModules(true);
            try {
                logger.info('course', `Chargement modules pour cours: ${course.id}`);
                const userId = (user as any).profileId || user.id;
                
                // Charger les modules et leçons
                const modulesResult = await DataService.getCourseModules(course.id);
                logger.info('course', `Résultat getCourseModules: ${modulesResult.error ? 'ERROR' : 'OK'}, ${modulesResult.data?.length || 0} modules`);
                
                if (!modulesResult.error && modulesResult.data) {
                    const mappedModules: Module[] = modulesResult.data.map((mod: any) => ({
                        id: mod.id,
                        title: mod.title,
                        description: mod.description,
                        requiresValidation: mod.requires_validation ?? false,
                        unlocksNextModule: mod.unlocks_next_module ?? false,
                        evidenceDocuments: mod.evidence_documents || [],
                        lessons: (mod.lessons || []).map((lesson: any) => ({
                            id: lesson.id,
                            title: lesson.title,
                            type: lesson.type || 'video',
                            duration: lesson.duration || '0 min',
                            icon: lesson.icon || 'fas fa-play-circle',
                            description: lesson.description || '',
                            contentUrl: lesson.content_url || undefined,
                            attachments: lesson.attachments || [],
                            externalLinks: lesson.external_links || []
                        }))
                    }));
                    
                    logger.info('course', `Modules mappés: ${mappedModules.length} modules, ${mappedModules.reduce((sum, m) => sum + m.lessons.length, 0)} leçons`);
                    
                    // Charger la progression de l'utilisateur
                    const enrollmentResult = await DataService.getCourseEnrollment(course.id, String(userId));
                    const completedLessons = enrollmentResult.data?.completed_lessons || [];
                    const progress = enrollmentResult.data?.progress || 0;
                    const notes = enrollmentResult.data?.notes || {};
                    
                    logger.info('course', `Progression chargée: ${progress}%, ${completedLessons.length} leçons complétées`);
                    
                    // Charger les notes
                    setLessonNotes(notes || {});
                    
                    // Mettre à jour le cours avec les modules et la progression
                    onCourseChange({
                        ...course,
                        modules: mappedModules,
                        completedLessons,
                        progress
                    });

                    // Créer l'enrollment s'il n'existe pas encore (inscription auto)
                    if (!enrollmentResult.data && mappedModules.length > 0) {
                        logger.info('course', `Inscription automatique au cours: ${course.id}`);
                        await DataService.upsertCourseEnrollment(
                            course.id,
                            String(userId),
                            0,
                            []
                        );
                    }
                    
                    modulesLoadedRef.current = course.id;
                } else {
                    logger.error('course', `Erreur chargement modules:`, modulesResult.error);
                }
            } catch (error) {
                logger.error('course', `Erreur chargement modules:`, error);
            } finally {
                setIsLoadingModules(false);
            }
        };

        loadCourseData();
    }, [course.id]);

    // Realtime subscription pour la progression
    useEffect(() => {
        if (!user || !course.id) return;
        
        const userId = (user as any).profileId || user.id;
        const filter = `course_id=eq.${course.id}&user_id=eq.${userId}`;
        const channel = RealtimeService.subscribeToTable('course_enrollments', (payload: any) => {
            if (payload.new && payload.new.course_id === course.id && payload.new.user_id === userId) {
                // Mettre à jour la progression en temps réel
                const newProgress = payload.new.progress || 0;
                const newCompletedLessons = payload.new.completed_lessons || [];
                const newNotes = payload.new.notes || {};
                
                onCourseChange({
                    ...course,
                    progress: newProgress,
                    completedLessons: newCompletedLessons
                });
                
                // Mettre à jour les notes
                setLessonNotes(newNotes);
            }
        }, filter);

        return () => {
            if (channel) {
                RealtimeService.unsubscribe(channel);
            }
        };
    }, [course.id, user]);

    const handleStartLesson = (lesson: Lesson) => {
        const isDifferentLesson = lessonTimer.lessonId !== lesson.id;
        setSelectedLessonId(lesson.id);
        setLessonTimer(prev => {
            if (prev.lessonId === lesson.id) {
                if (prev.isRunning) {
                    return prev;
                }
                return { ...prev, startedAt: Date.now(), isRunning: true };
            }
            return {
                lessonId: lesson.id,
                startedAt: Date.now(),
                elapsedMs: 0,
                isRunning: true,
            };
        });
        if (isDifferentLesson) {
            setTimerTick(0);
        }
        setInProgressLessons(prev => [...new Set([...prev, lesson.id])]);
        
        // Si c'est la première leçon, mettre la progression à 5%
        if (course.progress === 0) {
            onCourseChange({ ...course, progress: 5 });
        }
        
        // Ouvrir le contenu de la leçon (YouTube, Drive, etc.)
        if (lesson.contentUrl) {
            window.open(lesson.contentUrl, '_blank');
        } else if (course.youtubeUrl) {
            window.open(course.youtubeUrl, '_blank');
        }
    };

    const handleToggleLesson = async (lessonId: string) => {
        logger.info('course', `handleToggleLesson appelé pour leçon: ${lessonId}`);
        
        const totalLessons = course.modules?.reduce((acc, module) => acc + module.lessons.length, 0) || 0;
        const completed = new Set(course.completedLessons || []);
        
        const wasCompleted = completed.has(lessonId);
        if (wasCompleted) {
            completed.delete(lessonId);
            setInProgressLessons(prev => prev.filter(id => id !== lessonId));
        } else {
            completed.add(lessonId);
            setInProgressLessons(prev => prev.filter(id => id !== lessonId));
        }
        
        const newCompletedLessons = Array.from(completed);
        let newProgress = totalLessons > 0 ? Math.round((newCompletedLessons.length / totalLessons) * 100) : 0;
        
        if (newProgress === 0 && course.progress > 0) {
            newProgress = 5;
        }

        // Mettre à jour l'état local immédiatement
        onCourseChange({
            ...course,
            completedLessons: newCompletedLessons,
            progress: newProgress,
        });

        // Sauvegarder dans Supabase
        try {
            const userId = (user as any).profileId || user.id;
            const result = await DataService.upsertCourseEnrollment(
                course.id,
                String(userId),
                newProgress,
                newCompletedLessons
            );
            
            if (result.error) {
                console.error('❌ Erreur sauvegarde progression:', result.error);
                // Rollback
                onCourseChange({
                    ...course,
                    completedLessons: course.completedLessons || [],
                    progress: course.progress || 0,
                });
                alert('Erreur lors de la sauvegarde de la progression');
            }
        } catch (error) {
            console.error('❌ Erreur sauvegarde progression:', error);
        }

        let targetLesson: Lesson | null = null;
        if (course.modules) {
            for (const mod of course.modules) {
                const l = mod.lessons.find(x => x.id === lessonId);
                if (l) { targetLesson = l; break; }
            }
        }

        if (!wasCompleted) {
            let minutesLogged: number | null = null;
            const totalMs = getElapsedMsForLesson(lessonId);
            if (totalMs > 0) {
                minutesLogged = Math.max(1, Math.round(totalMs / 60000));
            }
            if (!minutesLogged || !Number.isFinite(minutesLogged)) {
                const fallback = parseDurationToMinutes(targetLesson?.duration);
                if (fallback) {
                    minutesLogged = fallback;
                }
            }
            if (!minutesLogged || minutesLogged <= 0) {
                minutesLogged = 5;
            }

            onAddTimeLog({
                entityType: 'course',
                entityId: String(course.id),
                entityTitle: `${course.title}${targetLesson ? ' • ' + targetLesson.title : ''}`,
                date: new Date().toISOString().split('T')[0],
                duration: minutesLogged,
                description: `Temps passé sur ${targetLesson ? targetLesson.title : 'une leçon'}`
            });

            if (lessonTimer.lessonId === lessonId) {
                resetLessonTimer();
            }
        } else if (lessonTimer.lessonId === lessonId) {
            resetLessonTimer();
        }
 
        if (!wasCompleted && nextLessonId && nextLessonId !== lessonId) {
            setSelectedLessonId(nextLessonId);
        }
    };

    const handleNoteChange = async (lessonId: string, note: string) => {
        setLessonNotes(prev => ({ ...prev, [lessonId]: note }));
        
        // Sauvegarder les notes dans Supabase
        try {
            const userId = (user as any).profileId || user.id;
            const enrollmentResult = await DataService.getCourseEnrollment(course.id, String(userId));
            
            if (enrollmentResult.data) {
                const currentNotes = enrollmentResult.data.notes || {};
                const updatedNotes = { ...currentNotes, [lessonId]: note };
                
                // Mettre à jour les notes dans l'enrollment
                await DataService.upsertCourseEnrollment(
                    course.id,
                    String(userId),
                    course.progress || 0,
                    course.completedLessons || [],
                    updatedNotes
                );
            }
        } catch (error) {
            console.error('❌ Erreur sauvegarde notes:', error);
        }
    };

    const handleContinue = () => {
        if (!nextLessonId || !course.modules) return;
        
        for (const module of course.modules) {
            const lesson = module.lessons.find(l => l.id === nextLessonId);
            if (lesson) {
                handleStartLesson(lesson);
                break;
            }
        }
    };

    const totalLessons = course.modules?.reduce((acc, module) => acc + module.lessons.length, 0) || 0;
    const completedLessonsCount = (course.completedLessons || []).length;
    const totalMinutesLogged = timeLogs
        .filter(log => log.entityType === 'course' && log.entityId === course.id && log.userId === user.id)
        .reduce((sum, log) => sum + log.duration, 0);

    const formatMinutes = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const handleSaveTimeLog = (logData: Omit<TimeLog, 'id' | 'userId'>) => {
        onAddTimeLog(logData);
        setLogTimeModalOpen(false);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header avec gradient */}
            <div className="bg-gradient-to-r from-emerald-600 via-green-500 to-blue-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <button 
                        onClick={onBack} 
                        className="flex items-center text-white hover:text-emerald-100 transition-colors mb-4"
                    >
                        <i className="fas fa-arrow-left mr-2"></i>
                        {t('back_to_courses')}
                    </button>
                
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <h1 className="text-4xl font-bold mb-2">{course.title}</h1>
                            <p className="text-emerald-50 text-sm">{course.description}</p>
                        </div>
                        <div className="hidden md:flex items-center space-x-4 text-right">
                            <div>
                                <p className="text-xs text-emerald-100 uppercase">Progression</p>
                                <p className="text-3xl font-bold">{course.progress || 0}%</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100 flex items-center gap-3">
                        <div className="bg-blue-100 p-3 rounded-lg">
                            <i className="fas fa-list text-blue-600"></i>
                        </div>
                        <div>
                            <p className="text-xs text-gray-600 uppercase">Modules</p>
                            <p className="text-xl font-bold text-gray-900">{course.modules?.length || 0}</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100 flex items-center gap-3">
                        <div className="bg-green-100 p-3 rounded-lg">
                            <i className="fas fa-check-circle text-green-600"></i>
                        </div>
                        <div>
                            <p className="text-xs text-gray-600 uppercase">Leçons terminées</p>
                            <p className="text-xl font-bold text-gray-900">{completedLessonsCount}/{totalLessons}</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100 flex items-center gap-3">
                        <div className="bg-purple-100 p-3 rounded-lg">
                            <i className="fas fa-clock text-purple-600"></i>
                        </div>
                        <div>
                            <p className="text-xs text-gray-600 uppercase">Temps enregistré</p>
                            <p className="text-xl font-bold text-gray-900">{formatMinutes(totalMinutesLogged)}</p>
                        </div>
                    </div>
                </div>

                {course.courseMaterials && course.courseMaterials.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-5">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <i className="fas fa-folder text-emerald-600"></i>
                            Ressources du cours
                        </h3>
                        <p className="text-sm text-gray-500 mb-3">Documents fournis par l’instructeur (PDF, Word, Excel, images...).</p>
                        <div className="flex flex-wrap gap-3">
                            {course.courseMaterials.map((doc: EvidenceDocument, idx: number) => (
                                <a
                                    key={`${doc.fileName}-${idx}`}
                                    href={doc.dataUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={doc.fileName}
                                    className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-all text-sm font-semibold"
                                >
                                    <i className="fas fa-file-alt"></i>
                                    {doc.fileName}
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6">
                    <aside className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase text-gray-500">Plan du cours</p>
                                <p className="text-sm text-gray-600">{completedLessonsCount} leçons terminées sur {totalLessons}</p>
                            </div>
                        </div>

                        {isLoadingModules ? (
                            <div className="text-center py-10">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto mb-3"></div>
                                <p className="text-sm text-gray-500">Chargement du plan...</p>
                            </div>
                        ) : course.modules && course.modules.length > 0 ? (
                            course.modules.map((module, index) => {
                                const state = computeModuleStates[index] || { isLocked: false, lockedReason: '', awaitingValidation: false, moduleCompleted: false };
                                const completedSet = new Set(course.completedLessons || []);
                                const lessons = module.lessons || [];
                                const moduleCompletedCount = lessons.filter(lesson => completedSet.has(lesson.id)).length;
                                const moduleProgress = lessons.length > 0 ? Math.round((moduleCompletedCount / lessons.length) * 100) : 100;
                                const expanded = expandedModules[module.id] ?? false;

                                return (
                                    <div key={module.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setExpandedModules(prev => ({ ...prev, [module.id]: !expanded }))}
                                            className="w-full bg-gray-50 hover:bg-gray-100 px-3 py-3 flex items-center justify-between"
                                        >
                                            <div className="text-left">
                                                <p className="text-[10px] uppercase tracking-wide text-gray-500">Module {index + 1}</p>
                                                <p className="text-sm font-semibold text-gray-800 truncate">{module.title}</p>
                                                {state.awaitingValidation && (
                                                    <p className="text-xs text-yellow-700 mt-1 flex items-center gap-1">
                                                        <i className="fas fa-clipboard-check"></i>
                                                        En attente de validation
                                                    </p>
                                                )}
                                                {state.isLocked && state.lockedReason && (
                                                    <p className="text-xs text-gray-500 mt-1">{state.lockedReason}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-emerald-600">{moduleProgress}%</span>
                                                <i className={`fas ${expanded ? 'fa-chevron-up' : 'fa-chevron-down'} text-gray-400`}></i>
                                            </div>
                                        </button>

                                        {expanded && (
                                            <ul className="border-t border-gray-200 bg-white">
                                                {lessons.length === 0 && (
                                                    <li className="px-3 py-3 text-xs text-gray-500 italic">
                                                        Aucune leçon dans ce module
                                                    </li>
                                                )}
                                                {lessons.map(lesson => {
                                                    const isCompleted = completedSet.has(lesson.id);
                                                    const isInProgress = inProgressLessons.includes(lesson.id);
                                                    const isCurrent = selectedLesson?.id === lesson.id;
                                                    const isNext = nextLessonId === lesson.id;
                                                    const lessonLocked = state.isLocked && !isCompleted;

                                                    let statusIcon = 'fa-circle';
                                                    let statusColor = 'text-gray-400';
                                                    if (isCompleted) {
                                                        statusIcon = 'fa-check-circle';
                                                        statusColor = 'text-emerald-500';
                                                    } else if (lessonLocked) {
                                                        statusIcon = 'fa-lock';
                                                        statusColor = 'text-gray-400';
                                                    } else if (isInProgress) {
                                                        statusIcon = 'fa-play-circle';
                                                        statusColor = 'text-blue-500';
                                                    } else if (isNext) {
                                                        statusIcon = 'fa-arrow-right';
                                                        statusColor = 'text-purple-500';
                                                    }

                                                    return (
                                                        <li key={lesson.id} className="border-b border-gray-100 last:border-b-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (lessonLocked) return;
                                                                    setSelectedLessonId(lesson.id);
                                                                    setExpandedModules(prev => ({ ...prev, [module.id]: true }));
                                                                }}
                                                                className={`w-full text-left px-3 py-2 flex items-center gap-2 text-sm transition ${
                                                                    isCurrent ? 'bg-emerald-50 border-l-4 border-emerald-500' : 'hover:bg-gray-50'
                                                                } ${lessonLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                            >
                                                                <i className={`fas ${statusIcon} ${statusColor}`}></i>
                                                                <span className="flex-1 truncate">{lesson.title}</span>
                                                                {isNext && !isCompleted && (
                                                                    <span className="text-xs text-purple-600 font-semibold">Suivant</span>
                                                                )}
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-sm text-gray-500">Aucun module n’a encore été publié.</div>
                        )}
                    </aside>

                    <div className="space-y-6">
                        {nextLessonId && (
                            <button
                                onClick={handleContinue}
                                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow flex items-center justify-center"
                            >
                                <i className="fas fa-play-circle mr-2"></i>
                                Reprendre là où vous vous êtes arrêté
                            </button>
                        )}

                        {selectedLesson ? (
                            <EnhancedLessonItem
                                lesson={selectedLesson}
                                moduleIndex={selectedModuleIndex}
                                lessonIndex={selectedLessonIndex}
                                isCompleted={(course.completedLessons || []).includes(selectedLesson.id)}
                                isInProgress={inProgressLessons.includes(selectedLesson.id)}
                                isNext={nextLessonId === selectedLesson.id}
                                note={lessonNotes[selectedLesson.id] || ''}
                                onToggle={handleToggleLesson}
                                onStart={handleStartLesson}
                                onNoteChange={handleNoteChange}
                                course={course}
                                isLocked={selectedLessonLocked}
                                timerSeconds={lessonTimer.lessonId === selectedLesson.id ? activeElapsedSeconds : undefined}
                                timerIsRunning={lessonTimer.lessonId === selectedLesson.id ? lessonTimer.isRunning : undefined}
                                onPauseResume={lessonTimer.lessonId === selectedLesson.id ? handlePauseResumeTimer : undefined}
                            />
                        ) : (
                            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 text-center text-sm text-gray-500">
                                Sélectionnez une leçon dans la colonne de gauche pour afficher le contenu.
                            </div>
                        )}

                        {selectedModule?.evidenceDocuments && selectedModule.evidenceDocuments.length > 0 && (
                            <div className="bg-white rounded-xl shadow-lg p-5 border border-emerald-100">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <i className="fas fa-folder-open text-emerald-600"></i>
                                    Ressources du module
                                </h3>
                                <div className="flex flex-wrap gap-3">
                                    {selectedModule.evidenceDocuments.map((doc: EvidenceDocument, idx: number) => (
                                        <a
                                            key={`${doc.fileName}-${idx}`}
                                            href={doc.dataUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            download={doc.fileName}
                                            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-all text-sm font-semibold"
                                        >
                                            <i className="fas fa-file-alt"></i>
                                            {doc.fileName}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-1">
                                        <i className="fas fa-user text-emerald-600"></i>
                                        {t('instructor')}
                                    </div>
                                    <p className="text-gray-800 font-medium">{course.instructor}</p>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-1">
                                        <i className="fas fa-hourglass-half text-emerald-600"></i>
                                        Durée estimée
                                    </div>
                                    <p className="text-gray-800 font-medium">{course.duration}</p>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-1">
                                        <i className="fas fa-chart-line text-emerald-600"></i>
                                        Progression
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 h-3 rounded-full transition-all duration-500"
                                            style={{ width: `${course.progress || 0}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{completedLessonsCount} leçons sur {totalLessons}</p>
                                </div>
                                <div className="flex items-center md:justify-end">
                                    <button
                                        onClick={() => setLogTimeModalOpen(true)}
                                        className="px-4 py-2 border-2 border-emerald-600 text-emerald-600 rounded-lg font-semibold hover:bg-emerald-50 transition-all flex items-center gap-2"
                                    >
                                        <i className="fas fa-stopwatch"></i>
                                        {t('log_time')}
                                    </button>
                                </div>
                            </div>

                            {course.requiresFinalValidation && (
                                <div className="mt-4 p-4 border border-purple-200 bg-purple-50 rounded-lg flex items-start gap-3">
                                    <i className="fas fa-shield-alt text-purple-600 mt-1"></i>
                                    <div>
                                        <p className="text-sm font-semibold text-purple-800">Validation finale requise</p>
                                        <p className="text-xs text-purple-700">
                                            Une validation manuelle sera effectuée par un instructeur une fois toutes les leçons terminées.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {course.youtubeUrl && (
                                <div className="mt-6 pt-6 border-t border-gray-200">
                                    <LinkPreview url={course.youtubeUrl} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {isLogTimeModalOpen && (
                <LogTimeModal
                    onClose={() => setLogTimeModalOpen(false)}
                    onSave={handleSaveTimeLog}
                    projects={projects}
                    courses={[course]}
                    user={user}
                    initialEntity={{ type: 'course', id: course.id }}
                />
            )}
        </div>
    );
};

export default CourseDetail;

