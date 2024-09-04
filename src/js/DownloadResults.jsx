import React from 'react';
import Button from '@mui/material/Button';
import { Buffer } from 'buffer';


const DownloadResults = ({ data }) => {
  const handleDownload = () => {
    const decodedData = Buffer.from(data, 'base64');
    const blob = new Blob([decodedData], { type: 'application/x-netcdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'simulation_results.nc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="contained" color="secondary" onClick={handleDownload}>
      Download Results
    </Button>
  );
};

export default DownloadResults;