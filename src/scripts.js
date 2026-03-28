
import { Rocket } from "./rocket.js"
import { SceneManager } from "./scene.js"

const altitudeStat = document.getElementById('altitude');
const velocityStat = document.getElementById('velocity');
const timeStat = document.getElementById('time');
const G = 6.6743e-11;

export class RocketSimulator {
    constructor(simulation) {
        this.simulation = simulation;
        this.sceneManager = new SceneManager(simulation);
        this.detachedStages = [];
        this.previousStageIndex = 0;
        this.animate = this.animate.bind(this);
        this.animate();
    }
    animate() {
        requestAnimationFrame(this.animate);
        let currentStage = this.simulation.stages[this.simulation.currentStageIndex];
        if (this.simulating && this.simulation && !this.simulation.finished) {
            let previousHeight = this.simulation.currentHeight;
            this.simulation.updatePhysics(0.016);
            let deltaY = this.simulation.currentHeight - previousHeight;
            this.sceneManager.updatePosition(this.simulation, deltaY);
            if (this.simulation.currentStageIndex > this.previousStageIndex) {
                this.detachStage(this.previousStageIndex);
                this.previousStageIndex = this.simulation.currentStageIndex;
            }
        } else {
            this.simulating = false;
        }
        if (this.simulating || this.simulation.currentHeight != 0) {
            startButton.disabled = true;
        }
        altitudeStat.textContent = this.simulation.currentHeight.toFixed(5);
        velocityStat.textContent = this.simulation.velocity.toFixed(5);
        timeStat.textContent = this.simulation.time.toFixed(2);
        let alpha = this.simulation.currentHeight / this.simulation.atmosphereThickness;
        this.sceneManager.setBackgroundColor(alpha);

        const hasThrust = this.simulating && currentStage.fuelMass > 0;
        this.sceneManager.rocket.updateParticles(hasThrust, currentStage.rocketRadius);
        for (let i = 0; i < this.detachedStages.length; i++) {
            this.simulation.updateDroppedStagesPhysics(0.016, this.detachedStages[i], i);
        }
        this.sceneManager.renderUpdate();
    }
    updateRocket(newRadius, stageIndex = 0) {
        this.sceneManager.scene.remove(this.sceneManager.rocket.mesh);
        this.simulation.stages[stageIndex].rocketRadius = newRadius;
        this.sceneManager.rocket = new Rocket(this.simulation.stages);
        this.sceneManager.scene.add(this.sceneManager.rocket.mesh);
    }
    detachStage(stageIndex) {
        const detachedStage = this.sceneManager.rocket.separateStage(stageIndex, this.simulation.stages);
        if (!detachedStage) {
            return;
        }
        this.sceneManager.scene.add(detachedStage);
    
        this.detachedStages.push({
            mesh: detachedStage,
            velocity: this.simulation.velocity
        });
    }
    resetSimulation() {
        this.simulation.currentHeight = 0;
        this.simulation.velocity = 0;
        this.simulation.time = 0;
        for (let i = 0; i < this.simulation.stages.length; i++) {
            this.simulation.stages[i].fuelMass = this.simulation.stages[i].originalFuelMass;
        }
        this.detachedStages.forEach(detachedStage => this.sceneManager.scene.remove(detachedStage.mesh));
        this.detachedStages = [];
        this.previousStageIndex = 0;
        this.simulation.currentStageIndex = 0;
        this.sceneManager.resetScene(this.simulation);

        startButton.disabled = false;
        console.log("reset");
        console.log(this.simulation);
    }
}

export function getPlanetData() {
    const planetData = {
        planetMass: parseFloat(document.getElementById('planetMass').value),
        planetRadius: parseFloat(document.getElementById('planetRadius').value) * 1000,
        atmosphereThickness: parseFloat(document.getElementById('atmosphereThickness').value) * 1000,
        airDensity: parseFloat(document.getElementById('airDensity').value),
        scaleHeight: parseFloat(document.getElementById('scaleHeight').value) * 1000,
    }
    return planetData;
}

export function getRocketData() {
    const rocketData = {
        rocketRadius: parseFloat(document.getElementById('rocketRadius').value),
        rocketMass: parseFloat(document.getElementById('rocketMass').value),
        fuelMass: parseFloat(document.getElementById('fuelMass').value),
        fuelConsumptionRate: parseFloat(document.getElementById('fuelConsumptionRate').value),
        thrustForce: parseFloat(document.getElementById('thrustForce').value),
        originalFuelMass: parseFloat(document.getElementById('rocketMass').value),
        crossSectionalArea: Math.PI * parseFloat(document.getElementById('rocketRadius').value) ** 2
    };
    return rocketData;
}

