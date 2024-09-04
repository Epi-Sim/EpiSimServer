import React, { useState } from 'react';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Box from '@mui/material/Box';

interface FileSample {
  sample: string;
  formats: string[];
}

interface FileUploadProps {
  label: string;
  onFileChange: (file: File, fileContent: string) => void;
  selectedFile: File | null;
  FileSample: FileSample | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ label, onFileChange, selectedFile, FileSample }) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      // register the readfile callback
      reader.onload = (e) => {
        try {
          // crash if there is no file content
          const fileContent = e.target!.result! as string;
          console.log("file present")
          onFileChange(file, fileContent);
        } catch (error) {
          console.error('Error reading file:', error);
          // Optionally, you can show an error message to the user here
        } finally {
          setIsUploading(false);
        }
      };
      console.log("reading file upload")
      // actually read the file
      reader.readAsText(file);
    }
  };

  const accept = FileSample?.formats.join(',');

  return (
    <Box display="flex" alignItems="center" justifyContent="flex-start" sx={{ gap: 1 }}>
      <input
        accept={accept}
        style={{ display: 'none' }}
        id={`${label}-file`}
        type="file"
        onChange={handleFileChange}
      />
      <label htmlFor={`${label}-file`}>
        <Button variant="contained" component="span" disabled={isUploading}>
          {label}
        </Button>
      </label>
      {isUploading ? (
        <CircularProgress size={24} />
      ) : selectedFile ? (
        <CheckCircleIcon color="success" />
      ) : null}
      {FileSample && (
        <Typography variant="body2" color="gray">
          ({accept})
          <Tooltip title={FileSample.sample}>
            <InfoIcon />
          </Tooltip>
        </Typography>
      )}
    </Box>
  );
};

export default FileUpload;