import sqlite3
import os
import pandas as pd
import xarray as xr
from io import BytesIO
import gzip

# Add this line to export the database path
DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'epi_sim_db.db')

def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def create_database():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    with open(os.path.join(os.path.dirname(__file__), 'init_db.sql'), 'r') as sql_file:
        sql_script = sql_file.read()
    
    cursor.executescript(sql_script)
    
    conn.commit()
    conn.close()

def store_simulation_result(id, output_data):
    #TODO: move back to a file system approach but use sqlite for index and access?
    compressed_data = gzip.compress(output_data)
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO simulation_results (id, output)
        VALUES (?, ?)
        ON CONFLICT(id) DO UPDATE SET
            output = excluded.output,
            updated_at = CURRENT_TIMESTAMP
    """, (id, compressed_data))
    
    conn.commit()
    conn.close()

def get_simulation_result(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT output FROM simulation_results WHERE id = ?", (id,))
    result = cursor.fetchone()

    if result:
        output_data = gzip.decompress(result['output'])
    else:
        output_data = None
    
    conn.close()
    
    return output_data

def read_simulation(simulation_id):
    output_data = get_simulation_result(simulation_id)
    
    if output_data is None:
        return None
    
    try:
        ds = xr.open_dataset(BytesIO(output_data), engine='h5netcdf')
        ds['T'] = pd.to_datetime(ds['T'].values)
        return ds
    except Exception as e:
        raise Exception(f"Error reading simulation data: {str(e)}")
