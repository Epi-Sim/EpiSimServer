import React, { useState, useEffect } from 'react';
import { Container, Paper, Typography, Stack, Button, CircularProgress, Link as MuiLink, List, ListItem, ListItemText, Box } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { styled } from '@mui/material/styles';
import { EngineOption } from './types/paramsTypes';

const Input = styled('input')({
  display: 'none',
});

const Home = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [engines, setEngines] = useState<EngineOption[]>([]);

  useEffect(() => {
    fetch('/engine_options')
      .then(response => response.json())
      .then(data => setEngines(data))
      .catch(error => console.error('Error fetching engine options:', error));
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      setError(null);

      try {
        const response = await fetch('/check_file_exists', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ filename: selectedFile.name }),
        });
        const data = await response.json();
        if (data.exists) {
          setShowWarning(true);
          setFileId(data.file_id);
        } else {
          setShowWarning(false);
          setFileId(null);
        }
      } catch (error) {
        console.error('Error checking file existence:', error);
        setError('Error checking file existence');
      }
    }
  };

  const uploadFile = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('simulation_file', file);
    if (fileId) {
      formData.append('file_id', fileId);
    }

    try {
      const response = await fetch('/upload_simulation', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        window.location.href = `/dash/results/${data.file_id}`;
      } else {
        setError(data.error || 'Error uploading file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Error uploading file');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} style={{ padding: '20px', marginTop: '20px' }}>
        <Stack spacing={3}>
          <Typography variant="h4" gutterBottom>Welcome to EpiSim</Typography>

          <Typography variant="body1">
            EpiSim is an interface for executing Julia-based epidemic models.
            It currently supports two extended SEIR models.
            The interface is available as a CLI or a web app.
          </Typography>

          <Box>
            <Typography variant="body1">
              Available simulation engines:
            </Typography>
            <List sx={{ padding: 0 }}>
              {engines.map((engine: EngineOption, index) => (
                <ListItem key={index}>
                  <ListItemText primary={engine.name} secondary={engine.description} />
                </ListItem>
              ))}
            </List>
          </Box>

          <MuiLink href="/setup" underline="none">
            <Button variant="contained" color="primary">
              Set Up New Model
            </Button>
          </MuiLink>

          <Typography variant="h6">Or upload a simulation output file:</Typography>

          <label htmlFor="upload-file">
            <Input
              id="upload-file"
              type="file"
              accept=".nc,.nc.gz"
              onChange={handleFileChange}
            />
            <Button
              variant="outlined"
              component="span"
              startIcon={<UploadFileIcon />}
            >
              Select File
            </Button>
          </label>

          {file && (
            <Typography>
              Selected file: {file.name}
            </Typography>
          )}

          {showWarning && (
            <Paper elevation={2} style={{ padding: '10px', backgroundColor: '#fff3e0' }}>
              <Typography>This file may be a duplicate. What would you like to do?</Typography>
              <Stack direction="row" spacing={2} mt={2}>
                <Button variant="contained" color="warning" onClick={uploadFile}>
                  Replace
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => window.location.href = `/dash/results/${fileId}`}
                >
                  Use Existing
                </Button>
              </Stack>
            </Paper>
          )}

          {!showWarning && file && (
            <Button
              variant="contained"
              color="primary"
              onClick={uploadFile}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Upload and View Results'}
            </Button>
          )}

          {error && (
            <Typography color="error">
              {error}
            </Typography>
          )}
        </Stack>
      </Paper>
    </Container>
  );
};

export default Home;