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
import plotly.express as px
import pandas as pd
import xarray as xr
import numpy as np

import model_param_forms as mpf

from db.db import DATABASE_PATH, create_database, store_simulation_result, read_simulation

template_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'html'))
static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'static'))

app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)
app.config['DATA_FOLDER'] = os.path.join(os.path.dirname(__file__), os.pardir, "models/mitma")
app.config['INSTANCE_FOLDER'] = os.path.join(os.path.dirname(__file__), os.pardir, "runs")
app.config['DATABASE_PATH'] = DATABASE_PATH

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

    return render_template('index.html', config_json=json.dumps(config))

@app.route('/engine_options')
def engine_options():
    return jsonify(EpiSim.BACKEND_ENGINES)


@app.route('/')
def home():
    return render_template('home.html')


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

            app.logger.debug(f"payload: {payload}")
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

        data_folder = app.config['DATA_FOLDER']
        instance_folder = app.config['INSTANCE_FOLDER']

        app.logger.debug(f"config path: {config_fp}")
        model = (
            EpiSim(config_fp, data_folder, instance_folder, init_conditions_fp)
            .setup('interpreter')
            .set_backend_engine(payload['backend_engine'])
        )

        # Run the model
        app.logger.debug("Running model")
        id, output = model.run_model()
        
        # Clean up the temporary files
        for fp in [config_fp, mobility_reduction_fp, mobility_matrix_fp, metapop_fp, init_conditions_fp]:
            os.unlink(fp)

        app.logger.info("Simulation completed successfully")
        # Read the model output
        output_file = os.path.join(instance_folder, id, "output", "compartments_full.nc")
        assert os.path.exists(output_file), f"Output file {output_file} does not exist"
        
        # Store the output in SQLite
        with open(output_file, 'rb') as f:
            output_data = f.read()
        
        store_simulation_result(id, output_data)

        return jsonify({"status": "success", "message": "Simulation completed and stored", "uuid": id}), 200

    except Exception as e:
        app.logger.error(f"Error in run_simulation: {str(e)}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500

def create_results_layout(simulation_id):
    return html.Div([
        html.H1(f"Results for Simulation {simulation_id}"),
        dcc.Graph(id='results-graph'),
        dcc.Dropdown(id='compartment-selector', multi=True, value=['I', 'R']),
        dcc.Dropdown(id='region-selector', multi=True),
        dcc.RangeSlider(id='time-range-slider', min=0, max=100, step=1, value=[], marks=None),
        dcc.Dropdown(id='age-selector', multi=True),
        dcc.Dropdown(id='vaccination-selector', multi=True, value=['NV', 'V']),
    ])

@dash_app.callback(Output('page-content', 'children'),
                   Input('url', 'pathname'))
def display_page(pathname):
    if pathname.startswith('/dash/results/'):
        simulation_id = pathname.split('/')[-1]
        return create_results_layout(simulation_id)
    # ... handle other routes ...

@dash_app.callback(
    [Output('compartment-selector', 'options'),
     Output('region-selector', 'options'),
     Output('time-range-slider', 'min'),
     Output('time-range-slider', 'max'),
     Output('time-range-slider', 'marks'),
     Output('time-range-slider', 'value'),
     Output('age-selector', 'options'),
     Output('vaccination-selector', 'options')],
    Input('url', 'pathname')
)
def update_dropdowns(pathname):
    if pathname.startswith('/dash/results/'):
        simulation_id = pathname.split('/')[-1]
        ds = read_simulation(simulation_id)
        
        if ds is None:
            app.logger.error(f"using default graph values for simulation {simulation_id} not found")
            return [], [], 0, 100, {}, [0, 100], [], []
        
        compartments = [{'label': c, 'value': c} for c in ds.epi_states.values]
        regions = [{'label': r, 'value': r} for r in ds.M.values]
        
        time_min, time_max = 0, len(ds.T) - 1
        num_marks = 5
        mark_indices = np.linspace(time_min, time_max, num_marks, dtype=int)
        time_marks = {int(i): pd.Timestamp(ds.T.values[i]).strftime('%Y-%m-%d') for i in mark_indices}
        
        ages = [{'label': a, 'value': a} for a in ds.G.values]
        vaccinations = [{'label': v, 'value': v} for v in ds.V.values]
        
        return (
            compartments,
            regions,
            time_min,
            time_max,
            time_marks,
            [time_min, time_max],
            ages,
            vaccinations
        )
    return [], [], 0, 100, {}, [0, 100], [], []

@dash_app.callback(
    Output('results-graph', 'figure'),
    [Input('compartment-selector', 'value'),
     Input('region-selector', 'value'),
     Input('time-range-slider', 'value'),
     Input('age-selector', 'value'),
     Input('vaccination-selector', 'value')],
    State('url', 'pathname')
)
def update_graph(selected_compartments, selected_regions, time_range, selected_ages, selected_vaccinations, pathname):
    simulation_id = pathname.split('/')[-1]
    ds = read_simulation(simulation_id)

    if ds is None:
        app.logger.error(f"using default graph values for simulation {simulation_id} not found")
        return px.line()
    
    # Create a dictionary of filters, excluding None values
    filters = {}
    if selected_compartments:
        filters['epi_states'] = selected_compartments
    if selected_regions:
        filters['M'] = selected_regions
    if selected_ages:
        filters['G'] = selected_ages
    if selected_vaccinations:
        filters['V'] = selected_vaccinations
    
    # Update time filter
    if time_range:
        start_time, end_time = ds.T.values[time_range[0]], ds.T.values[time_range[1]]
        filtered_ds = ds.sel(T=slice(start_time, end_time))
    else:
        filtered_ds = ds

    # Apply other filters
    filtered_ds = filtered_ds.sel(**filters)
    
    # Sum over 'M' and 'G' dimensions, but keep 'V'
    summed_ds = filtered_ds.sum(dim=[dim for dim in ['M', 'G'] if dim in filtered_ds.dims])
    
    # Convert to DataFrame
    df = summed_ds.to_dataframe().reset_index()
    
    # Create the line plot
    app.logger.debug(f"plotting simulation output for simulation {simulation_id}")
    app.logger.debug(f"filters: {filters}")
    fig = px.line(df, x='T', y='data', color='epi_states', line_dash='V',
                  title='Compartment Values Over Time',
                  labels={'T': 'Time', 'data': 'Population', 'epi_states': 'Compartments', 'V': 'Vaccination'})
    
    return fig

if __name__ == '__main__':
    create_database()
    app.run(debug=True, port=5000)