import React, { useState, useEffect } from 'react';
import { Container, Paper, Typography, Stack, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { enGB } from 'date-fns/locale';
import { GeneralParams, EpidemicParams, InitialConditionUpload, VaccinationParams, NPIParams } from './ConfigComponents';

const App = () => {
  const [params, setParams] = useState(() => {
    try {
      return require('/models/mitma/config.json');
    } catch (error) {
      console.error('Error loading config:', error);
      return {};
    }
  });

  const [engineOptions, setEngineOptions] = useState([]);

  useEffect(() => {
    fetch('/engine_options')
      .then(response => response.json())
      .then(data => setEngineOptions(data))
      .catch(error => console.error('Error fetching engine options:', error));
  }, []);

  const updateParams = (section, newData) => {
    setParams(prevParams => ({
      ...prevParams,
      [section]: { ...prevParams[section], ...newData }
    }));
  };

  const [openSections, setOpenSections] = useState({
    initialCondition: true,
    general: true,
    epidemic: false,
    vaccination: false,
    npi: false
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const sections = [
    {
      key: 'initialCondition',
      title: 'Initial Condition Upload',
      component: InitialConditionUpload,
      props: { params: params, setParams: (newData) => updateParams('initial_conditions', newData) }
    },
    {
      key: 'general',
      title: 'General Parameters',
      component: GeneralParams,
      props: { params: params.simulation, setParams: (newData) => updateParams('simulation', newData), engineOptions: engineOptions || [] }
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

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
      <Container maxWidth="md">
        <Paper elevation={3} style={{ padding: '20px', marginTop: '20px' }}>
          <Stack spacing={2}>
            <Typography variant="h4" gutterBottom>Model Configuration</Typography>
            {sections.map(section => (
              <ConfigSection
                key={section.key}
                title={section.title}
                isOpen={openSections[section.key]}
                onToggle={() => toggleSection(section.key)}
                component={section.component}
                componentProps={section.props}
              />
            ))}
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