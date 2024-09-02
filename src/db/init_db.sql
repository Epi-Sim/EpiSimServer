CREATE TABLE IF NOT EXISTS simulation_params (
    id TEXT PRIMARY KEY,
    params BLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS simulation_results (
    id TEXT PRIMARY KEY,
    file_path TEXT NOT NULL,
    params_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (params_hash) REFERENCES simulation_params(id)
);

CREATE TRIGGER IF NOT EXISTS update_simulation_results_timestamp
AFTER UPDATE ON simulation_results
BEGIN
    UPDATE simulation_results SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;