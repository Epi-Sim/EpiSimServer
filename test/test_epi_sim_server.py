import unittest
import requests
import json
import base64
import pandas as pd
from datetime import datetime

class TestEpiSimServer(unittest.TestCase):
    
    def read_mobility_reduction(self, fn):
        df = pd.read_csv(fn, parse_dates=['date', 'datetime'])
        df['time'] = df['time'].astype('int16')
        return df

    def test_run_simulation(self):
        with open("models/mitma/config.json", "r") as f:
            config = f.read()
        
        with open("models/mitma/initial_conditions.nc", "rb") as f:
            compressed_data = base64.b64encode(f.read()).decode('ascii')
        
        mobility_matrix = pd.read_csv("models/mitma/R_mobility_matrix.csv")
        metapop = pd.read_csv("models/mitma/metapopulation_data.csv")
        mobility_reduction = self.read_mobility_reduction("models/mitma/kappa0_from_mitma.csv")
        
        payload = {
            "engine": "MMCACovid19Vac",
            "config": config,
            "init_conditions": compressed_data,
            "mobility_matrix": mobility_matrix.to_json(),
            "mobility_reduction": mobility_reduction.to_json(),
            "metapop": metapop.to_json(),
            "start_date": "2023-04-01",
            "end_date": "2023-03-20"
        }
        
        response = requests.post(
            "http://localhost:5000/run_simulation",
            headers={"Content-Type": "application/json"},
            data=json.dumps(payload)
        )
        
        self.assertEqual(response.status_code, 200)
        
if __name__ == '__main__':
    unittest.main()