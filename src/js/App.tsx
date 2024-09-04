import React, { useState, useEffect } from 'react';
// import { Container, Paper, Typography, Stack, Accordion, AccordionSummary, AccordionDetails, Button, CircularProgress, Link } from '@mui/material';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import enGB from 'date-fns/locale/en-GB';
import { GeneralParams, EpidemicParams, VaccinationParams, NPIParams, ParameterUpload } from './ConfigComponents';
import DownloadResults from './DownloadResults';
import { MapData } from './types/mapTypes';
import { Config, ConfigSectionType, EngineOption, BackendEngine } from './types/paramsTypes';
import { SimulationResult } from './types/simulationResultsTypes';

declare global {
  interface Window {
    // loaded in the html template home.html, injected by Flask
    initialData: string;
  }
}

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
  const [configFile, setConfigFile] = useState<File | null>(null);

  const [params, setParams] = useState<Config | null>(null);

  useEffect(() => {
    if (!window.initialData && typeof window.initialData !== 'string') {
      console.error('no initial data');
    } else {
      setParams(JSON.parse(window.initialData) as Config);
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

  const handleUploadConfig = (file: File, fileContent: Config) => {
    setConfigFile(file);
    setParams(fileContent);
  };

  const configFileSample = {
    sample: JSON.stringify(params, null, 2),
    formats: ['.json']
  };

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleMapDataChange = (newMapData: MapData) => {
    setMapData(newMapData);
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
        configFile,
        setConfigFile: handleUploadConfig,
        configFileSample,
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
        redirect: 'follow', // This tells fetch to follow redirects
      });
      
      if (response.redirected) {
        // If the response was redirected, navigate to the new URL
        window.location.href = response.url;
      } else if (response.ok) {
        const data = await response.json();
        setResult(data);
        setHasResults(true);
        if (data.redirect) {
          // If there's a redirect URL in the response, navigate to it
          window.location.href = data.redirect;
        }
      } else {
        throw new Error('Failed to run simulation');
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
            <Stack direction="row" spacing={2} justifyContent="center" alignItems="center">
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
                <Link href={`/dash/results/${result.uuid}`} underline="none">
                  <Button variant="contained" color="secondary">
                    Go to Analysis Page
                  </Button>
                </Link>
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