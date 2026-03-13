import React from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { Objective, ObjectiveEntityType } from '../types';

interface ObjectivesBlockProps {
  objectives: Objective[];
  entityType: ObjectiveEntityType;
  entityId: string | number;
  setView?: (view: string) => void;
  maxItems?: number;
}

/** Filtre les objectifs liés à une entité (project, programme, user, department, course). */
function filterObjectivesForEntity(
  objectives: Objective[],
  entityType: ObjectiveEntityType,
  entityId: string | number
): Objective[] {
  const eid = String(entityId);
  return objectives.filter((obj) => {
    if (obj.entityType && obj.entityId !== undefined) {
      return obj.entityType === entityType && String(obj.entityId) === eid;
    }
    if (entityType === 'project' && obj.projectId) {
      return String(obj.projectId) === eid;
    }
    return false;
  });
}

const ObjectivesBlock: React.FC<ObjectivesBlockProps> = ({
  objectives,
  entityType,
  entityId,
  setView,
  maxItems = 5,
}) => {
  const { t, language } = useLocalization();
  const localize = (en: string, fr: string) => (language === 'fr' ? fr : en);
  const list = filterObjectivesForEntity(objectives, entityType, entityId);
  const displayList = list.slice(0, maxItems);

  return (
    <div className="bg-coya-card rounded-lg p-4 border border-coya-border">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-coya-text flex items-center gap-2">
          <i className="fas fa-bullseye text-coya-primary"></i>
          {localize('Objectives / OKR', 'Objectifs / OKR')}
        </h3>
        {setView && (
          <button
            type="button"
            onClick={() => setView('dashboard')}
            className="text-sm font-medium text-coya-primary hover:text-coya-primary-light"
          >
            {localize('View all', 'Voir tout')}
          </button>
        )}
      </div>
      {displayList.length === 0 ? (
        <p className="text-sm text-coya-text-muted">{localize('No objectives linked to this entity yet.', 'Aucun objectif lié à cette entité pour le moment.')}</p>
      ) : (
        <ul className="space-y-2">
          {displayList.map((obj) => (
            <li key={obj.id} className="flex items-start gap-2 text-sm">
              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-coya-primary mt-1.5"></span>
              <div>
                <p className="font-medium text-coya-text">{obj.title}</p>
                {obj.progress != null && (
                  <p className="text-coya-text-muted text-xs">
                    {localize('Progress', 'Progression')}: {obj.progress}%
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ObjectivesBlock;
