import React, { useState } from 'react';
import { Grid, TextField, Button, Typography, Checkbox, FormControlLabel, MenuItem } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { parseISO } from 'date-fns';

const GeneralParams = ({ params, setParams, engineOptions }) => {
  // Parse initial date values
  const [startDate, setStartDate] = useState(() => 
    params.start_date ? parseISO(params.start_date) : null
  );
  const [endDate, setEndDate] = useState(() => 
    params.end_date ? parseISO(params.end_date) : null
  );

  // Calculate initial save_time_step value
  const initialSaveTimeStep = React.useMemo(() => {
    if (params.save_time_step !== null && params.save_time_step !== undefined) {
      return params.save_time_step;
    }
    if (startDate && endDate) {
      return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    }
    return null;
  }, [params.save_time_step, startDate, endDate]);

  // Add new state variable for saveTimeStep checkbox and value
  const [saveTimeStepEnabled, setSaveTimeStepEnabled] = useState(params.save_time_step !== null);
  const [saveTimeStepValue, setSaveTimeStepValue] = useState(params.save_time_step || initialSaveTimeStep);
  const [maxSaveTimeStep] = useState(initialSaveTimeStep);

  // Handler functions for updating params
  const handleDateChange = (field) => (date) => {
    if (field === 'start_date') setStartDate(date);
    if (field === 'end_date') setEndDate(date);
    setParams({ ...params, [field]: date });
  };

  const handleInputChange = (field) => (event) => {
    setParams({ ...params, [field]: event.target.value });
  };

  const handleCheckboxChange = (field) => (event) => {
    setParams({ ...params, [field]: event.target.checked });
  };

  const handleSaveTimeStepChange = (event) => {
    const isChecked = event.target.checked;
    setSaveTimeStepEnabled(isChecked);
    setParams({ ...params, save_time_step: isChecked ? saveTimeStepValue : null });
  };

  const handleSaveTimeStepValueChange = (event) => {
    const newValue = Math.min(Number(event.target.value), maxSaveTimeStep);
    setSaveTimeStepValue(newValue);
    if (saveTimeStepEnabled) {
      setParams({ ...params, save_time_step: newValue });
    }
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <DatePicker
          label="Start Date"
          value={startDate}
          onChange={handleDateChange('start_date')}
        />
      </Grid>
      <Grid item xs={6}>
        <DatePicker
          label="End Date"
          value={endDate}
          onChange={handleDateChange('end_date')}
        />
      </Grid>
      <Grid item xs={6}>
        <FormControlLabel
          control={
            <Checkbox
              checked={params.save_full_output}
              onChange={handleCheckboxChange('save_full_output')}
            />
          }
          label="Save Full Output"
        />
      </Grid>
      <Grid item xs={6}>
        <FormControlLabel
          control={
            <Checkbox
              checked={saveTimeStepEnabled}
              onChange={handleSaveTimeStepChange}
            />
          }
          label="Save Time Step"
        />
        <TextField
          type="number"
          value={saveTimeStepValue}
          onChange={handleSaveTimeStepValueChange}
          style={{ marginTop: '10px' }}
          disabled={!saveTimeStepEnabled}
          inputProps={{ max: maxSaveTimeStep }}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          select
          fullWidth
          label="Backend Engine"
          value={params.backend_engine}
          onChange={handleInputChange('backend_engine')}
        >
          {engineOptions.map((engine) => (
            <MenuItem key={engine} value={engine}>
              {engine}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      {/* Add other fields similarly */}
    </Grid>
  );
};

const EpidemicParams = ({ params, setParams }) => {
  const handleInputChange = (field) => (event) => {
    let value = event.target.value;
    if (['ηᵍ', 'αᵍ', 'μᵍ', 'θᵍ', 'γᵍ', 'ζᵍ', 'λᵍ', 'ωᵍ', 'ψᵍ', 'χᵍ', 'rᵥ', 'kᵥ'].includes(field)) {
      value = value.split(',').map(Number);
    } else {
      value = Number(value);
    }
    setParams({ ...params, [field]: value });
  };

  return (
    <>
      <Typography variant="h5" gutterBottom>Epidemic Parameters</Typography>
      <Grid container spacing={2}>
        <Grid item xs={4}>
          <TextField
            fullWidth
            label="Scale β"
            type="number"
            value={params.scale_β}
            onChange={handleInputChange('scale_β')}
          />
        </Grid>
        <Grid item xs={4}>
          <TextField
            fullWidth
            label="βᴬ"
            type="number"
            value={params.βᴬ}
            onChange={handleInputChange('βᴬ')}
          />
        </Grid>
        <Grid item xs={4}>
          <TextField
            fullWidth
            label="βᴵ"
            type="number"
            value={params.βᴵ}
            onChange={handleInputChange('βᴵ')}
          />
        </Grid>
        {['ηᵍ', 'αᵍ', 'μᵍ', 'θᵍ', 'γᵍ', 'ζᵍ', 'λᵍ', 'ωᵍ', 'ψᵍ', 'χᵍ'].map((param) => (
          <Grid item xs={4} key={param}>
            <TextField
              fullWidth
              label={param}
              value={params[param].join(', ')}
              onChange={handleInputChange(param)}
            />
          </Grid>
        ))}
        <Grid item xs={4}>
          <TextField
            fullWidth
            label="Λ"
            type="number"
            value={params.Λ}
            onChange={handleInputChange('Λ')}
          />
        </Grid>
        <Grid item xs={4}>
          <TextField
            fullWidth
            label="Γ"
            type="number"
            value={params.Γ}
            onChange={handleInputChange('Γ')}
          />
        </Grid>
        {['rᵥ', 'kᵥ'].map((param) => (
          <Grid item xs={4} key={param}>
            <TextField
              fullWidth
              label={param}
              value={params[param].join(', ')}
              onChange={handleInputChange(param)}
            />
          </Grid>
        ))}
        <Grid item xs={4}>
          <TextField
            fullWidth
            label="Risk Reduction DD"
            type="number"
            value={params.risk_reduction_dd}
            onChange={handleInputChange('risk_reduction_dd')}
          />
        </Grid>
        <Grid item xs={4}>
          <TextField
            fullWidth
            label="Risk Reduction H"
            type="number"
            value={params.risk_reduction_h}
            onChange={handleInputChange('risk_reduction_h')}
          />
        </Grid>
        <Grid item xs={4}>
          <TextField
            fullWidth
            label="Risk Reduction D"
            type="number"
            value={params.risk_reduction_d}
            onChange={handleInputChange('risk_reduction_d')}
          />
        </Grid>
      </Grid>
    </>
  );
};

const InitialConditionUpload = ({ params, setParams }) => {
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setParams({ ...params, initialConditionFile: file });
    }
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <input
            accept=".csv,.json,.nc"
            style={{ display: 'none' }}
            id="initial-condition-file"
            type="file"
            onChange={handleFileUpload}
          />
          <label htmlFor="initial-condition-file">
            <Button variant="contained" component="span">
              Upload Initial Condition File
            </Button>
          </label>
          {params.initialConditionFile && (
            <Typography variant="body2" style={{ marginTop: '10px' }}>
              File selected: {params.initialConditionFile.name}
            </Typography>
          )}
        </Grid>
      </Grid>
    </>
  );
}

const VaccinationParams = ({ params, setParams }) => {
  const handleInputChange = (field) => (event) => {
    let value = event.target.value;
    if (field === 'ϵᵍ') {
      value = value.split(',').map(Number);
    } else if (['percentage_of_vacc_per_day', 'start_vacc', 'dur_vacc'].includes(field)) {
      value = Number(value);
    } else if (field === 'are_there_vaccines') {
      value = event.target.checked;
    }
    setParams({ ...params, [field]: value });
  };

  return (
    <>
      <Typography variant="h5" gutterBottom>Vaccination</Typography>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                checked={params.are_there_vaccines}
                onChange={handleInputChange('are_there_vaccines')}
              />
            }
            label="Enable Vaccination"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="ϵᵍ (Vaccines per day per age group)"
            value={params["ϵᵍ"].join(', ')}
            onChange={handleInputChange('ϵᵍ')}
            disabled={!params.are_there_vaccines}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Percentage of Vaccination per Day"
            type="number"
            value={params.percentage_of_vacc_per_day}
            onChange={handleInputChange('percentage_of_vacc_per_day')}
            disabled={!params.are_there_vaccines}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Start Vaccination Day"
            type="number"
            value={params.start_vacc}
            onChange={handleInputChange('start_vacc')}
            disabled={!params.are_there_vaccines}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Vaccination Duration (days)"
            type="number"
            value={params.dur_vacc}
            onChange={handleInputChange('dur_vacc')}
            disabled={!params.are_there_vaccines}
          />
        </Grid>
      </Grid>
    </>
  );
};

const NPIParams = ({ params, setParams }) => {
  const handleInputChange = (field) => (event) => {
    const value = event.target.value.split(',').map(Number);
    setParams({ ...params, [field]: value });
  };

  return (
    <>
      <Typography variant="h5" gutterBottom>Non-Pharmaceutical Interventions</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="κ₀s: Mobility reduction factor"
            value={params["κ₀s"].join(', ')}
            onChange={handleInputChange('κ₀s')}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="ϕs: Confined household permeability factor"
            value={params.ϕs.join(', ')}
            onChange={handleInputChange('ϕs')}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="δs: Social distancing factor"
            value={params.δs.join(', ')}
            onChange={handleInputChange('δs')}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="t��s: Timesteps at which confinement (lockdown) is applied"
            value={params.tᶜs.join(', ')}
            onChange={handleInputChange('tᶜs')}
          />
        </Grid>
        {/* Add other NPI fields similarly */}
      </Grid>
    </>
  );
};

export {
  InitialConditionUpload,
  EpidemicParams,
  GeneralParams,
  VaccinationParams,
  NPIParams
};