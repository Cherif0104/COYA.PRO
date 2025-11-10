import React, { useState, useEffect } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { Project, Course, User, TimeLog } from '../types';

interface LogTimeModalProps {
  onClose: () => void;
  onSave: (log: Omit<TimeLog, 'id' | 'userId'>) => void;
  projects: Project[];
  courses: Course[];
  user: User;
  initialEntity?: { type: 'project' | 'course', id: number | string };
  initialValues?: {
      duration: string;
      description: string;
      date: string;
  }
}

const LogTimeModal: React.FC<LogTimeModalProps> = ({ onClose, onSave, projects, courses, user, initialEntity, initialValues }) => {
  const { t } = useLocalization();
  
  const [entityType, setEntityType] = useState<'project' | 'course' | ''>(initialEntity?.type || '');
  // Project.id et Course.id sont maintenant tous les deux des strings (UUID)
  const [projectId, setProjectId] = useState<string | ''>(initialEntity?.type === 'project' ? String(initialEntity.id) : '');
  const [courseId, setCourseId] = useState<string | ''>(initialEntity?.type === 'course' ? String(initialEntity.id) : '');
  const [taskId, setTaskId] = useState<string | ''>('');
  const [duration, setDuration] = useState(initialValues?.duration || '');
  const [date, setDate] = useState(initialValues?.date || new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState(initialValues?.description || '');

  const selectedProject = projects.find(p => String(p.id) === String(projectId));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation améliorée
    if (!duration || Number(duration) <= 0) {
      alert('Veuillez saisir une durée valide');
      return;
    }

    let entityId: number | string;
    let entityTitle: string;
    let finalEntityType: 'project' | 'course' | 'task';
    
    // If opened from a meeting, it won't have an entity type, but will have a description
    if(!entityType && description) {
        finalEntityType = 'project'; // Defaulting meeting logs to generic project time
        entityId = 'meeting';
        entityTitle = description.split('\n')[0]; // Use first line of meeting title
    }
    else if (entityType === 'project' && projectId && selectedProject) {
        if (taskId) {
            finalEntityType = 'task';
            entityId = taskId;
            entityTitle = selectedProject.tasks.find(t => t.id === taskId)?.text || 'Unknown Task';
        } else {
            finalEntityType = 'project';
            entityId = String(selectedProject.id); // Assurer que c'est une string
            entityTitle = selectedProject.title;
        }
    } else if (entityType === 'course' && courseId) {
        const selectedCourse = courses.find(c => String(c.id) === String(courseId));
        if (!selectedCourse) {
          alert('Cours non trouvé');
          return;
        }
        finalEntityType = 'course';
        entityId = String(courseId); // Assurer que c'est une string
        entityTitle = selectedCourse.title;
    } else {
        alert('Veuillez sélectionner un projet ou un cours');
        return; // Should not happen
    }

    console.log('🔄 LogTimeModal - Soumission:', {
      entityType: finalEntityType,
      entityId,
      entityTitle,
      date,
      duration: Number(duration),
      description
    });

    onSave({
      entityType: finalEntityType,
      entityId,
      entityTitle,
      date,
      duration: Number(duration),
      description,
    });
    
    // Le modal sera fermé par handleSaveLog dans TimeTracking.tsx
    // Pas besoin de fermer ici pour éviter le double appel
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[70] p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <form onSubmit={handleSubmit}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">{t('new_log_entry')}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {!initialValues && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t('select_type')}</label>
                                <select
                                    value={entityType}
                                    onChange={e => setEntityType(e.target.value as any)}
                                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                                    disabled={!!initialEntity}
                                >
                                    <option value="" disabled>{t('select_type')}</option>
                                    <option value="project">{t('projects')}</option>
                                    <option value="course">{t('courses')}</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {entityType === 'project' && !initialValues && (
                        <>
                           <div>
                                <label className="block text-sm font-medium text-gray-700">{t('select_project')}</label>
                                <select
                                    value={projectId || ''}
                                    onChange={e => {
                                      setProjectId(e.target.value); 
                                      setTaskId('');
                                    }}
                                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                                    disabled={!!initialEntity}
                                    required={entityType === 'project'}
                                >
                                    <option value="" disabled>{t('select_project')}</option>
                                    {projects.map(p => <option key={p.id} value={String(p.id)}>{p.title}</option>)}
                                </select>
                            </div>
                             {selectedProject && selectedProject.tasks.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">{t('select_task_optional')}</label>
                                    <select
                                        value={taskId}
                                        onChange={e => setTaskId(e.target.value)}
                                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="">-- General Project Time --</option>
                                        {selectedProject.tasks.map(t => <option key={t.id} value={t.id}>{t.text}</option>)}
                                    </select>
                                </div>
                            )}
                        </>
                    )}
                    {entityType === 'course' && !initialValues && (
                         <div>
                            <label className="block text-sm font-medium text-gray-700">{t('select_course')}</label>
                            <select
                                value={courseId || ''}
                                onChange={e => setCourseId(e.target.value || '')}
                                className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                                disabled={!!initialEntity}
                                required={entityType === 'course'}
                            >
                                 <option value="" disabled>{t('select_course')}</option>
                                 {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">{t('date')}</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" required />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700">{t('duration_minutes')}</label>
                             <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" required min="1" />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t('description')}</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md"
                            placeholder='What did you work on?'
                        />
                    </div>
                </div>
                <div className="p-4 bg-gray-50 border-t flex justify-end space-x-2">
                    <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300">{t('cancel')}</button>
                    <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700">{t('save')}</button>
                </div>
            </form>
        </div>
    </div>
  );
};

export default LogTimeModal;

