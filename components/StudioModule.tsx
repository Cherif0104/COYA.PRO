import React from 'react';
import StructuredModulePage from './common/StructuredModulePage';

const StudioModule: React.FC = () => (
  <StructuredModulePage
    moduleKey="studio"
    titleFr="Studio / Audiovisuel"
    titleEn="Studio / Audiovisual"
    descriptionFr="Production audiovisuelle, réservation studio, équipements, planning des tournages."
    descriptionEn="Audiovisual production, studio booking, equipment, shooting schedule."
    icon="fas fa-video"
    sections={[{ key: 's', titleFr: 'Production', titleEn: 'Production', icon: 'fas fa-film', content: <p className="text-coya-text-muted text-sm">Calendrier et ressources à venir.</p> }]}
  />
);

export default StudioModule;
