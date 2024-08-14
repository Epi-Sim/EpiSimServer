from flask import Flask, request, jsonify
import json
import os
import tempfile
import base64
from epi_sim import EpiSim

app = Flask(__name__)

def write_json_to_data_folder(data, filename):
    file_path = os.path.join(os.path.dirname(__file__), os.pardir, "models/mitma", filename)
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=4)
    return file_path

@app.route('/run_simulation', methods=['POST'])
def server_run_simulation():
    try:
        payload = request.json

        # Write JSON payload contents to files
        config_fp = write_json_to_data_folder(json.loads(payload['config']), 'config.json')
        mobility_reduction_fp = write_json_to_data_folder(json.loads(payload['mobility_reduction']), 'mobility_reduction.json')
        mobility_matrix_fp = write_json_to_data_folder(json.loads(payload['mobility_matrix']), 'mobility_matrix.json')
        metapop_fp = write_json_to_data_folder(json.loads(payload['metapop']), 'metapop.json')

        data_folder = os.path.join(os.path.dirname(__file__), os.pardir, "models/mitma")
        instance_folder = os.path.join(os.path.dirname(__file__), os.pardir, "runs")

        # Create a temporary file for the initial conditions
        with tempfile.NamedTemporaryFile(suffix='.nc', delete=False) as temp_file:
            temp_file_path = temp_file.name
            decoded_data = base64.b64decode(payload['init_conditions'])
            temp_file.write(decoded_data)

        # Initialize the MMCACovid19 model
        executable_path = os.path.join(os.path.dirname(__file__), os.pardir, "episim")
        app.logger.debug(f"config path: {config_fp}")
        model = EpiSim(config_fp, data_folder, instance_folder, temp_file_path).setup('interpreter')

        # Run the model
        app.logger.debug("Running model")
        output = model.run_model(2, "2024-03-01", "2024-03-03")
        
        # Clean up the temporary file
        os.unlink(temp_file_path)

        app.logger.info("Simulation completed successfully")
        
        return jsonify({"status": "success", "message": "Simulation completed successfully", "output": output}), 200

    except Exception as e:
        app.logger.error(f"Error in run_simulation: {str(e)}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)