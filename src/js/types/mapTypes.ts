export interface MapPopulation extends AgeCompartments {
  id: string;
  name: string;
}

export interface AgeCompartments {
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