import React, { useState, useEffect } from 'react';
import { Container, Paper, Typography, Stack, Accordion, AccordionSummary, AccordionDetails, Button, CircularProgress, Link as MuiLink } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { enGB } from 'date-fns/locale';
import { GeneralParams, EpidemicParams, VaccinationParams, NPIParams, ParameterUpload } from './ConfigComponents';
import DownloadResults from './DownloadResults';
import { MapData } from './types/mapTypes';
import { Config, ConfigSectionType, EngineOption, BackendEngine } from './types/paramsTypes';
import { SimulationResult } from './types/simulationResultsTypes';

const geojsonData: MapData = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Sample Polygon",
        "id": "1",
        "Y": 100,
        "M": 200,
        "O": 300
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [-71.729, 48.010],
            [-71.291, 48.004],
            [-71.291, 47.777],
            [-71.729, 47.786],
            [-71.729, 48.010]
          ]
        ]
      }
    }
  ]
};


const App = () => {
  const [engineOptions, setEngineOptions] = useState<EngineOption[]>([]);
  const [initialConditionsFile, setInitialConditionsFile] = useState<File | null>(null);
  const [populationFile, setPopulationFile] = useState<File | null>(null);
  const [mobilityFile, setMobilityFile] = useState<File | null>(null);
  const [mobilityReductionFile, setMobilityReductionFile] = useState<File | null>(null);
  const [mapData, setMapData] = useState<MapData>(geojsonData);

  const [params, setParams] = useState<Config | null>(null);

  useEffect(() => {
    const script = document.getElementById('initial-data');
    if (script) {
      try {
        setParams(JSON.parse(script.textContent!) as Config);
      } catch (error) {
        console.error('Error parsing initial data:', error);
      }
    }
  }, []);

  useEffect(() => {
    fetch('/engine_options')
      .then(response => response.json())
      .then(data => setEngineOptions(data))
      .catch(error => console.error('Error fetching engine options:', error));
  }, []);

  const setBackendEngine = (newData: BackendEngine) => {
    setParams((prevParams: Config | null) => prevParams && ({
      ...prevParams,
      backend_engine: newData
    }));
  };

  const updateParams = (section: string, newData: ConfigSectionType<any>) => {
    setParams((prevParams: Config | null) => prevParams && ({
      ...prevParams,
      [section]: { ...prevParams[section], ...newData }
    }));
  };

  const [openSections, setOpenSections] = useState({
    parameterUpload: true,
    general: true,
    epidemic: false,
    vaccination: false,
    npi: false
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleMapDataChange = (newMapData: MapData) => {
    console.log("new map data");
    console.log(newMapData);
    setMapData(newMapData);
    // You might want to update other parts of your state or params here
  };

  const sections = params && [
    {
      key: 'parameterUpload',
      title: 'Parameter Uploads',
      component: ParameterUpload,
      props: {
        initialConditionsFile,
        setInitialConditionsFile,
        populationFile,
        setPopulationFile,
        mobilityFile,
        setMobilityFile,
        mobilityReductionFile,
        setMobilityReductionFile,
        mapData,
        onMapDataChange: handleMapDataChange
      }
    },
    {
      key: 'general',
      title: 'General Parameters',
      component: GeneralParams,
      props: { 
        params: params.simulation, 
        setParams: (newData) => updateParams('simulation', newData), 
        engineOptions: engineOptions || [],
        backendEngine: params.backend_engine,
        setBackendEngine: setBackendEngine
      }
    },
    {
      key: 'epidemic',
      title: 'Epidemic Parameters',
      component: EpidemicParams,
      props: { params: params.epidemic_params, setParams: (newData) => updateParams('epidemic_params', newData) }
    },
    {
      key: 'vaccination',
      title: 'Vaccination Parameters',
      component: VaccinationParams,
      props: { params: params.vaccination, setParams: (newData) => updateParams('vaccination', newData) }
    },
    {
      key: 'NPI',
      title: 'Non-Pharmaceutical Interventions',
      component: NPIParams,
      props: { params: params.NPI, setParams: (newData) => updateParams('NPI', newData) }
    }
  ];

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [hasResults, setHasResults] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    setResult(null);
    setHasResults(false);
    try {
      const formData = new FormData();
      formData.append('config', JSON.stringify(params));
      if (mobilityReductionFile) formData.append('mobility_reduction', mobilityReductionFile);
      if (mobilityFile) formData.append('mobility_matrix', mobilityFile);
      if (populationFile) formData.append('metapop', populationFile);
      if (initialConditionsFile) formData.append('init_conditions', initialConditionsFile);
      if (params?.backend_engine) formData.append('backend_engine', params.backend_engine);

      const response = await fetch('/run_simulation', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setResult(data);
      if (data.status === 'success') {
        setHasResults(true);
      }
    } catch (error) {
      console.error('Error submitting simulation:', error);
      setResult({ status: 'error', message: 'Failed to run simulation' } as SimulationResult);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadConfig = () => {
    const configJson = JSON.stringify(params, null, 2);
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'config.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
      <Container maxWidth="md">
        <Paper elevation={3} style={{ padding: '20px', marginTop: '20px' }}>
          <Stack spacing={2}>
            <Typography variant="h4" gutterBottom>Model Configuration</Typography>
            {sections && sections.map(section => (
              <ConfigSection
                key={section.key}
                title={section.title}
                isOpen={openSections[section.key]}
                onToggle={() => toggleSection(section.key)}
                component={section.component}
                componentProps={section.props}
              />
            ))}
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? <CircularProgress size={24} /> : 'Run Simulation'}
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleDownloadConfig}
                startIcon={<DownloadIcon />}
              >
                Download Config
              </Button>
            </Stack>
            {result && (
              <Typography color={result.status === 'success' ? 'success' : 'error'}>
                {result.message}
              </Typography>
            )}
            {hasResults && result && (
              <>
                <DownloadResults data={result.output} />
                <MuiLink href={`/dash/results/${result.uuid}`} underline="none">
                  <Button variant="contained" color="secondary">
                    Go to Analysis Page
                  </Button>
                </MuiLink>
              </>
            )}
          </Stack>
        </Paper>
      </Container>
    </LocalizationProvider>
  );
};

const ConfigSection = ({ title, isOpen, onToggle, component: Component, componentProps }) => (
  <Accordion expanded={isOpen} onChange={onToggle}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Typography>{title}</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Component {...componentProps} />
    </AccordionDetails>
  </Accordion>
);

export default App;