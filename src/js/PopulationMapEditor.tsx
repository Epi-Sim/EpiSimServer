import React, { useState, useEffect } from 'react';
import L, { LatLngTuple } from 'leaflet';
import { MapContainer, TileLayer, Popup } from 'react-leaflet';
import { useLeafletContext } from '@react-leaflet/core';
import 'leaflet/dist/leaflet.css';
import { TextField, Button, Typography, Slider } from '@mui/material';
import { MapFeature, MapPopulation, MapData } from './types/mapTypes';

const calculateCentroid = (coordinates): LatLngTuple => {
    const [x, y] = coordinates[0].reduce((acc, [lng, lat]) => [acc[0] + lng, acc[1] + lat], [0, 0]);
    const len = coordinates[0].length;
    return [y / len, x / len]; // Return [lat, lng]
};

const PopulationBreakdown = ({ population, onPopulationChange }) => {
    const totalPopulation = population.Y + population.M + population.O;

    const handleSliderChange = (group) => (event, newValue) => {
        const newPopulation = { ...population };
        newPopulation[group] = Math.round(totalPopulation * newValue / 100);
        onPopulationChange(newPopulation);
    };

    return (
        <div style={{ width: '100%' }}>
            {['Y', 'M', 'O'].map((group) => (
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

const GeoJSONLayer = ({ data, onFeatureClick }) => {
  const context = useLeafletContext();

  useEffect(() => {
    const container = context.layerContainer as L.LayerGroup || (context.map as L.Map);
    const geoJsonLayer = L.geoJSON(data, {
      onEachFeature: (feature, layer) => {
        layer.on({
          click: () => onFeatureClick(feature)
        });
      }
    }).addTo(container);

    return () => {
      container.removeLayer(geoJsonLayer);
    };
  }, [context, data, onFeatureClick]);

  return null;
};

interface PopulationMapEditorProps {
  mapData: MapData;
  onMapDataChange: (data: MapData) => void;
}

const PopulationMapEditor: React.FC<PopulationMapEditorProps> = ({ mapData, onMapDataChange }) => {
  const [selectedFeature, setSelectedFeature] = useState<MapFeature | null>(null);
  const [population, setPopulation] = useState<MapPopulation | null>(null);
  const [totalPopulation, setTotalPopulation] = useState<number | null>(null);

  console.log("rerendering");

  const handleFeatureClick = (feature: MapFeature) => {
    const id = feature.properties.id;
    const selectedFeature = mapData.features.find(f => f.properties.id === id);
    console.log("feature");
    console.log(feature);
    console.log("selected feature");
    console.log(selectedFeature);
    console.log("map data");
    console.log(mapData);
    if (selectedFeature) {
      setSelectedFeature(selectedFeature);
      setPopulation(selectedFeature.properties);
      setTotalPopulation(selectedFeature.properties.Y + selectedFeature.properties.M + selectedFeature.properties.O);
    }
  };

  const handleTotalPopulationChange = (event) => {
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

  const handlePopulationChange = (newPopulation) => {
    setPopulation(newPopulation);
  };

  const handleSave = () => {
    if (selectedFeature && population) {
      const updatedFeature = {
        ...selectedFeature,
        properties: {
          ...selectedFeature.properties,
          ...population
        },
      };
      const updatedMapData = {
        ...mapData,
        features: mapData.features.map((feature) => {
          if (feature.properties.id === updatedFeature.properties.id) {
            return updatedFeature;
          }
          return feature;
        })
      };
      onMapDataChange(updatedMapData);
      
      // Update the selected feature with the new data
      setSelectedFeature(null);
      setPopulation(null);
      setTotalPopulation(null);
    }
  };

  const centroid = selectedFeature ? calculateCentroid(selectedFeature.geometry.coordinates) : null;

  return (
    <MapContainer center={[40, -100]} zoom={4} style={{ height: '100vh', width: '100vw' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; <a href=&quot;http://osm.org/copyright&quot;>OpenStreetMap</a> contributors"
      />
      <GeoJSONLayer data={mapData} onFeatureClick={handleFeatureClick} />
      {selectedFeature && centroid && (
        <Popup position={centroid} offset={[0, -20]}>
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