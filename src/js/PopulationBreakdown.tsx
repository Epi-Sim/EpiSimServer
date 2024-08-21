import React, { useState } from 'react';
import { Slider, Typography, Button } from '@mui/material';

interface PopulationBreakdownProps {
    feature: {
        properties: {
            name: string;
            Y: number;
            M: number;
            O: number;
        };
    };
}

const PopulationBreakdown = ({ population, onPopulationChange }) => {
    const [totalPopulation, setTotalPopulation] = useState(population.Y + population.M + population.O);
    const [newPopulation, setNewPopulation] = useState({ ...population });

    const handleSliderChange = (group) => (event, newValue) => {
        const updatedPopulation = { ...newPopulation };
        updatedPopulation[group] = Math.round(totalPopulation * newValue / 100);
        setNewPopulation(updatedPopulation);
    };

    const handleTotalPopulationChange = (e) => {
        const newTotal = Number(e.target.value);
        setTotalPopulation(newTotal);
        const updatedPopulation = {
            Y: Math.round((population.Y / (population.Y + population.M + population.O)) * newTotal),
            M: Math.round((population.M / (population.Y + population.M + population.O)) * newTotal),
            O: Math.round((population.O / (population.Y + population.M + population.O)) * newTotal),
        };
        setNewPopulation(updatedPopulation);
    };

    const handleSave = () => {
        onPopulationChange(newPopulation);
    };

    return (
        <div>
            <Typography variant="h6">Population Breakdown</Typography>
            <Typography variant="body1">Total Population: 
                <input 
                    type="number" 
                    value={totalPopulation} 
                    onChange={handleTotalPopulationChange} 
                />
            </Typography>
            <div style={{ width: '100%' }}>
                {['Y', 'M', 'O'].map((group) => (
                    <Slider
                        key={group}
                        value={(newPopulation[group] / totalPopulation) * 100}
                        onChange={handleSliderChange(group)}
                        aria-labelledby={`${group}-slider`}
                        valueLabelDisplay="auto"
                        style={{ color: group === 'Y' ? 'lightblue' : group === 'M' ? 'lightgreen' : 'lightcoral' }}
                    />
                ))}
            </div>
            <Button variant="contained" onClick={handleSave}>Save</Button>
        </div>
    );
};


export default PopulationBreakdown;