import React, { useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { AgeCompartments, MapData, MapFeature, MapPopulation } from './types/mapTypes';
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

  const handlePopulationChange = (population: AgeCompartments) => {
    if (selectedFeature) {
      selectedFeature.properties = { ...selectedFeature.properties, ...population };
      onMapDataChange(mapData);
    }
  };

  const handleOverallPopulationChange = (population: AgeCompartments) => {
    const newTotal = population.Y + population.M + population.O;
    const featureCount = mapData.features.length;

    const newMapData = mapData.features.map(feature => {
      const newProperties: MapPopulation = {
        ...feature.properties,
        Y: Math.round((population.Y / featureCount)),
        M: Math.round((population.M / featureCount)),
        O: Math.round((population.O / featureCount)),
      };
      return { ...feature, properties: newProperties };
    });

    // Adjust for rounding errors
    const actualTotal = newMapData.reduce((acc, feature) => 
      acc + feature.properties.Y + feature.properties.M + feature.properties.O, 0
    );
    if (actualTotal !== newTotal) {
      const diff = newTotal - actualTotal;
      newMapData[0].properties.O += diff; // Add any difference to the first feature's O compartment
    }

    onMapDataChange({ ...mapData, features: newMapData });
  };

  const totalMapPopulation = mapData.features.reduce((acc, feature) => {
    return {
      Y: acc.Y + feature.properties.Y,
      M: acc.M + feature.properties.M,
      O: acc.O + feature.properties.O,
    };
  }, { Y: 0, M: 0, O: 0 });

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
        <PopulationBreakdown population={totalMapPopulation} onPopulationChange={handleOverallPopulationChange} />
        {selectedFeature && (
          <PopulationBreakdown 
            name={selectedFeature.properties.name} 
            population={selectedFeature.properties} 
            onPopulationChange={handlePopulationChange} 
          />
        )}
      </div>
    </div>
  );
};

export default PopulationMapEditor;