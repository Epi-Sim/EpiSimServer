import React from 'react';
import { Button, Typography, Grid, Tooltip } from '@mui/material';

const FileUpload = ({ label, accept, onFileChange, selectedFile, FileSample }) => {
  return (
    <Grid item xs={12} container alignItems="center">
      <input
        accept={accept}
        style={{ display: 'none' }}
        id={`${label}-file`}
        type="file"
        onChange={onFileChange}
      />
      <label htmlFor={`${label}-file`}>
        <Button variant="contained" component="span">
          {label}
        </Button>
      </label>
      {selectedFile && (
        <Typography variant="body2" style={{ marginTop: '10px' }}>
          File selected: {selectedFile.name}
        </Typography>
      )}
      {FileSample && (
        <div style={{ display: 'inline-block', marginLeft: '10px' }}>
          <Typography variant="body2" style={{ color: 'gray' }}>
            Accepted File Formats: {FileSample.formats.join(', ')}
          </Typography>
          <Tooltip title={<pre style={{ whiteSpace: 'pre-wrap', maxWidth: '800px' }}>{FileSample.sample}</pre>} arrow>
            <Typography variant="body2" style={{ color: 'blue', cursor: 'pointer' }}>
              (Hover for example structure)
            </Typography>
          </Tooltip>
        </div>
      )}
    </Grid>
  );
};

export default FileUpload;