import os
import pandas as pd
import xarray as xr
from io import BytesIO
import gzip
import sqlite3
import tarfile
import json
import hashlib

DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'epi_sim_db.db')
SIM_OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'sim_output')

def create_database():
    os.makedirs(SIM_OUTPUT_DIR, exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    with open('src/db/init_db.sql', 'r') as sql_file:
        sql_script = sql_file.read()
        cursor.executescript(sql_script)
    
    conn.commit()
    conn.close()

def store_simulation_result(id, output_data, params_hash):
    file_path = os.path.join(SIM_OUTPUT_DIR, f"{id}.nc.gz")
    
    with open(file_path, 'wb') as f:
        f.write(gzip.compress(output_data))
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute('INSERT INTO simulation_results (id, file_path, params_hash) VALUES (?, ?, ?)',
                   (id, file_path, params_hash))
    conn.commit()
    conn.close()

def store_simulation_params(params_files, params_hash):
    # Create an in-memory tar file
    tar_buffer = BytesIO()
    with tarfile.open(fileobj=tar_buffer, mode='w:gz') as tar:
        for filename, file_obj in params_files.items():
            tarinfo = tarfile.TarInfo(name=filename)
            file_obj.seek(0, os.SEEK_END)
            tarinfo.size = file_obj.tell()
            file_obj.seek(0)
            tar.addfile(tarinfo, file_obj)
    
    # Get the tar data from the in-memory buffer
    params_data = tar_buffer.getvalue()

    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute('INSERT INTO simulation_params (id, params) VALUES (?, ?)',
                   (params_hash, params_data))
    conn.commit()
    conn.close()

def get_simulation_result(id):
    file_path = os.path.join(SIM_OUTPUT_DIR, f"{id}.nc.gz")
    
    if os.path.exists(file_path):
        with open(file_path, 'rb') as f:
            compressed_data = f.read()
        return gzip.decompress(compressed_data)
    
    return None

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

def get_existing_simulation_id(params_hash):
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute('SELECT id FROM simulation_results WHERE params_hash = ?', (params_hash,))
    result = cursor.fetchone()
    
    conn.close()

    if result:
        return result[0]
    return None
