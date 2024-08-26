import os
import pandas as pd
import xarray as xr
from io import BytesIO
import gzip

DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'epi_sim_db.db')
SIM_OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'sim_output')

def create_database():
    os.makedirs(SIM_OUTPUT_DIR, exist_ok=True)

def store_simulation_result(id, output_data):
    compressed_data = gzip.compress(output_data)
    file_path = os.path.join(SIM_OUTPUT_DIR, f"{id}.gz")
    
    with open(file_path, 'wb') as f:
        f.write(compressed_data)

def get_simulation_result(id):
    file_path = os.path.join(SIM_OUTPUT_DIR, f"{id}.gz")
    
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
