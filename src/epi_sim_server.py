from flask import Flask, request, jsonify
import json
import os
import tempfile
import base64
from MMCACovid19Py import MMCACovid19, pardir

app = Flask(__name__)

def write_json_to_file(data, filename):
    file_path = os.path.join(pardir(), "models/mitma", filename)
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=4)

@app.route('/run_simulation', methods=['POST'])
def run_simulation():
    try:
        payload = request.json

        # Write JSON payload contents to files
        write_json_to_file(json.loads(payload['config']), 'config.json')
        write_json_to_file(json.loads(payload['mobility_reduction']), 'mobility_reduction.json')
        write_json_to_file(json.loads(payload['mobility_matrix']), 'mobility_matrix.json')
        write_json_to_file(json.loads(payload['metapop']), 'metapop.json')

        # Create a temporary file for the initial conditions
        with tempfile.NamedTemporaryFile(suffix='.nc', delete=False) as temp_file:
            temp_file_path = temp_file.name
            decoded_data = base64.b64decode(payload['init_conditions'])
            temp_file.write(decoded_data)

        # Initialize the MMCACovid19 model
        executable_path = os.path.join(pardir(), "episim")
        model = MMCACovid19(executable_path)

        # Prepare arguments for run_model
        config = os.path.join(pardir(), "models/mitma/config.json")
        data_folder = os.path.join(pardir(), "models/mitma")
        instance_folder = os.path.join(pardir(), "runs")
        init_conditions = temp_file_path

        # Run the model
        app.logger.debug("Running model")
        output = model.run_model(config, data_folder, instance_folder, init_conditions)
        
        # Clean up the temporary file
        os.unlink(temp_file_path)

        app.logger.info("Simulation completed successfully")
        
        return jsonify({"status": "success", "message": "Simulation completed successfully", "output": output}), 200

    except Exception as e:
        app.logger.error(f"Error in run_simulation: {str(e)}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)