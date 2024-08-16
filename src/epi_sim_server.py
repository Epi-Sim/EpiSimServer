from flask import Flask, request, jsonify, render_template
import json
import os
import tempfile
import base64
from epi_sim import EpiSim
from dash import Dash, html, dcc, Input, Output, State, callback_context
import dash_bootstrap_components as dbc
import requests
from dash.exceptions import PreventUpdate

import model_param_forms as mpf

template_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'html'))
static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'static'))

app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)

dash_app = Dash(
    __name__,
    server=app,
    url_base_pathname="/",
    external_stylesheets=[dbc.themes.BOOTSTRAP],
    suppress_callback_exceptions=True,
)

dash_app.layout = html.Div([
    dcc.Location(id='url', refresh=False),
    html.Div(id='page-content')
])


@app.route('/setup')
def setup():
    config_path = os.path.join(os.path.dirname(__file__), os.pardir, "models/mitma/config.json")

    with open(config_path, 'r') as f:
        config = json.load(f)

    return render_template('index.html', config_json=json.dumps(config))

@app.route('/engine_options')
def engine_options():
    return jsonify(EpiSim.BACKEND_ENGINES)


@app.route('/')
def home_layout():
    return html.Div([
        html.H1("Welcome to EpiSim Server"),
        html.P("Use the /run_simulation endpoint to run simulations."),
        dcc.Link("Setup", href="/setup"),
    ])

def write_json_to_data_folder(data, filename):
    file_path = os.path.join(os.path.dirname(__file__), os.pardir, "models/mitma", filename)
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=4)
    return file_path

@app.route('/run_simulation', methods=['POST'])
def server_run_simulation():
    try:
        payload = request.json

        # Create temporary files for JSON payload contents
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as config_file, \
             tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as mobility_reduction_file, \
             tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as mobility_matrix_file, \
             tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as metapop_file, \
             tempfile.NamedTemporaryFile(mode='wb', suffix='.nc', delete=False) as init_conditions_file:

            json.dump(payload['config'], config_file)
            json.dump(payload['mobility_reduction'], mobility_reduction_file)
            json.dump(payload['mobility_matrix'], mobility_matrix_file)
            json.dump(payload['metapop'], metapop_file)
            
            config_fp = config_file.name
            mobility_reduction_fp = mobility_reduction_file.name
            mobility_matrix_fp = mobility_matrix_file.name
            metapop_fp = metapop_file.name
            
            decoded_data = base64.b64decode(payload['init_conditions'])
            init_conditions_file.write(decoded_data)
            init_conditions_fp = init_conditions_file.name

        data_folder = os.path.join(os.path.dirname(__file__), os.pardir, "models/mitma")
        instance_folder = os.path.join(os.path.dirname(__file__), os.pardir, "runs")

        app.logger.debug(f"config path: {config_fp}")
        model = (
            EpiSim(config_fp, data_folder, instance_folder, init_conditions_fp)
            .setup('interpreter')
            .set_backend_engine(payload['backend_engine'])
        )

        # Run the model
        app.logger.debug("Running model")
        id, output = model.run_model(2, "2024-03-01", "2024-03-03")
        
        # Clean up the temporary files
        for fp in [config_fp, mobility_reduction_fp, mobility_matrix_fp, metapop_fp, init_conditions_fp]:
            os.unlink(fp)

        app.logger.info("Simulation completed successfully")
        # Read the model output
        output_file = os.path.join(instance_folder, id, "output", "compartments_full.nc")
        assert os.path.exists(output_file), f"Output file {output_file} does not exist"
        with open(output_file, "rb") as f:
            output_data = f.read()

        # Encode the output data
        encoded_output = base64.b64encode(output_data).decode('ascii')
        
        return jsonify({"status": "success", "message": "Simulation completed successfully", "output": encoded_output}), 200

    except Exception as e:
        app.logger.error(f"Error in run_simulation: {str(e)}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500
if __name__ == '__main__':
    app.run(debug=True, port=5000)