import React from 'react';
import { createRoot } from 'react-dom/client';
import Home from '../Home';

const root = createRoot(document.getElementById('root')!);
root.render(<Home />);