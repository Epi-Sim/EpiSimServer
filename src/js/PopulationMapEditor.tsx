import React, { useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { MapData, MapFeature } from './types/mapTypes';
import PopulationBreakdown from './PopulationBreakdown';
import 'leaflet/dist/leaflet.css';

interface PopulationMapEditorProps {
  mapData: MapData;
  onMapDataChange: (data: MapData) => void;
  onFeatureClick: (feature: MapFeature) => void;
}

const PopulationMapEditor: React.FC<PopulationMapEditorProps> = ({
  mapData,
  onMapDataChange,
  onFeatureClick,
}) => {
  const [selectedFeature, setSelectedFeature] = useState<MapFeature | null>(null);

  const handleFeatureClick = (feature: MapFeature) => {
    setSelectedFeature(feature);
    onFeatureClick(feature);
  };

  const onEachFeature = (feature: MapFeature, layer: L.Layer) => {
    layer.on({
      click: () => handleFeatureClick(feature),
    });
  };

  const handlePopulationChange = (population) => {
    if (selectedFeature) {
      selectedFeature.properties = population;
      onMapDataChange(mapData);
    }
  };

  return (
    <div style={{ display: 'flex', height: '600px' }}>
      <MapContainer
        center={[40, -100]}
        zoom={4}
        style={{ height: '100%', width: '70%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        />
        <GeoJSON data={mapData} onEachFeature={onEachFeature} />
      </MapContainer>
      <div style={{ width: '30%', padding: '16px', overflowY: 'auto' }}>
        {selectedFeature && (
          <PopulationBreakdown population={selectedFeature.properties} onPopulationChange={handlePopulationChange} />
        )}
      </div>
    </div>
  );
};

export default PopulationMapEditor;