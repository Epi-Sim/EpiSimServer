import React, { useState } from 'react';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import parseISO from 'date-fns/parseISO';
import format from 'date-fns/format';
import FileUpload from './FileUpload';
import PopulationMapEditor from './PopulationMapEditor';
import { SimulationConfig, EngineOption, BackendEngine, Config } from './types/paramsTypes';

interface GeneralProps {
  params: SimulationConfig;
  setParams: (params: SimulationConfig) => void;
  engineOptions: EngineOption[];
  backendEngine: BackendEngine;
  setBackendEngine: (backendEngine: BackendEngine) => void;
}

// set logical default dates for covid
const defaultStartDate = "2020-01-01";
const defaultEndDate = "2020-06-01";

const dateDiff = (startDate: Date, endDate: Date) => {
  return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
}

const GeneralParams: React.FC<GeneralProps> = ({ params, setParams, engineOptions, backendEngine, setBackendEngine }) => {
  // Parse initial date values
  const [startDate, setStartDate] = useState(
    params.start_date ? parseISO(params.start_date) : parseISO(defaultStartDate)
  );
  const [endDate, setEndDate] = useState(
    params.end_date ? parseISO(params.end_date) : parseISO(defaultEndDate)
  );

  // Add new state variable for saveTimeStep checkbox and value
  const maxSaveTimeStep = React.useMemo(() => dateDiff(startDate, endDate), [startDate, endDate]);
  const [saveTimeStepEnabled, setSaveTimeStepEnabled] = useState(!!params.save_time_step);
  const [saveTimeStepValue, setSaveTimeStepValue] = useState(params.save_time_step || maxSaveTimeStep);

  // Handler functions for updating params
  const handleDateChange = (field) => (date) => {
    if (field === 'start_date') setStartDate(date);
    if (field === 'end_date') setEndDate(date);
    setParams({ ...params, [field]: format(date, 'yyyy-MM-dd') });
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
          value={backendEngine}
          onChange={(event) => 
            setBackendEngine(event.target.value as BackendEngine)
          }
        >
          {engineOptions.map((engine, index) => (
            <MenuItem key={index} value={engine.name}>{engine.name}</MenuItem>
          ))}
        </TextField>
      </Grid>
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

const InitialConditionUpload = ({ file, setFile }) => {
  const fileSample = {
    sample: `<xarray.Dataset> Size: 76MB
Dimensions:     (epi_states: 10, V: 3, T: 37, M: 2850, G: 3)
Coordinates:
  * G           (G) <U1 12B 'Y' 'M' 'O'
  * T           (T) datetime64[ns] 296B 2020-03-10 2020-03-11 ... 2020-04-15
  * V           (V) <U2 24B 'NV' 'V' 'PV'
  * epi_states  (epi_states) <U2 80B 'S' 'E' 'A' 'I' 'PH' 'PD' 'HR' 'HD' 'R' 'D'
  * M           (M) <U10 114kB '01001_AM' '01002' ... '5200107' '5200108'
Data variables:
  data        (epi_states, V, T, M, G) float64 76MB ...`,
    formats: ['.nc']
  };

  return (
      <FileUpload
        label="Upload Initial Condition File"
        onFileChange={(file: File) => setFile(file)}
        selectedFile={file}
        FileSample={fileSample}
      />
  );
}

const MetapopulationUpload = ({ file, setFile, mapData, onMapDataChange }) => {
  const [isMapEditorOpen, setIsMapEditorOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);

  const handleFeatureClick = (feature) => {
    setSelectedFeature(feature);
  };

  const fileSample = {
    sample: `id,area,Y,M,O,Total
01001_AM,358495702.254284,1065,4747,3102,8914
01002,96152612.3784106,2470,5916,2117,10503
01010_AM,198919890.011614,1554,3583,1263,6400`,
    formats: ['.csv']
  };

  return (
    <Stack spacing={2} direction="row">
      <FileUpload
          label="Upload Population Data File"
          onFileChange={(file: File) => setFile(file)}
          selectedFile={file}
          FileSample={fileSample}
        />
        <Button variant="contained" onClick={() => setIsMapEditorOpen(true)}>
          Edit Map
        </Button>
        <Dialog
          open={isMapEditorOpen}
          onClose={() => setIsMapEditorOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>Edit Population Map</DialogTitle>
          <DialogContent>
            <PopulationMapEditor
              mapData={mapData}
              onMapDataChange={onMapDataChange}
              onFeatureClick={handleFeatureClick}
            />
          </DialogContent>
        </Dialog>
    </Stack>
  );
}

const PopulationMobilityUpload = ({ file, setFile }) => {
  const fileSample = {
    sample: `source_idx,target_idx,ratio
1,1,0.15384793162874416
1,3,0.002993247160170764
1,6,0.01013232372521305`,
    formats: ['.csv']
  };

  return (
      <FileUpload
        label="Upload Population Mobility File"
        onFileChange={(file: File) => setFile(file)}
        selectedFile={file}
        FileSample={fileSample}
      />
  );
};

const MobilityReductionUpload = ({ file, setFile }) => {
  const fileSample = {
    sample: `date,reduction,datetime,time
2020-03-16,0.5053579375294793,2020-03-16,36
2020-03-17,0.5277371481621038,2020-03-17,37
2020-03-18,0.5326431034118155,2020-03-18,38`,
    formats: ['.csv']
  };

  return (
    <FileUpload
      label="Upload Mobility Reduction File"
      onFileChange={(file: File) => setFile(file)}
      selectedFile={file}
      FileSample={fileSample}
    />
  );
};

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

  // Ensure all required fields are initialized
  const npiParams = {
    "κ₀s": params["κ₀s"] || [],
    "ϕs": params["ϕs"] || [],
    "δs": params["δs"] || [],
    "tᶜs": params["tᶜs"] || [],
  };

  return (
    <>
      <Typography variant="h5" gutterBottom>Non-Pharmaceutical Interventions</Typography>
      <Grid container spacing={2}>
        {Object.entries(npiParams).map(([field, value]) => (
          <Grid item xs={12} key={field}>
            <TextField
              fullWidth
              label={`${field}: ${getFieldLabel(field)}`}
              value={value.join(', ')}
              onChange={handleInputChange(field)}
            />
          </Grid>
        ))}
      </Grid>
    </>
  );
};

// Helper function to get field labels
const getFieldLabel = (field) => {
  const labels = {
    "κ₀s": "Mobility reduction factor",
    "ϕs": "Confined household permeability factor",
    "δs": "Social distancing factor",
    "tᶜs": "Timesteps at which confinement (lockdown) is applied",
  };
  return labels[field] || "";
};

interface ConfigUploadProps {
  configFile: File | null;
  setConfigFile: (configFile: File, config: Config) => void;
  configFileSample: {
    sample: string;
    formats: string[];
  };
}

const ConfigUpload = ({ configFile, setConfigFile, configFileSample }: ConfigUploadProps) => {
  const handleConfigUpload = (file: File, fileContent: string) => {
    const json = parseConfigFile(fileContent) as Config;
    if (json) {
      setConfigFile(file, json);
    } else {
      console.error("Invalid config file");
    }
  };

  const parseConfigFile = (fileContent: string) => {
    try {
      const json = JSON.parse(fileContent);
      const sample = JSON.parse(configFileSample.sample);
      console.log(json)
      const keyMatch = Object.entries(sample).every(([key, value]) => 
        key in json && typeof json[key] === typeof value
      );
      if (!keyMatch) {
        return false;
      }
      return json;
    } catch (error) {
      return false;
    }
  };

  return (
    <FileUpload
      label="Upload Config"
      onFileChange={handleConfigUpload}
      selectedFile={configFile}
      FileSample={configFileSample}
    />
  );
};

const ParameterUpload = ({ 
  initialConditionsFile, 
  setInitialConditionsFile,
  populationFile,
  setPopulationFile,
  mobilityFile,
  setMobilityFile,
  mobilityReductionFile,
  setMobilityReductionFile,
  configFile,
  setConfigFile,
  configFileSample,
  mapData,
  onMapDataChange
}) => {
  return (
    <Stack spacing={2}>
      <ConfigUpload
        configFile={configFile}
        setConfigFile={setConfigFile}
        configFileSample={configFileSample}
      />
      <InitialConditionUpload
        file={initialConditionsFile}
        setFile={setInitialConditionsFile}
      />
      <MetapopulationUpload
        file={populationFile}
        setFile={setPopulationFile}
        mapData={mapData}
        onMapDataChange={onMapDataChange}
      />
      <PopulationMobilityUpload
        file={mobilityFile}
        setFile={setMobilityFile}
      />
      <MobilityReductionUpload
        file={mobilityReductionFile}
        setFile={setMobilityReductionFile}
      />
    </Stack>
  );
};

export {
  ParameterUpload,
  EpidemicParams,
  GeneralParams,
  VaccinationParams,
  NPIParams
};