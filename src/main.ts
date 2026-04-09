import { SimulationData } from "./data.js";
import { RocketSimulator } from "./simulation.js"
import { getRocketData, getPlanetData } from "./data.js"
import type { StageData } from "./types.js"
import { textureLevel } from "three/tsl";

export const startButton = document.getElementById("startButton") as HTMLButtonElement;
const resetButton = document.getElementById("resetButton") as HTMLButtonElement;
const rocketSizeInput = document.getElementById("rocketRadius") as HTMLInputElement;
const stage1RadiusInput = document.getElementById("s1_radius") as HTMLInputElement;
const stage2RadiusInput = document.getElementById("s2_radius") as HTMLInputElement;
const stage3RadiusInput = document.getElementById("s3_radius") as HTMLInputElement;
const singleStageInput = document.getElementById("singleStageInputs") as HTMLInputElement;
const multiStageInput = document.getElementById("multiStageInputs") as HTMLInputElement;
const singleStageMode = document.getElementById("modeSingle") as HTMLInputElement;
export const multiStageMode = document.getElementById("modeMulti") as HTMLInputElement;
const optionElements = document.querySelectorAll('#options input, #options button');
singleStageMode.addEventListener('change', toggleInterface);
multiStageMode.addEventListener('change', toggleInterface);

const currentSimulation = new SimulationData();
const rocketSimulator = new RocketSimulator(currentSimulation);

startButton.addEventListener('click', () => {
    addData();
    rocketSimulator.resetting = true;
    currentSimulation.finished = false;
    rocketSimulator.simulating = true;
});

resetButton.addEventListener('click', () => {

    currentSimulation.finished = true;
    rocketSimulator.simulating = false;
    rocketSimulator.resetSimulation();

});

if (rocketSizeInput) {
    rocketSizeInput.addEventListener('input', (event: Event) => {
        const target = event.target as HTMLInputElement;
        const newRadius = parseFloat(target.value);
        if (!isNaN(newRadius) && newRadius > 0) {
            rocketSimulator.updateRocket(newRadius);
        }
    });
}

if (stage1RadiusInput) {
    stage1RadiusInput.addEventListener('input', (event: Event) => {
        const target = event.target as HTMLInputElement;
        const newRadius = parseFloat(target.value);
        if (!isNaN(newRadius) && newRadius > 0) {
            rocketSimulator.simulation.stages[0]!.rocketRadius = newRadius;
            rocketSimulator.updateRocket(newRadius, 0);
        }
    })
}

if (stage2RadiusInput) {
    stage2RadiusInput.addEventListener('input', (event: Event) => {
        const target = event.target as HTMLInputElement;
        const newRadius = parseFloat(target.value);
        if (!isNaN(newRadius) && newRadius > 0) {
            rocketSimulator.simulation.stages[1]!.rocketRadius = newRadius;
            rocketSimulator.updateRocket(newRadius, 1);
        }
    })
}

if (stage3RadiusInput) {
    stage3RadiusInput.addEventListener('input', (event: Event) => {
        const target = event.target as HTMLInputElement;
        const newRadius = parseFloat(target.value);
        if (!isNaN(newRadius) && newRadius > 0) {
            rocketSimulator.simulation.stages[2]!.rocketRadius = newRadius;
            rocketSimulator.updateRocket(newRadius, 2);
        }
    })
}

function toggleInterface() {
    let currentRadius: number = 0;
    if (multiStageMode.checked) {
        singleStageInput.style.display = 'none';
        multiStageInput.style.display = 'block';
        if (stage1RadiusInput) {
            currentRadius = parseFloat(stage1RadiusInput.value) || 1;
        }
    } else {
        singleStageInput.style.display = 'block';
        multiStageInput.style.display = 'none';
        if (rocketSizeInput) {
            currentRadius = parseFloat(rocketSizeInput.value) || 1;
        }
    }
    addData();
    if (typeof rocketSimulator !== 'undefined') {
        //console.log(rocketSimulator.simulation);
        rocketSimulator.updateRocket(currentRadius);
    }
}

function addData() {
    const planetData = getPlanetData();
    currentSimulation.stages = [];

    if (!multiStageMode.checked) {
        const rocketData = getRocketData();
        currentSimulation.stages.push(rocketData);
    } else {
        const stage1Data = getStageData(1);
        const stage2Data = getStageData(2);
        const stage3Data = getStageData(3);

        currentSimulation.stages.push(stage1Data);
        currentSimulation.stages.push(stage2Data);
        currentSimulation.stages.push(stage3Data);
    }
    currentSimulation.updateStats(planetData);
}

function getStageData(stageNumber: number): StageData {
    const getInputValue = (idSuffix: string): number => {
        const id = `s${stageNumber}_${idSuffix}`;
        const element = document.getElementById(id) as HTMLInputElement;
        return parseFloat(element.value);
    };

    const radius = getInputValue('radius');
    const fuelMass = getInputValue('fuel');

    return {
        rocketRadius: radius,
        rocketMass: getInputValue('mass'),
        fuelMass: fuelMass,
        fuelConsumptionRate: getInputValue('burn'),
        thrustForce: getInputValue('thrust'),
        originalFuelMass: fuelMass,
        crossSectionalArea: Math.PI * (radius ** 2)
    };
}

export function disableAllButtons() {
    optionElements.forEach(element => {
        if (element.id !== 'resetButton') {
            (element as HTMLInputElement | HTMLButtonElement).disabled = true;
        }
    })
}

export function enableAllButtons() {
    optionElements.forEach(element => {
        if (element.id !== 'resetButton') {
            (element as HTMLInputElement | HTMLButtonElement).disabled = false;
        }
    })
}