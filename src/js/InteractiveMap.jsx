import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { TextField, Button, Typography } from '@mui/material';

const InteractiveMap = ({ mapData, onMapDataChange }) => {
  const [selectedPolygon, setSelectedPolygon] = useState(null);
  const [populationValues, setPopulationValues] = useState({});
  const fileInputRef = useRef(null);
  const [mapCenter, setMapCenter] = useState([47.9, -71.4]);
  const [mapZoom, setMapZoom] = useState(7);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const geoJSON = JSON.parse(e.target.result);
          setMapData(geoJSON);
          
          // Calculate center and zoom based on GeoJSON
          const bounds = geoJSON.features.map(feature => 
            feature.geometry.coordinates[0].map(coord => [coord[1], coord[0]])
          ).flat();
          // Assert bounds are not null or empty
          if (!bounds || bounds.length === 0) {
            throw new Error("Bounds cannot be null or empty");
          }
          
          // Calculate center only if bounds are valid
          const latitudes = bounds.map(b => b[0]);
          const longitudes = bounds.map(b => b[1]);
          if (latitudes.length > 0 && longitudes.length > 0) {
            const center = [
              (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
              (Math.min(...longitudes) + Math.max(...longitudes)) / 2
            ];
            setMapCenter(center);
          } else {
            throw new Error("Invalid latitude or longitude values");
          }
        } catch (error) {
          console.error('Error parsing GeoJSON:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const handlePolygonClick = (feature) => {
    console.log("polygon click");
    console.log(feature);
    setSelectedPolygon(feature);
  };

  const handlePopulationChange = (event) => {
    const { name, value } = event.target;
    if (!selectedPolygon) return; // Ensure selectedPolygon is defined
    const id = String(selectedPolygon.properties.id);
    console.log("pop change");
    console.log(name, value);
    setPopulationValues(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [name]: parseInt(value, 10) || 0
      }
    }));
  };

  const handleSavePopulation = () => {
    const updatedMapData = {
      ...mapData,
      features: mapData.features.map(feature => {
        if (populationValues[feature.properties.id]) {
          return {
            ...feature,
            properties: {
              ...feature.properties,
              ...populationValues[feature.properties.id]
            }
          };
        }
        return feature;
      })
    };
    console.log("updatedMapData");
    console.log(updatedMapData);

    setSelectedPolygon(null);
    onMapDataChange(updatedMapData);
  };

  // useEffect(() => {
  //   if (mapData && populationValues) {
  //     onMapDataChange({ mapData, populationValues });
  //   }
  // }, [mapData, populationValues, onMapDataChange]);

  return (
    <div>
      <input
        type="file"
        accept=".geojson,.json"
        onChange={handleFileUpload}
        ref={fileInputRef}
        style={{ display: 'none' }}
      />
      <Button variant="contained" onClick={() => fileInputRef.current.click()}>
        Upload Map
      </Button>

      {mapData && (
        <MapContainer 
          center={mapCenter} 
          zoom={mapZoom} 
          style={{ height: '400px', width: '100%' }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <GeoJSON
            data={mapData}
            onEachFeature={(feature, layer) => {
              layer.on({
                click: () => handlePolygonClick(feature)
              });
            }}
          />
          {selectedPolygon && (
            <Popup position={mapCenter}>
              <Typography variant="h6">{selectedPolygon.properties.name || 'Unnamed Polygon'}</Typography>
              <TextField
                label="Young Population"
                name="Y"
                type="number"
                value={populationValues[selectedPolygon.properties.id]?.Y || ''}
                onChange={handlePopulationChange}
              />
              <TextField
                label="Middle-aged Population"
                name="M"
                type="number"
                value={populationValues[selectedPolygon.properties.id]?.M || ''}
                onChange={handlePopulationChange}
              />
              <TextField
                label="Old Population"
                name="O"
                type="number"
                value={populationValues[selectedPolygon.properties.id]?.O || ''}
                onChange={handlePopulationChange}
              />
              <Button onClick={handleSavePopulation}>Save</Button>
            </Popup>
          )}
        </MapContainer>
      )}

      
    </div>
  );
};

export default InteractiveMap;