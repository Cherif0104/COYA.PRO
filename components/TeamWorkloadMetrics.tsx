import React, { useMemo } from 'react';
import { Project, User } from '../types';

interface TeamWorkloadMetricsProps {
    projects: Project[];
    users: User[];
}

interface RoleWorkload {
    role: string;
    users: User[];
    totalProjects: number;
    activeProjects: number;
    totalTasks: number;
    totalEstimatedHours: number;
    totalLoggedHours: number;
}

const TeamWorkloadMetrics: React.FC<TeamWorkloadMetricsProps> = ({ projects, users }) => {
    
    const roleWorkloads = useMemo(() => {
        const roleMap = new Map<string, RoleWorkload>();

        // Initialiser les rôles
        users.forEach(user => {
            const role = user.role || 'employee';
            if (!roleMap.has(role)) {
                roleMap.set(role, {
                    role,
                    users: [],
                    totalProjects: 0,
                    activeProjects: 0,
                    totalTasks: 0,
                    totalEstimatedHours: 0,
                    totalLoggedHours: 0
                });
            }
            roleMap.get(role)!.users.push(user);
        });

        // Calculer les métriques pour chaque rôle
        roleMap.forEach((roleData, role) => {
            roleData.users.forEach(user => {
                // Compter les projets où l'utilisateur est membre
                const userProjects = projects.filter(project => 
                    project.team.some(member => member.id === user.id)
                );

                roleData.totalProjects += userProjects.length;
                roleData.activeProjects += userProjects.filter(p => p.status === 'In Progress').length;

                // Compter les tâches et heures
                userProjects.forEach(project => {
                    const userTasks = project.tasks?.filter(task => task.assignee?.id === user.id) || [];
                    roleData.totalTasks += userTasks.length;
                    
                    userTasks.forEach(task => {
                        roleData.totalEstimatedHours += task.estimatedHours || 0;
                        roleData.totalLoggedHours += task.loggedHours || 0;
                    });
                });
            });
        });

        return Array.from(roleMap.values()).sort((a, b) => b.totalEstimatedHours - a.totalEstimatedHours);
    }, [projects, users]);

    const getRoleColor = (role: string) => {
        const colors: { [key: string]: string } = {
            'super_administrator': 'bg-red-500',
            'administrator': 'bg-purple-500',
            'manager': 'bg-blue-500',
            'supervisor': 'bg-green-500',
            'trainer': 'bg-yellow-500',
            'mentor': 'bg-indigo-500',
            'entrepreneur': 'bg-pink-500',
            'facilitator': 'bg-orange-500',
            'publisher': 'bg-teal-500',
            'producer': 'bg-cyan-500',
            'funder': 'bg-emerald-500',
            'artist': 'bg-violet-500',
            'editor': 'bg-rose-500',
            'student': 'bg-gray-500',
            'intern': 'bg-gray-400'
        };
        return colors[role] || 'bg-gray-500';
    };

    const getRoleDisplayName = (role: string) => {
        const names: { [key: string]: string } = {
            'super_administrator': 'Super Administrateur',
            'administrator': 'Administrateur',
            'manager': 'Manager',
            'supervisor': 'Superviseur',
            'trainer': 'Formateur',
            'mentor': 'Mentor',
            'entrepreneur': 'Entrepreneur',
            'facilitator': 'Facilitateur',
            'publisher': 'Éditeur',
            'producer': 'Producteur',
            'funder': 'Financeur',
            'artist': 'Artiste',
            'editor': 'Rédacteur',
            'student': 'Étudiant',
            'intern': 'Stagiaire',
            'employee': 'Employé'
        };
        return names[role] || role;
    };

    if (roleWorkloads.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <i className="fas fa-users text-blue-600 mr-2"></i>
                    Charge de travail de l'équipe
                </h3>
                <div className="text-center py-8 text-gray-500">
                    <i className="fas fa-chart-bar text-4xl text-gray-300 mb-4"></i>
                    <p>Aucune donnée de charge de travail disponible</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                    Charge de travail de l'équipe
                </h3>
                <div className="text-sm text-gray-400">
                    {roleWorkloads.length} rôle{roleWorkloads.length > 1 ? 's' : ''} • {users.length} utilisateur{users.length > 1 ? 's' : ''}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roleWorkloads.map((roleData) => (
                    <div key={roleData.role} className="bg-gray-50 rounded-lg border border-gray-100 p-4">
                        {/* Header du rôle */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <div className={`w-8 h-8 ${getRoleColor(roleData.role)} rounded-full flex items-center justify-center text-white text-sm font-medium`}>
                                    {getRoleDisplayName(roleData.role).charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900 text-sm">{getRoleDisplayName(roleData.role)}</h4>
                                    <p className="text-xs text-gray-500">{roleData.users.length} membre{roleData.users.length > 1 ? 's' : ''}</p>
                                </div>
                            </div>
                        </div>

                        {/* Métriques essentielles */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <div className="text-lg font-semibold text-gray-900">{roleData.totalProjects}</div>
                                <div className="text-xs text-gray-500">Projets</div>
                            </div>
                            <div>
                                <div className="text-lg font-semibold text-gray-900">{roleData.totalTasks}</div>
                                <div className="text-xs text-gray-500">Tâches</div>
                            </div>
                            <div>
                                <div className="text-lg font-semibold text-gray-900">{roleData.totalEstimatedHours}h</div>
                                <div className="text-xs text-gray-500">Estimées</div>
                            </div>
                            <div>
                                <div className="text-lg font-semibold text-gray-900">{roleData.totalLoggedHours}h</div>
                                <div className="text-xs text-gray-500">Loggées</div>
                            </div>
                        </div>

                        {/* Barre de progression minimaliste */}
                        <div className="mt-3">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Progression</span>
                                <span>{roleData.totalEstimatedHours > 0 ? Math.round((roleData.totalLoggedHours / roleData.totalEstimatedHours) * 100) : 0}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1">
                                <div 
                                    className="bg-gray-600 h-1 rounded-full"
                                    style={{ 
                                        width: `${roleData.totalEstimatedHours > 0 ? Math.min((roleData.totalLoggedHours / roleData.totalEstimatedHours) * 100, 100) : 0}%` 
                                    }}
                                ></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Résumé global minimaliste */}
            <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">
                            {roleWorkloads.reduce((sum, role) => sum + role.totalProjects, 0)}
                        </div>
                        <div className="text-xs text-gray-500">Projets</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">
                            {roleWorkloads.reduce((sum, role) => sum + role.totalTasks, 0)}
                        </div>
                        <div className="text-xs text-gray-500">Tâches</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">
                            {roleWorkloads.reduce((sum, role) => sum + role.totalEstimatedHours, 0)}h
                        </div>
                        <div className="text-xs text-gray-500">Estimées</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">
                            {roleWorkloads.reduce((sum, role) => sum + role.totalLoggedHours, 0)}h
                        </div>
                        <div className="text-xs text-gray-500">Loggées</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamWorkloadMetrics;

