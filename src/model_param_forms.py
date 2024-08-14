import dash_bootstrap_components as dbc
from dash import html, dcc
from datetime import datetime
from epi_sim import EpiSim

def calculate_days_between(start_date, end_date):
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    return (end - start).days + 1

def general_params(params):
    return [
        dbc.Row([
            dbc.Col([
                dbc.Label("Start Date"),
                dcc.DatePickerSingle(
                    id='start-date',
                    date=params['start_date']
                )
            ]),
            dbc.Col([
                dbc.Label("End Date"),
                dcc.DatePickerSingle(
                    id='end-date',
                    date=params['end_date']
                )
            ])
        ]),
        html.P(id='simulation-period'),
        dbc.Row([
            dbc.Col([
                dbc.Checkbox(
                    id='save-full-output',
                    label="Save Full Output",
                    value=params['save_full_output']
                )
            ]),
            dbc.Col([
                dbc.Checkbox(
                    id='save-time-step-checkbox',
                    label="Save Time Step",
                    value=True
                ),
                dbc.Input(
                    id='save-time-step',
                    type="number",
                    value=None,
                    style={'marginTop': '10px'}
                )
            ])
        ]),
        dbc.Row([
            dbc.Col([
                dbc.Label("Output Folder"),
                dbc.Input(
                    id='output-folder',
                    type="text",
                    value=params['output_folder']
                )
            ]),
            dbc.Col([
                dbc.Label("Output Format"),
                dcc.Dropdown(
                    id='output-format',
                    options=[
                        {'label': 'NetCDF', 'value': 'netcdf'},
                        {'label': 'CSV', 'value': 'csv'}
                    ],
                    value=params['output_format']
                )
            ])
        ]),
        dbc.Row([
            dbc.Col([
                dbc.Label("Backend Engine"),
                dcc.Dropdown(
                    id='backend-engine',
                    options=[
                        {'label': engine, 'value': engine} for engine in EpiSim.BACKEND_ENGINES
                    ],
                    value=EpiSim.DEFAULT_BACKEND_ENGINE
                )
            ])
        ]),
    ]

def epidemic_params(params):
    return [
        html.H3("Epidemic Parameters"),
        dbc.Row([
            dbc.Col([
                dbc.Label("Scale β"),
                dbc.Input(id='scale-beta', type="number", value=params['scale_β'])
            ]),
            dbc.Col([
                dbc.Label("βᴬ"),
                dbc.Input(id='beta-a', type="number", value=params['βᴬ'])
            ]),
            dbc.Col([
                dbc.Label("βᴵ"),
                dbc.Input(id='beta-i', type="number", value=params['βᴵ'])
            ]),
        ]),
        dbc.Row([
            dbc.Col([
                dbc.Label("ηᵍ"),
                dbc.Input(id='eta-g', type="text", value=', '.join(map(str, params['ηᵍ'])))
            ]),
            dbc.Col([
                dbc.Label("αᵍ"),
                dbc.Input(id='alpha-g', type="text", value=', '.join(map(str, params['αᵍ'])))
            ]),
            dbc.Col([
                dbc.Label("μᵍ"),
                dbc.Input(id='mu-g', type="text", value=', '.join(map(str, params['μᵍ'])))
            ]),
        ]),
        dbc.Row([
            dbc.Col([
                dbc.Label("θᵍ"),
                dbc.Input(id='theta-g', type="text", value=', '.join(map(str, params['θᵍ'])))
            ]),
            dbc.Col([
                dbc.Label("γᵍ"),
                dbc.Input(id='gamma-g', type="text", value=', '.join(map(str, params['γᵍ'])))
            ]),
            dbc.Col([
                dbc.Label("ζᵍ"),
                dbc.Input(id='zeta-g', type="text", value=', '.join(map(str, params['ζᵍ'])))
            ]),
        ]),
        dbc.Row([
            dbc.Col([
                dbc.Label("λᵍ"),
                dbc.Input(id='lambda-g', type="text", value=', '.join(map(str, params['λᵍ'])))
            ]),
            dbc.Col([
                dbc.Label("ωᵍ"),
                dbc.Input(id='omega-g', type="text", value=', '.join(map(str, params['ωᵍ'])))
            ]),
            dbc.Col([
                dbc.Label("ψᵍ"),
                dbc.Input(id='psi-g', type="text", value=', '.join(map(str, params['ψᵍ'])))
            ]),
        ]),
        dbc.Row([
            dbc.Col([
                dbc.Label("χᵍ"),
                dbc.Input(id='chi-g', type="text", value=', '.join(map(str, params['χᵍ'])))
            ]),
            dbc.Col([
                dbc.Label("Λ"),
                dbc.Input(id='lambda', type="number", value=params['Λ'])
            ]),
            dbc.Col([
                dbc.Label("Γ"),
                dbc.Input(id='gamma', type="number", value=params['Γ'])
            ]),
        ]),
        dbc.Row([
            dbc.Col([
                dbc.Label("rᵥ"),
                dbc.Input(id='r-v', type="text", value=', '.join(map(str, params['rᵥ'])))
            ]),
            dbc.Col([
                dbc.Label("kᵥ"),
                dbc.Input(id='k-v', type="text", value=', '.join(map(str, params['kᵥ'])))
            ]),
            dbc.Col([
                dbc.Label("Risk Reduction DD"),
                dbc.Input(id='risk-reduction-dd', type="number", value=params['risk_reduction_dd'])
            ]),
        ]),
        dbc.Row([
            dbc.Col([
                dbc.Label("Risk Reduction H"),
                dbc.Input(id='risk-reduction-h', type="number", value=params['risk_reduction_h'])
            ]),
            dbc.Col([
                dbc.Label("Risk Reduction D"),
                dbc.Input(id='risk-reduction-d', type="number", value=params['risk_reduction_d'])
            ]),
        ])
    ]

