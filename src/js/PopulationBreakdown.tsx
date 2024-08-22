import React, { useState } from 'react';
import { Slider, Typography, Button } from '@mui/material';
import { AgeCompartments } from './types/mapTypes';
interface Props {
    id?: string;
    name?: string;
    population: AgeCompartments;
    onPopulationChange: (population: AgeCompartments) => void;
}

const PopulationBreakdown: React.FC<Props> = ({ id, name, population, onPopulationChange }) => {
    const [totalPopulation, setTotalPopulation] = useState(population.Y + population.M + population.O);
    const [newPopulation, setNewPopulation] = useState({ ...population });

    const handleSliderChange = (group) => (event, newValue) => {
        const updatedPopulation = { ...newPopulation };
        const newValueAdjusted = Math.round(totalPopulation * newValue / 100);
        const difference = newValueAdjusted - updatedPopulation[group];
        updatedPopulation[group] = newValueAdjusted;

        const otherGroups = ['Y', 'M', 'O'].filter(g => g !== group);
        const totalOtherGroups = otherGroups.reduce((sum, g) => sum + updatedPopulation[g], 0);

        if (totalOtherGroups > 0) {
            otherGroups.forEach((g, index) => {
                if (index === otherGroups.length - 1) {
                    updatedPopulation[g] = Math.max(0, totalPopulation - updatedPopulation[group] - updatedPopulation[otherGroups[0]]);
                } else {
                    const adjustment = Math.round((updatedPopulation[g] / totalOtherGroups) * -difference);
                    updatedPopulation[g] = Math.max(0, updatedPopulation[g] + adjustment);
                }
            });
        } else {
            // If all other groups are 0, distribute the remaining population equally
            const remainingPopulation = totalPopulation - updatedPopulation[group];
            const equalShare = Math.floor(remainingPopulation / 2);
            otherGroups.forEach((g, index) => {
                updatedPopulation[g] = index === 0 ? equalShare : remainingPopulation - equalShare;
            });
        }

        setNewPopulation(updatedPopulation);
    };

    const handleTotalPopulationChange = (e) => {
        const newTotal = Number(e.target.value) || 0;
        setTotalPopulation(newTotal);
        const currentTotal = newPopulation.Y + newPopulation.M + newPopulation.O;
        if (currentTotal === 0) {
            // If current total is 0, distribute evenly
            const equalShare = Math.floor(newTotal / 3);
            setNewPopulation({
                Y: equalShare,
                M: equalShare,
                O: newTotal - 2 * equalShare // Assign remainder to O
            });
        } else {
            const updatedPopulation = {
                Y: Math.round((newPopulation.Y / currentTotal) * newTotal),
                M: Math.round((newPopulation.M / currentTotal) * newTotal),
                O: Math.round((newPopulation.O / currentTotal) * newTotal),
            };
            // Adjust for rounding errors
            const sum = updatedPopulation.Y + updatedPopulation.M + updatedPopulation.O;
            if (sum !== newTotal) {
                updatedPopulation.O += newTotal - sum;
            }
            setNewPopulation(updatedPopulation);
        }
    };

    const handleSave = () => {
        onPopulationChange(newPopulation);
    };

    const percentage = (value) => value === 0 ? 0 : Math.round((value / totalPopulation) * 100);

    return (
        <div>
            <Typography variant="h6">
                {name ?? 'Total Population'}
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
                        value={percentage(newPopulation[group])}
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