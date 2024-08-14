from flask import Flask, request, jsonify, render_template_string
import json
import os
import tempfile
import base64
from epi_sim import EpiSim
from dash import Dash, html, dcc, Input, Output, State
import plotly.express as px
import dash_bootstrap_components as dbc
from datetime import datetime

import model_param_forms as mpf

app = Flask(__name__)
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

            dbc.Button("Update Configuration", id="submit-button", color="primary", className="mt-3")
        ]),
        html.Div(id='output-message', className="mt-3")
    ])

@dash_app.callback(
    Output('output-message', 'children'),
    Input('submit-button', 'n_clicks'),
    State('start-date', 'date'),
    State('end-date', 'date'),
    State('save-full-output', 'value'),
    State('save-time-step-checkbox', 'value'),
    State('save-time-step', 'value'),
    State('output-folder', 'value'),
    State('output-format', 'value'),
    State('backend-engine', 'value')
)
def update_general_params(n_clicks, start_date, end_date, save_full_output, save_time_step_enabled, save_time_step, output_folder, output_format, backend_engine):
    if n_clicks is None:
        return ""
    
    updated_config = {
        "start_date": start_date,
        "end_date": end_date,
        "save_full_output": save_full_output,
        "save_time_step_enabled": save_time_step_enabled,
        "save_time_step": save_time_step if save_time_step_enabled else None,
        "output_folder": output_folder,
        "output_format": output_format,
        "backend_engine": backend_engine
    }
    
    # Here you can add logic to save the updated configuration and set the backend engine
    # For example:
    # epi_sim_instance.set_backend_engine(backend_engine)
    
    return f"Configuration updated: {json.dumps(updated_config, indent=2)}"

@dash_app.callback(
    Output('output-message', 'children'),
    Input('submit-button', 'n_clicks'),
    State('are-there-vaccines', 'value'),
    State('epsilon-g', 'value'),
    State('percentage-vacc-per-day', 'value'),
    State('start-vacc', 'value'),
    State('dur-vacc', 'value')
)
def update_vaccination_params(n_clicks, are_there_vaccines, epsilon_g, percentage_vacc_per_day, start_vacc, dur_vacc):
    if n_clicks is None:
        return ""
    
    updated_config = {
        "are_there_vaccines": are_there_vaccines,
        "ϵᵍ": [float(x.strip()) for x in epsilon_g.split(',')],
        "percentage_of_vacc_per_day": percentage_vacc_per_day,
        "start_vacc": start_vacc,
        "dur_vacc": dur_vacc
    }
    
    # Here you can add logic to save the updated configuration
    # For example:
    # epi_sim_instance.update_vaccination_params(updated_config)
    
    return f"Vaccination parameters updated: {json.dumps(updated_config, indent=2)}"


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
    dash_app.run_server(debug=True)