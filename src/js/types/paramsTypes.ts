// Define types for the configuration data
export interface ConfigSectionType<T> {
    // No 'config' key, just the properties of T
}

export type BackendEngine = "MMCACovid19Vac" | "MMCACovid19";

export interface EngineOption {
    name: BackendEngine;
    description: string;
}

export interface SimulationConfig {
    start_date: string;
    end_date: string;
    save_full_output: boolean;
    save_time_step: number | null;
    output_folder: string;
    output_format: string;
}

export interface DataConfig {
    initial_condition_filename: string;
    metapopulation_data_filename: string;
    mobility_matrix_filename: string;
    kappa0_filename: string;
}

export interface EpidemicParams {
    scale_β: number;
    βᶜ: number;
    βᵕ: number;
    η: number[];
    α: number[];
    μ: number[];
    θ: number[];
    γ: number[];
    ζ: number[];
    λ: number[];
    ω: number[];
    ψ: number[];
    χ: number[];
    Λ: number;
    Γ: number;
    rᵢ: number[];
    kᵢ: number[];
    risk_reduction_dd: number;
    risk_reduction_h: number;
    risk_reduction_d: number;
}

export interface PopulationParams {
    G_labels: string[];
    C: number[][];
    k: number[];
    k_h: number[];
    k_w: number[];
    p: number[];
    ξ: number;
    σ: number;
}

export interface VaccinationConfig {
    ε: number[];
    percentage_of_vacc_per_day: number;
    start_vacc: number;
    dur_vacc: number;
    are_there_vaccines: boolean;
}

export interface NPIConfig {
    // invalid character
    "κ₀s": number[];
    φs: number[];
    δs: number[];
    tₜs: number[];
    are_there_npi: boolean;
}

// Main configuration type
export interface Config {
    simulation: SimulationConfig & ConfigSectionType<SimulationConfig>;
    data: DataConfig & ConfigSectionType<DataConfig>;
    epidemic_params: EpidemicParams & ConfigSectionType<EpidemicParams>;
    population_params: PopulationParams & ConfigSectionType<PopulationParams>;
    vaccination: VaccinationConfig & ConfigSectionType<VaccinationConfig>;
    NPI: NPIConfig & ConfigSectionType<NPIConfig>;
    backend_engine: BackendEngine;
}