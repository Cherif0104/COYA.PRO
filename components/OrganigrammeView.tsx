import React, { useState, useEffect } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import DataAdapter from '../services/dataAdapter';
import OrganizationService from '../services/organizationService';
import DepartmentService from '../services/departmentService';
import { Employee } from '../types';

interface OrgNode {
  employee: Employee;
  name: string;
  departmentNames: string[];
  posteName?: string;
  level: number;
  children: OrgNode[];
}

/** Vue organigramme : hiérarchie basée sur employees.manager_id et user_departments */
const OrganigrammeView: React.FC = () => {
  const { language } = useLocalization();
  const fr = language === 'fr';
  const [nodes, setNodes] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const orgId = await OrganizationService.getCurrentUserOrganizationId();
        if (!orgId || cancelled) return;
        const [employees, departments] = await Promise.all([
          DataAdapter.listEmployees(orgId),
          DepartmentService.getDepartmentsByOrganizationId(orgId),
        ]);
        if (cancelled) return;
        const deptMap = new Map(departments.map((d) => [d.id, d.name]));
        const profileIds = [...new Set(employees.flatMap((e) => [e.profileId, e.managerId].filter(Boolean)))] as string[];
        const profileMap = new Map<string, { full_name?: string; user_id?: string }>();
        const { supabase } = await import('../services/supabaseService');
        if (profileIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, full_name, user_id').in('id', profileIds);
          (profiles || []).forEach((p: any) => profileMap.set(p.id, { full_name: p.full_name, user_id: p.user_id }));
        }
        const userDeptMap = new Map<string, string[]>();
        for (const [profileId, p] of profileMap.entries()) {
          if (p.user_id) {
            const links = await DepartmentService.getUserDepartmentLinks(p.user_id);
            userDeptMap.set(profileId, links.map((l) => deptMap.get(l.departmentId) || l.departmentId).filter(Boolean));
          }
        }
        const buildTree = (managerId: string | null | undefined): OrgNode[] => {
          return employees
            .filter((e) => (managerId == null ? !e.managerId : e.managerId === managerId))
            .map((e) => {
              const profile = profileMap.get(e.profileId);
              const deptNames = userDeptMap.get(e.profileId) || [];
              return {
                employee: e,
                name: profile?.full_name || e.profileId?.slice(0, 8) || '—',
                departmentNames: deptNames,
                posteName: e.position ?? undefined,
                level: managerId == null ? 0 : 1,
                children: buildTree(e.profileId),
              };
            });
        };
        const roots = buildTree(null);
        if (roots.length === 0 && employees.length > 0) {
          const fallback: OrgNode[] = employees.map((e) => {
            const profile = profileMap.get(e.profileId);
            const deptNames = userDeptMap.get(e.profileId) || [];
            return {
              employee: e,
              name: profile?.full_name || e.profileId?.slice(0, 8) || '—',
              departmentNames: deptNames,
              posteName: e.position ?? undefined,
              level: 0,
              children: [],
            };
          });
          setNodes(fallback);
        } else {
          setNodes(roots);
        }
      } catch (e) {
        if (!cancelled) {
          console.error('OrganigrammeView load error:', e);
          setNodes([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <span className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-500 border-t-transparent" />
        <span>{fr ? 'Chargement de l\'organigramme...' : 'Loading org chart...'}</span>
      </div>
    );
  }

  const renderNode = (node: OrgNode, depth: number) => (
    <div key={node.employee.id} className={`${depth > 0 ? 'ml-6 mt-2 border-l-2 border-gray-200 pl-4' : ''}`}>
      <div className="flex items-center gap-2 py-2">
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm">
          {node.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="font-medium text-gray-900">{node.name}</div>
          <div className="text-xs text-gray-500">
            {node.posteName && <span>{node.posteName}</span>}
            {node.departmentNames.length > 0 && (
              <span className="ml-2">— {node.departmentNames.join(', ')}</span>
            )}
          </div>
        </div>
      </div>
      {node.children.map((child) => renderNode(child, depth + 1))}
    </div>
  );

  if (nodes.length === 0) {
    return (
      <p className="text-gray-500">
        {fr
          ? 'Aucun salarié avec fiche employé. Complétez les fiches salarié (onglet Fiche salarié) pour afficher l\'organigramme.'
          : 'No employees with profile. Complete employee profiles to display the org chart.'}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {nodes.map((node) => renderNode(node, 0))}
    </div>
  );
};

export default OrganigrammeView;
