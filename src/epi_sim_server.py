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

        app.logger.debug(f"config path: {config_fp}")
        model = (
            EpiSim(config_fp, data_folder, instance_folder, temp_file_path)
            .setup('interpreter')
            .set_backend_engine(payload['backend_engine'])
        )

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
    app.run(debug=True, port=5000)