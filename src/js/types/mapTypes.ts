export interface MapPopulation {
  id: string;
  name: string;
  Y: number;
  M: number;
  O: number;
}

export interface MapFeature {
  type: "Feature";
  properties: MapPopulation;
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

export interface MapData {
  type: "FeatureCollection";
  features: MapFeature[];
}