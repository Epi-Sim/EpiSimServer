export interface ResultTimeSeries {
    time: number[];
    susceptible: number[];
    infected: number[];
    recovered: number[];
    vaccinated: number[];
}

export interface SimulationResult {
    status: string;
    message: string;
    // binary encoded output file
    output: string;
    uuid: string;
    // TODO: add other fields
    // timeSeries: ResultTimeSeries;
}
