import { MapboxUnified } from './MapboxUnified';

type MapboxQueimadasProps = {
  geojson: GeoJSON.FeatureCollection | null;
  onFeatureClick?: (feature: any) => void;
  mode?: 'live' | 'archive';
  zoneConfig?: {
    critica: number;
    acomp: number;
    obs: number;
  };
};

export const MapboxQueimadas = ({
  geojson,
  onFeatureClick,
  mode = 'live',
  zoneConfig = { critica: 500, acomp: 1500, obs: 3000 }
}: MapboxQueimadasProps) => {
  return (
    <MapboxUnified
      showInfrastructure={true}
      showQueimadas={true}
      mode={mode}
      zoneConfig={zoneConfig}
      queimadasData={geojson || undefined}
      onFeatureClick={onFeatureClick}
    />
  );
};
