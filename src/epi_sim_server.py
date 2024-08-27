from flask import Flask, request, jsonify, render_template, redirect, url_for
import json
import os
import tempfile
from epi_sim import EpiSim
from dash import Dash, html, dcc, Input, Output
import dash_bootstrap_components as dbc
import uuid
import gzip
from db.db import create_database, store_simulation_result, SIM_OUTPUT_DIR

from simulation_results_dashboard import create_results_layout, register_callbacks

template_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'html'))
static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'static'))

app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)
app.config['DATA_FOLDER'] = os.path.join(os.path.dirname(__file__), os.pardir, "models/mitma")
app.config['INSTANCE_FOLDER'] = os.path.join(os.path.dirname(__file__), os.pardir, "runs")
app.config['SIM_OUTPUT_DIR'] = SIM_OUTPUT_DIR

dash_app = Dash(
    __name__,
    server=app,
    url_base_pathname="/dash/",
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

    return render_template('index.html', component='App', bundle='setup.bundle.js', config_json=json.dumps(config))

@app.route('/engine_options')
def engine_options():
    return jsonify(EpiSim.BACKEND_ENGINES)


@app.route('/')
def home():
    return render_template('index.html', component='Home', bundle='home.bundle.js')


@app.route('/check_file_exists', methods=['POST'])
def check_file_exists():
    filename = request.json.get('filename')
    file_id = filename.split('.')[0]  # Assuming filename is in the format "uuid.extension"
    file_path = os.path.join(app.config['SIM_OUTPUT_DIR'], f"{file_id}.nc.gz")
    exists = os.path.exists(file_path)
    return jsonify({"exists": exists, "file_id": file_id})

@app.route('/upload_simulation', methods=['POST'])
def upload_simulation():
    if 'simulation_file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['simulation_file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file:
        if file.filename.endswith('.gz'):
            contents = gzip.decompress(file.read())
        else:
            contents = file.read()

        file_id = request.form.get('file_id', str(uuid.uuid4()))
        store_simulation_result(file_id, contents)
        return jsonify({"status": "success", "file_id": file_id}), 200
    return jsonify({"error": "Unknown error"}), 500


def write_json_to_data_folder(data, filename):
    file_path = os.path.join(os.path.dirname(__file__), os.pardir, "models/mitma", filename)
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=4)
    return file_path

@app.route('/run_simulation', methods=['POST'])
def server_run_simulation():
    try:
        config = json.loads(request.form['config'])
        mobility_reduction = request.files.get('mobility_reduction')
        mobility_matrix = request.files.get('mobility_matrix')
        metapop = request.files.get('metapop')
        init_conditions = request.files.get('init_conditions')
        backend_engine = request.form['backend_engine']

        # Create a temporary directory
        with tempfile.TemporaryDirectory(prefix='EpiSim_') as temp_dir:
            # Write payload contents to files in the temporary directory
            config_fp = os.path.join(temp_dir, 'config.json')
            mobility_reduction_fp = os.path.join(temp_dir, 'kappa0_from_mitma.csv')
            mobility_matrix_fp = os.path.join(temp_dir, 'R_mobility_matrix.csv')
            metapop_fp = os.path.join(temp_dir, 'metapopulation_data.csv')
            init_conditions_fp = os.path.join(temp_dir, 'initial_conditions.nc')

            with open(config_fp, 'w') as f:
                json.dump(config, f)
            mobility_reduction.save(mobility_reduction_fp)
            mobility_matrix.save(mobility_matrix_fp)
            metapop.save(metapop_fp)
            init_conditions.save(init_conditions_fp)

            assert os.path.exists(temp_dir), f"temp_dir {temp_dir} does not exist"

            # the data and instance folder are the same for now
            # because we put the output into sqlite anyway
            model = (
                EpiSim(config_fp, temp_dir, temp_dir, init_conditions_fp)
                .setup('compiled')
                .set_backend_engine(backend_engine)
            )

            assert os.path.exists(model.model_state_folder), f"model.model_state_folder {model.model_state_folder} does not exist"

            # Run the model
            id, output = model.run_model()

            # Read the model output
            output_file = os.path.join(model.model_state_folder, "output", "compartments_full.nc")
            assert os.path.exists(output_file), f"Output file {output_file} does not exist"
            
            with open(output_file, 'rb') as f:
                output_data = f.read()
            
            store_simulation_result(id, output_data)

            return jsonify({"status": "success", "message": "Simulation completed and stored", "uuid": id}), 200

    except Exception as e:
        app.logger.error(f"Error in run_simulation: {str(e)}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@dash_app.callback(Output('page-content', 'children'),
                   Input('url', 'pathname'))
def display_page(pathname):
    if pathname.startswith('/dash/results/'):
        simulation_id = pathname.split('/')[-1]
        return create_results_layout(simulation_id)
    # ... handle other routes ...

# Register the callbacks from simulation_results_dashboard
register_callbacks(dash_app)

if __name__ == '__main__':
    create_database()
    app.run(debug=True, port=5000)