export class Simulation {
    constructor() {
        const planetData = getPlanetData();
        this.currentHeight = 0;
        this.velocity = 0;
        const rocketData = getRocketData();

        this.stages = [];
        this.stages.push(rocketData);
        this.currentStageIndex = 0;
        this.calculateRocketMass();

        this.escapeVelocity = (2 * G * this.planetMass / this.planetRadius) ** (1 / 2);
        this.time = 0;
        this.finished = false;
        this.updateStats(planetData);
    }
    updateStats(data) {
        this.planetMass = data.planetMass;
        this.planetRadius = data.planetRadius;
        this.atmosphereThickness = data.atmosphereThickness;
        this.airDensity = data.airDensity;
        this.scaleHeight = data.scaleHeight;
        this.currentStageIndex = 0;
        this.calculateRocketMass();

        this.escapeVelocity = (2 * G * this.planetMass / this.planetRadius) ** (1 / 2);
        this.crossSectionalArea = this.stages[0].crossSectionalArea;
        this.velocity = 0;
        this.time = 0;
        this.finished = false;

        console.log(this);
    }
    calculateRocketMass() {
        this.totalMass = 0;
        for (let i = this.currentStageIndex; i < this.stages.length; i++) {
            this.totalMass += this.stages[i].rocketMass + this.stages[i].fuelMass;
        }
    }
    updatePhysics(deltaTime) {
        if (!this.finished) {
            let currentAirDensity, gravity, force, acceleration;
            let currentStage = this.stages[this.currentStageIndex];

            if (currentStage && currentStage.fuelMass <= 0 && this.currentStageIndex < this.stages.length - 1) {
                this.currentStageIndex++;
                currentStage = this.stages[this.currentStageIndex];
                
            }
            this.calculateRocketMass();

            if (this.currentHeight < this.atmosphereThickness) {
                currentAirDensity = this.airDensity * Math.E ** (-this.currentHeight / this.scaleHeight);
            } else {
                currentAirDensity = 0;
            }
            gravity = G * this.planetMass / ((this.planetRadius + this.currentHeight) ** 2);
            
            if (currentStage.fuelMass > 0) {
                force = currentStage.thrustForce - gravity * this.totalMass - 0.5 *
                currentAirDensity * currentStage.crossSectionalArea * (this.velocity ** 2) * Math.sign(this.velocity);
            } else {
                force = -gravity * this.totalMass - 0.5 *
                currentAirDensity * currentStage.crossSectionalArea * (this.velocity ** 2) * Math.sign(this.velocity);
            }
            //console.log(force);
            
            acceleration = force / this.totalMass;
            this.velocity += deltaTime * acceleration;
            this.currentHeight = Math.max(this.currentHeight + this.velocity * deltaTime, 0);
            currentStage.fuelMass = Math.max(currentStage.fuelMass - currentStage.fuelConsumptionRate * deltaTime, 0);
            //this.totalMass = Math.max(this.rocketMass + this.fuelMass, this.rocketMass);
            this.time += deltaTime;

            if (this.velocity > this.escapeVelocity && this.currentHeight > 100000000) {
                this.finished = true;
            }
            if (this.time > 2 && this.currentHeight == 0) {
                this.finished = true;
            }
        }
    }
    updateDroppedStagesPhysics(deltaTime, stage, stageIndex) {
        let currentHeight = stage.mesh.position.y;
        if (currentHeight > this.stages[stageIndex].rocketRadius * 6) {
            let currentAirDensity, gravity, force, acceleration;
            if (this.currentHeight < this.atmosphereThickness) {
                currentAirDensity = this.airDensity * Math.E ** (-currentHeight / this.scaleHeight);
            } else {
                currentAirDensity = 0;
            }
            gravity = G * this.planetMass / ((this.planetRadius + currentHeight) ** 2);
            force = -gravity * this.stages[stageIndex].rocketMass - /*0.5 **/
                currentAirDensity * this.stages[stageIndex].crossSectionalArea * (stage.velocity ** 2) * Math.sign(stage.velocity);
                     acceleration = force / this.stages[stageIndex].rocketMass;
            stage.velocity += deltaTime * acceleration;
            stage.mesh.position.y = Math.max(currentHeight + stage.velocity * deltaTime, 0);
        }
    }
}


