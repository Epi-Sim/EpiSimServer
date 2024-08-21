import React, { useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { TextField, Button, Typography, Slider } from '@mui/material';
import { MapPopulation, MapFeature, MapData } from '../js/types/mapTypes';

interface PopulationBreakdownProps {
  population: MapPopulation;
  onPopulationChange: (newPopulation: MapPopulation) => void;
}

const PopulationBreakdown: React.FC<PopulationBreakdownProps> = ({ population, onPopulationChange }) => {
    const totalPopulation = population.Y + population.M + population.O;

    const handleSliderChange = (group: 'Y' | 'M' | 'O') => (event: Event, newValue: number | number[]) => {
        const newPopulation = { ...population };
        newPopulation[group] = Math.round(totalPopulation * (newValue as number) / 100);
        onPopulationChange(newPopulation);
    };

    return (
        <div style={{ width: '100%' }}>
            {(['Y', 'M', 'O'] as const).map((group) => (
                <Slider
                    key={group}
                    value={(population[group] / totalPopulation) * 100}
                    onChange={handleSliderChange(group)}
                    aria-labelledby={`${group}-slider`}
                    valueLabelDisplay="auto"
                    style={{ color: group === 'Y' ? 'lightblue' : group === 'M' ? 'lightgreen' : 'lightcoral' }}
                />
            ))}
        </div>
    );
};

interface PopulationMapEditorProps {
  mapData: MapData;
  onMapDataChange: (newMapData: MapData) => void;
}

const PopulationMapEditor: React.FC<PopulationMapEditorProps> = ({ mapData, onMapDataChange }) => {
  const [selectedFeature, setSelectedFeature] = useState<MapFeature | null>(null);
  const [population, setPopulation] = useState<MapPopulation | null>(null);
  const [totalPopulation, setTotalPopulation] = useState(0);

  const handleFeatureClick = (feature: MapFeature) => {
    console.log("feature", feature);
    setSelectedFeature(feature);
    setPopulation(feature.properties);
    setTotalPopulation(feature.properties.Y + feature.properties.M + feature.properties.O);
  };

  const handleTotalPopulationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTotal = parseInt(event.target.value) || 0;
    setTotalPopulation(newTotal);
    if (population) {
      const factor = newTotal / (population.Y + population.M + population.O);
      setPopulation({
          ...population,
          Y: Math.round(population.Y * factor),
          M: Math.round(population.M * factor),
          O: Math.round(population.O * factor)
      });
    }
  };

  const handlePopulationChange = (newPopulation: MapPopulation) => {
    setPopulation(newPopulation);
  };

  const handleSave = () => {
    if (selectedFeature && population) {
      const updatedFeature: MapFeature = {
        ...selectedFeature,
        properties: {
          ...selectedFeature.properties,
          ...population
        },
      };
      const updatedMapData: MapData = {
        ...mapData,
        features: mapData.features.map((feature) => {
          if (feature.properties.id === updatedFeature.properties.id) {
            return updatedFeature;
          }
          return feature;
        })
      };
      onMapDataChange(updatedMapData);
      setSelectedFeature(null);
    }
  };

  return (
    <MapContainer center={[40, -100]} zoom={4} style={{ height: '100vh', width: '100vw' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
      />
      <GeoJSON 
        data={mapData} 
        onEachFeature={(feature, layer) => {
          layer.on({
            click: () => handleFeatureClick(feature as MapFeature)
          });
        }}
      />
      {selectedFeature && population && (
        <Popup position={[40, -100]} offset={[0, -50]}>
          <Typography variant="h6">Population: {selectedFeature.properties.name}</Typography>
          <TextField
            label="Total Population"
            type="number"
            value={totalPopulation}
            onChange={handleTotalPopulationChange}
            fullWidth
            margin="normal"
          />
          <PopulationBreakdown population={population} onPopulationChange={handlePopulationChange} />
          <Button onClick={handleSave} variant="contained" color="primary" fullWidth>
            Save
          </Button>
        </Popup>
      )}
    </MapContainer>
  );
};

export default PopulationMapEditor;