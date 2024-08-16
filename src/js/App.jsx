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

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
      <Container maxWidth="md">
        <Paper elevation={3} style={{ padding: '20px', marginTop: '20px' }}>
          <Stack spacing={2}>
            <Typography variant="h4" gutterBottom>Model Configuration</Typography>
            <Accordion expanded={openSections.initialCondition} onChange={() => toggleSection('initialCondition')}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Initial Condition Upload</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <InitialConditionUpload params={params} setParams={(newData) => updateParams('initial_conditions', newData)} />
              </AccordionDetails>
            </Accordion>
            <Accordion expanded={openSections.general} onChange={() => toggleSection('general')}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>General Parameters</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <GeneralParams 
                  params={params.simulation} 
                  setParams={(newData) => updateParams('simulation', newData)} 
                  engineOptions={engineOptions || []} 
                />
              </AccordionDetails>
            </Accordion>
            <Accordion expanded={openSections.epidemic} onChange={() => toggleSection('epidemic')}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Epidemic Parameters</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <EpidemicParams params={params.epidemic_params} setParams={(newData) => updateParams('epidemic_params', newData)} />
              </AccordionDetails>
            </Accordion>
            <Accordion expanded={openSections.vaccination} onChange={() => toggleSection('vaccination')}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Vaccination Parameters</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <VaccinationParams params={params.vaccination} setParams={(newData) => updateParams('vaccination', newData)} />
              </AccordionDetails>
            </Accordion>
            <Accordion expanded={openSections.npi} onChange={() => toggleSection('npi')}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Non-Pharmaceutical Interventions</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <NPIParams params={params.NPI} setParams={(newData) => updateParams('NPI', newData)} />
              </AccordionDetails>
            </Accordion>
          </Stack>
        </Paper>
      </Container>
    </LocalizationProvider>
  );
};

export default App;