def vaccination_params(params):
    return [
        html.H3("Vaccination", style={'display': 'inline-block', 'marginRight': '10px'}),
        dbc.Checkbox(id='are-there-vaccines', value=params['are_there_vaccines'], label="Enable", style={'display': 'inline-block'}),
        dbc.Row([
            dbc.Col([
                dbc.Label("ϵᵍ (Vaccines per day per age group)"),
                dbc.Input(id='epsilon-g', type="text", value=', '.join(map(str, params['ϵᵍ'])))
            ]),
            dbc.Col([
                dbc.Label("Percentage of Vaccination per Day"),
                dbc.Input(id='percentage-vacc-per-day', type="number", value=params['percentage_of_vacc_per_day'])
            ]),
        ]),
        dbc.Row([
            dbc.Col([
                dbc.Label("Start Vaccination Day"),
                dbc.Input(id='start-vacc', type="number", value=params['start_vacc'])
            ]),
            dbc.Col([
                dbc.Label("Vaccination Duration (days)"),
                dbc.Input(id='dur-vacc', type="number", value=params['dur_vacc'])
            ]),
        ])
    ]

def npi_params(params):
    return [
        html.H3("Non-Pharmaceutical Interventions"),
        dbc.Col([
            dbc.Row([
                dbc.Label("κ₀s: Mobility reduction factor"),
                dbc.Input(id='kappa0s', type="text", value=', '.join(map(str, params['κ₀s'])))
            ]),
            dbc.Row([
                dbc.Label("ϕs: Confined household permeability factor"),
                dbc.Input(id='phis', type="text", value=', '.join(map(str, params['ϕs'])))
            ]),
            dbc.Row([
                dbc.Label("δs: Social distancing factor"),
                dbc.Input(id='deltas', type="text", value=', '.join(map(str, params['δs'])))
            ]),
            dbc.Row([
                dbc.Label("tᶜs: Timesteps at which confinement (lockdown) is applied"),
                dbc.Input(id='deltas', type="text", value=', '.join(map(str, params['δs'])))
            ]),
            # Add other NPI fields similarly
        ]),
    ]

def initial_condition_upload():
    return [
        dbc.Row([
            dbc.Col([
                dbc.Label("Initial Condition File"),
                dcc.Upload(
                    id='initial-condition-file',
                    children=html.Div([
                        'Drag and Drop or ',
                        html.A('Select File')
                    ]),
                    style={
                        'width': '100%',
                        'height': '60px',
                        'lineHeight': '60px',
                        'borderWidth': '1px',
                        'borderStyle': 'dashed',
                        'borderRadius': '5px',
                        'textAlign': 'center',
                        'margin': '10px 0'
                    },
                    multiple=False
                )
            ]),
        ]),
    ]