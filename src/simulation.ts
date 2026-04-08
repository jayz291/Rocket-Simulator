
import { Rocket } from "./rocket.js";
import { SceneManager } from "./scene.js";
import { startButton } from "./main.js";
import { SimulationData } from "./data.js";

const altitudeStat = document.getElementById('altitude') as HTMLSpanElement;
const velocityStat = document.getElementById('velocity') as HTMLSpanElement;
const timeStat = document.getElementById('time') as HTMLSpanElement;

export class RocketSimulator {
    simulation: SimulationData;
    sceneManager: SceneManager;
    previousStageIndex: number;
    simulating!: boolean;
    resetting!: boolean;
    detachedStages: any [];
    constructor(simulation: SimulationData) {
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

        const hasThrust = this.simulating && currentStage!.fuelMass > 0;
        this.sceneManager.rocket.updateParticles(hasThrust, currentStage!.rocketRadius);
        for (let i = 0; i < this.detachedStages.length; i++) {
            this.simulation.updateDroppedStagesPhysics(0.016, this.detachedStages[i], i);
        }
        this.sceneManager.renderUpdate();
    }
    updateRocket(newRadius: number, stageIndex = 0) {
        this.sceneManager.scene.remove(this.sceneManager.rocket.mesh);
        this.simulation.stages[stageIndex]!.rocketRadius = newRadius;
        this.sceneManager.rocket = new Rocket(this.simulation.stages);
        this.sceneManager.scene.add(this.sceneManager.rocket.mesh);
    }
    detachStage(stageIndex: number) {
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
            this.simulation.stages[i]!.fuelMass = this.simulation.stages[i]!.originalFuelMass;
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



