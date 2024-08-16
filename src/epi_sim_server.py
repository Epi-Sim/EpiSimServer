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


@app.route('/setup2')
def setup2():
    return render_template('index.html')

@app.route('/engine_options')
def engine_options():
    return jsonify(EpiSim.BACKEND_ENGINES)


@dash_app.callback(Output('page-content', 'children'),
                   Input('url', 'pathname'))
def display_page(pathname):
    if pathname == '/setup':
        return setup_layout()
    else:
        return home_layout()

def home_layout():
    return html.Div([
        html.H1("Welcome to EpiSim Server"),
        html.P("Use the /run_simulation endpoint to run simulations."),
        dcc.Link("Setup", href="/setup"),
        html.Br(),
        dcc.Link("React setup", href="/setup2"),
    ])

def setup_layout():
    config_path = os.path.join(os.path.dirname(__file__), os.pardir, "models/mitma/config.json")
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    simulation_config = config['simulation']
    epidemic_params = config['epidemic_params']
    vaccination = config['vaccination']
    npi = config['NPI']


    return dbc.Container([
        dcc.Store(id='config-store', data=config),
        html.H1("Model configuration"),
        dbc.Form([
            *mpf.initial_condition_upload(),

            # General Parameters
            dbc.Accordion([
                dbc.AccordionItem([
                    *mpf.general_params(simulation_config),
                ], title="General Parameters")
            ], start_collapsed=False),

            dbc.Accordion([
                dbc.AccordionItem([
                    *mpf.epidemic_params(epidemic_params),
                ], title="Epidemic Parameters")
            ], start_collapsed=True),

            # # Population Parameters
            # html.H3("Population Parameters"),
            # dbc.Row([
            #     dbc.Col([
            #         dbc.Label("G Labels"),
            #         dcc.Dropdown(id='g-labels', options=[{'label': l, 'value': l} for l in population_params['G_labels']], value=population_params['G_labels'], multi=True)
            #     ]),
            #     # Add other population parameter fields similarly
            # ]),

            # Vaccination
            dbc.Accordion([
                dbc.AccordionItem([
                    *mpf.vaccination_params(vaccination),
                ], title="Vaccination")
            ], start_collapsed=True),

            # NPI
            dbc.Accordion([
                dbc.AccordionItem([
                    *mpf.npi_params(npi),
                ], title="Non-Pharmaceutical Interventions")
            ], start_collapsed=True),

            dbc.Button("Run Simulation", id="run-simulation-button", color="primary", className="mt-3"),
            html.Div(id='simulation-output', className="mt-3")
        ])
    ])

@dash_app.callback(
    Output('config-store', 'data', allow_duplicate=True),
    Input('url', 'pathname'),
    prevent_initial_call='initial_duplicate'
)
def initialize_config_store(pathname):
    if pathname == '/setup':
        config_path = os.path.join(os.path.dirname(__file__), os.pardir, "models/mitma/config.json")
        with open(config_path, 'r') as f:
            return json.load(f)
    raise PreventUpdate

@dash_app.callback(
    Output('config-store', 'data', allow_duplicate=True),
    Input('start-date', 'date'),
    Input('end-date', 'date'),
    State('save-full-output', 'value'),
    State('save-time-step-checkbox', 'value'),
    State('save-time-step', 'value'),
    State('output-folder', 'value'),
    State('output-format', 'value'),
    State('backend-engine', 'value'),
    State('config-store', 'data'),
    # vaccination params
    State('are-there-vaccines', 'value'),
    State('epsilon-g', 'value'),
    State('percentage-vacc-per-day', 'value'),
    State('start-vacc', 'value'),
    State('dur-vacc', 'value'),
    prevent_initial_call=True
)
def update_config_store(*args):
    (
        start_date,
        end_date,
        save_full_output,
        save_time_step_enabled,
        save_time_step,
        output_folder,
        output_format,
        backend_engine,
        config,
        are_there_vaccines,
        epsilon_g,
        percentage_vacc_per_day,
        start_vacc,
        dur_vacc,
    ) = args

    ctx = callback_context
    if not ctx.triggered:
        raise PreventUpdate

    input_id = ctx.triggered[0]['prop_id'].split('.')[0]

    if input_id == 'start-date':
        config['simulation']['start_date'] = start_date
    elif input_id == 'end-date':
        config['simulation']['end_date'] = end_date
    elif input_id == 'save-full-output':
        config['simulation']['save_full_output'] = save_full_output
    elif input_id == 'save-time-step-checkbox':
        config['simulation']['save_time_step_enabled'] = save_time_step_enabled
    elif input_id == 'save-time-step':
        config['simulation']['save_time_step'] = save_time_step if save_time_step_enabled else None
    elif input_id == 'output-folder':
        config['simulation']['output_folder'] = output_folder
    elif input_id == 'output-format':
        config['simulation']['output_format'] = output_format
    elif input_id == 'backend-engine':
        config['simulation']['backend_engine'] = backend_engine
    elif input_id == 'are-there-vaccines':
        config['vaccination']['are_there_vaccines'] = are_there_vaccines
    elif input_id == 'epsilon-g':
        config['vaccination']['ϵᵍ'] = [float(x.strip()) for x in epsilon_g.split(',')]
    elif input_id == 'percentage-vacc-per-day':
        config['vaccination']['percentage_of_vacc_per_day'] = percentage_vacc_per_day
    elif input_id == 'start-vacc':
        config['vaccination']['start_vacc'] = start_vacc
    elif input_id == 'dur-vacc':
        config['vaccination']['dur_vacc'] = dur_vacc

    app.logger.debug(f"config: {config}")
    return config

@dash_app.callback(
    Output('simulation-output', 'children'),
    Input('run-simulation-button', 'n_clicks'),
    State('config-store', 'data'),
    prevent_initial_call=True
)
def run_simulation(n_clicks, config):
    if n_clicks is None:
        raise PreventUpdate

    payload = {
        'config': json.dumps(config),
        'mobility_reduction': json.dumps({}),  # Load from file or prepare as needed
        'mobility_matrix': json.dumps({}),  # Load from file or prepare as needed
        'metapop': json.dumps({}),  # Load from file or prepare as needed
        'init_conditions': '',  # Prepare as needed
        'backend_engine': config['simulation']['backend_engine']
    }

    response = requests.post('http://localhost:5000/run_simulation', json=payload)
    
    if response.status_code == 200:
        result = response.json()
        return f"Simulation completed successfully. Output: {result['output']}"
    else:
        return f"Error running simulation: {response.json()['message']}"


# when the save-time-step checkbox is unchecked, the daypicker field is disabled
@dash_app.callback(
    Output('save-time-step', 'disabled'),
    Input('save-time-step-checkbox', 'value')
)
def toggle_save_time_step(checkbox_value):
    return not checkbox_value

@dash_app.callback(
    Output('simulation-period', 'children'),
    Output('save-time-step', 'value'),
    Input('start-date', 'date'),
    Input('end-date', 'date')
)
def update_simulation_period(start_date, end_date):
    if start_date and end_date:
        num_days = mpf.calculate_days_between(start_date, end_date)
        return f"Simulation period: {num_days} days", num_days
    return "Please select both start and end dates", None

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