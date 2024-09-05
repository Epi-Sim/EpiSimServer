from dash import html, dcc, Input, Output, State
import dash_bootstrap_components as dbc
import pandas as pd
import xarray as xr
import numpy as np
import io
import base64
from db.db import read_simulation
import folium
from branca.colormap import linear
import plotly.express as px
import plotly.graph_objects as go
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
                dcc.Dropdown(id='vaccination-selector', multi=True, value=[]),
            ], md=6),
            dbc.Col([
                html.H3("Infected vs Hospitalizations Over Time"),
                dcc.Graph(id='hospitalization-graph'),
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
        
        summed_ds = filtered_ds.sum(dim=[dim for dim in ['M', 'G', 'V'] if dim in filtered_ds.dims])
        
        df = summed_ds.to_dataframe().reset_index()
        
        if 'V' in df.columns:
            fig = px.line(df, x='T', y='data', color='epi_states', line_dash='V',
                          title='Compartment Values Over Time',
                          labels={'T': 'Time', 'data': 'Population', 'epi_states': 'Compartments', 'V': 'Vaccination'})
        else:
            fig = px.line(df, x='T', y='data', color='epi_states',
                          title='Compartment Values Over Time',
                          labels={'T': 'Time', 'data': 'Population', 'epi_states': 'Compartments'})

        
        return fig

    def fetch_reference_data(simulation_id):
        ds = xr.open_dataarray('models/mitma/casos_hosp_def_edad_provres.nc')
        ds['T'] = pd.to_datetime(ds['T'].values)
        return ds

    @dash_app.callback(
        [Output('hospitalization-graph', 'figure'),  # Updated output ID
         Output('age-distribution-graph', 'figure'),
         Output('regional-comparison-graph', 'src')],
        [Input('url', 'pathname')]
    )
    def update_static_graphs(pathname):
        simulation_id = pathname.split('/')[-1]
        sim_output = read_simulation(simulation_id)

        if sim_output is None:
            return px.line(), px.bar(), ''  # Return empty figures and iframe src

        # Fetch hospitalization data
        reference = fetch_reference_data(simulation_id)

        # Infected vs Hospitalizations Over Time
        sum_dims = [d for d in ['M', 'G', 'V', 'epi_states'] if d in sim_output.dims]
        sim_hosp = sim_output.sel(epi_states=['PH', 'HR', 'HD']).sum(dim=sum_dims).data
        sim_hosp.name = 'Simulated Hospitalizations'
        reference_hosp = reference.sel(epi_states='H').sum(dim=['M', 'G'])
        reference_hosp.name = 'Reference Hospitalizations'

        # merge sim_hosp and reference_hosp on time
        merged_hosp = xr.merge([sim_hosp, reference_hosp])

        # Create the figure using go.Figure
        inf_hosp_fig = go.Figure()

        # Add simulated infected trace
        inf_hosp_fig.add_trace(go.Scatter(
            x=merged_hosp.T, 
            y=merged_hosp['Simulated Hospitalizations'].values,
            mode='lines',
            name='Simulated Hospitalizations'
        ))

        # Add reference hospitalization trace
        inf_hosp_fig.add_trace(go.Scatter(
            x=merged_hosp.T, 
            y=merged_hosp['Reference Hospitalizations'].values,
            mode='lines',
            name='Reference Hospitalizations',
            line=dict(dash='dot')
        ))

        # Update layout
        inf_hosp_fig.update_layout(
            title='Simulated Hospitalizations vs Reference Hospitalizations Over Time',
            xaxis_title='Time',
            yaxis_title='Count',
            legend_title='Data Source'
        )

        # Age Distribution
        sum_dims = [d for d in ['M', 'V'] if d in sim_output.dims]
        age_distribution = sim_output.sel(epi_states='I', T=sim_output.T[-1]).sum(dim=sum_dims).to_dataframe().reset_index()
        age_dist_fig = px.bar(x=age_distribution['G'], y=age_distribution['data'], title='Age Distribution of Cases')
        age_dist_fig.update_layout(xaxis_title='Age Group', yaxis_title='Number of Cases')
        
        with open('models/mitma/fl_municipios_catalonia.geojson') as f:
            gdf = gpd.read_file(f).to_crs(epsg=4326)
        
        map_src = choropleth_map(gdf, sim_output)

        return inf_hosp_fig, age_dist_fig, map_src  # Return updated figures


def choropleth_map(gdf, simulation_results):
    """
    Creates a choropleth map of the infected compartment from simulation results at the final time step.
    Returns a base64 encoded string of the leaflet map, which can be used in an iframe.
    """
    sum_dims = ['G', 'V'] if 'V' in simulation_results.dims else ['G']
    inf_mapdata = (
        simulation_results
        .sel(epi_states='I', T=simulation_results.T[-1])
        .sum(dim=sum_dims)
        .where(simulation_results.M.isin(gdf.id))
    )
    inf_mapdata = inf_mapdata.to_dataframe().reset_index()

    # Merge inf_mapdata with gdf based on 'id' and 'M'
    merged_data = gdf.merge(inf_mapdata[['M', 'data']], left_on='id', right_on='M', how='left')
    # fill na with 0
    merged_data['data'] = merged_data['data'].fillna(0)

    total_bounds = gdf.total_bounds
    lon, lat = ((total_bounds[0] + total_bounds[2]) / 2, (total_bounds[1] + total_bounds[3]) / 2)

    # Create a color map based on the 'data' column
    colormap = linear.inferno.scale(merged_data['data'].min(), merged_data['data'].max())

    # Create Folium map
    folium_map = folium.Map(location=[lat, lon], zoom_start=7.5)
    folium.GeoJson(
        merged_data,
        style_function=lambda feature: {
            'fillColor': colormap(feature['properties']['data']),
            'color': 'black',
            'weight': 0.5,
            'fillOpacity': 0.5,
        },
        tooltip=folium.GeoJsonTooltip(
            fields=['name', 'data'],  # Add fields for tooltip
            aliases=['Name:', 'Infected Cases:'],
            localize=True,
            sticky=False,
            labels=True,
            style="""
                background-color: #F0EFEF;
                border: 2px solid black;
                border-radius: 3px;
                box-shadow: 3px;
            """,
        )
    ).add_to(folium_map)

    # Save the map to a StringIO object
    map_io = io.BytesIO()
    folium_map.save(map_io, close_file=False)
    map_io.seek(0)
    map_html = map_io.getvalue().decode()

    # Encode the HTML to base64
    map_base64 = base64.b64encode(map_html.encode()).decode()
    map_src = f"data:text/html;base64,{map_base64}"
    return map_src