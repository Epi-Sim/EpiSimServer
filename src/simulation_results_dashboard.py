from dash import html, dcc, Input, Output, State
import dash_bootstrap_components as dbc
import pandas as pd
import numpy as np
import io
import base64
from db.db import read_simulation
import folium
import plotly.express as px
import geopandas as gpd

def create_results_layout(simulation_id):
    return dbc.Container([
        html.H1(f"Results for Simulation {simulation_id}", className="mt-4 mb-4"),
        dbc.Row([
            dbc.Col([
                html.H3("Interactive Plot"),
                dcc.Graph(id='results-graph'),
                dcc.Dropdown(id='compartment-selector', multi=True, value=['I', 'R']),
                dcc.Dropdown(id='region-selector', multi=True),
                dcc.RangeSlider(id='time-range-slider', min=0, max=100, step=1, value=[], marks=None),
                dcc.Dropdown(id='age-selector', multi=True),
                dcc.Dropdown(id='vaccination-selector', multi=True, value=['NV', 'V']),
            ], md=6),
            dbc.Col([
                html.H3("Infected vs Susceptible Over Time"),
                dcc.Graph(id='total-cases-graph'),
            ], md=6),
        ]),
        dbc.Row([
            dbc.Col([
                html.H3("Age Distribution"),
                dcc.Graph(id='age-distribution-graph'),
            ], md=6),
            dbc.Col([
                html.H3("Regional Comparison"),
                html.Iframe(id='regional-comparison-graph', src='', width='100%', height='400px'),
            ], md=6),
        ], className="mt-4"),
    ], fluid=True)

def register_callbacks(dash_app):
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
            return px.line()
        
        filters = {}
        if selected_compartments:
            filters['epi_states'] = selected_compartments
        if selected_regions:
            filters['M'] = selected_regions
        if selected_ages:
            filters['G'] = selected_ages
        if selected_vaccinations:
            filters['V'] = selected_vaccinations
        
        if time_range:
            start_time, end_time = ds.T.values[time_range[0]], ds.T.values[time_range[1]]
            filtered_ds = ds.sel(T=slice(start_time, end_time))
        else:
            filtered_ds = ds

        filtered_ds = filtered_ds.sel(**filters)
        
        summed_ds = filtered_ds.sum(dim=[dim for dim in ['M', 'G'] if dim in filtered_ds.dims])
        
        df = summed_ds.to_dataframe().reset_index()
        
        fig = px.line(df, x='T', y='data', color='epi_states', line_dash='V',
                      title='Compartment Values Over Time',
                      labels={'T': 'Time', 'data': 'Population', 'epi_states': 'Compartments', 'V': 'Vaccination'})
        
        return fig

    @dash_app.callback(
        [Output('total-cases-graph', 'figure'),
         Output('age-distribution-graph', 'figure'),
         Output('regional-comparison-graph', 'src')],
        [Input('url', 'pathname')]
    )
    def update_static_graphs(pathname):
        simulation_id = pathname.split('/')[-1]
        ds = read_simulation(simulation_id)

        if ds is None:
            return '', '', ''  # Return empty strings for the figures and iframe src

        # Infected vs Susceptible Over Time
        infected = ds.sel(epi_states='I').sum(dim=['M', 'G', 'V']).data.to_numpy()
        susceptible = ds.sel(epi_states='S').sum(dim=['M', 'G', 'V']).data.to_numpy()
        
        inf_sus_df = pd.DataFrame({
            'Infected': infected,
            'Susceptible': susceptible
        })
        
        inf_sus_fig = px.line(inf_sus_df, x='Susceptible', y='Infected',
                              title='Infected vs Susceptible Over Time')
        inf_sus_fig.update_layout(xaxis_title='Susceptible', yaxis_title='Infected')

        # Age Distribution
        age_distribution = ds.sel(epi_states='I', T=ds.T[-1]).sum(dim=['M', 'V']).to_dataframe().reset_index()
        age_dist_fig = px.bar(x=age_distribution['G'], y=age_distribution['data'], title='Age Distribution of Cases')
        age_dist_fig.update_layout(xaxis_title='Age Group', yaxis_title='Number of Cases')

        # Regional Comparison (changed to Folium map)
        regional_cases = ds.sel(epi_states='I', T=ds.T[-1]).sum(dim=['G', 'V']).to_dataframe().reset_index()
        
        with open('models/mitma/fl_municipios_catalonia.geojson') as f:
            gdf = gpd.read_file(f).to_crs(epsg=4326)
            inf_mapdata = ds.sel(epi_states='I', T=ds.T[-1]).sum(dim=['G', 'V']).where(ds.M.isin(gdf.id))
            inf_mapdata = inf_mapdata.to_dataframe().reset_index()
            total_bounds = gdf.total_bounds
            lat, lon = ((total_bounds[0] + total_bounds[2]) / 2, (total_bounds[1] + total_bounds[3]) / 2)

        # Create Folium map
        folium_map = folium.Map(location=[lat, lon], zoom_start=7)
        folium.Choropleth(
            geo_data=gdf,
            data=inf_mapdata,
            columns=['M', 'data'],
            key_on='feature.properties.id',
            fill_opacity=0.5,
            line_opacity=0.2,
        ).add_to(folium_map)

        # Save the map to a StringIO object
        map_io = io.BytesIO()
        folium_map.save(map_io, close_file=False)
        map_io.seek(0)
        map_html = map_io.getvalue().decode()

        # Encode the HTML to base64
        map_base64 = base64.b64encode(map_html.encode()).decode()
        map_src = f"data:text/html;base64,{map_base64}"

        return inf_sus_fig, age_dist_fig, map_src  # Return figures and the base64 string for iframe