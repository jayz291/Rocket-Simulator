import { Simulation } from "./scripts.js";
import { RocketSimulator } from "./scripts.js"
import { getRocketData, getPlanetData } from "./scripts.js"

const currentSimulation = new Simulation();
const rocketSimulator = new RocketSimulator(currentSimulation);

const startButton = document.getElementById("startButton");
const resetButton = document.getElementById("resetButton");
const rocketSizeInput = document.getElementById("rocketRadius");
const stage1RadiusInput = document.getElementById("s1_radius");
const stage2RadiusInput = document.getElementById("s2_radius");
const stage3RadiusInput = document.getElementById("s3_radius");
const singleStageInput = document.getElementById("singleStageInputs");
const multiStageInput = document.getElementById("multiStageInputs");
const singleStageMode = document.getElementById("modeSingle");
const multiStageMode = document.getElementById("modeMulti");
singleStageMode.addEventListener('change', toggleInterface);
multiStageMode.addEventListener('change', toggleInterface);

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
    rocketSizeInput.addEventListener('input', (event) => {
        const newRadius = parseFloat(event.target.value);
        if (!isNaN(newRadius) && newRadius > 0) {
            rocketSimulator.updateRocket(newRadius);
        }
    });
}

if (stage1RadiusInput) {
    stage1RadiusInput.addEventListener('input', (event) => {
        const newRadius = parseFloat(event.target.value);
        if (!isNaN(newRadius) && newRadius > 0) {
            rocketSimulator.simulation.stages[0].rocketRadius = newRadius;
            rocketSimulator.updateRocket(newRadius, 0);
        }
    })
}

if (stage2RadiusInput) {
    stage2RadiusInput.addEventListener('input', (event) => {
        const newRadius = parseFloat(event.target.value);
        if (!isNaN(newRadius) && newRadius > 0) {
            rocketSimulator.simulation.stages[1].rocketRadius = newRadius;
            rocketSimulator.updateRocket(newRadius, 1);
        }
    })
}

if (stage3RadiusInput) {
    stage3RadiusInput.addEventListener('input', (event) => {
        const newRadius = parseFloat(event.target.value);
        if (!isNaN(newRadius) && newRadius > 0) {
            rocketSimulator.simulation.stages[2].rocketRadius = newRadius;
            rocketSimulator.updateRocket(newRadius, 2);
        }
    })
}

function toggleInterface() {
    let currentRadius;
    if (modeMulti.checked) {
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

    if (!modeMulti.checked) {
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

function getStageData(stageNumber) {
    const StageData = {
        rocketRadius: parseFloat(document.getElementById(`s${stageNumber}_radius`).value),
        rocketMass: parseFloat(document.getElementById(`s${stageNumber}_mass`).value),
        fuelMass: parseFloat(document.getElementById(`s${stageNumber}_fuel`).value),
        fuelConsumptionRate: parseFloat(document.getElementById(`s${stageNumber}_burn`).value),
        thrustForce: parseFloat(document.getElementById(`s${stageNumber}_thrust`).value),
        originalFuelMass: parseFloat(document.getElementById(`s${stageNumber}_fuel`).value),
        crossSectionalArea: Math.PI * parseFloat(document.getElementById(`s${stageNumber}_radius`).value) ** 2
    }
    return StageData;
}