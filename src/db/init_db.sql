CREATE TABLE IF NOT EXISTS simulation_results (
    id TEXT PRIMARY KEY,
    output BLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS update_simulation_results_timestamp
AFTER UPDATE ON simulation_results
BEGIN
    UPDATE simulation_results SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;