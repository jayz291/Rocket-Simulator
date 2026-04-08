import type { StageData, PlanetData } from "./types.js";
const G = 6.6743e-11;

const getInputValue = (id: string): number => {
    const element = document.getElementById(id) as HTMLInputElement;
    return parseFloat(element.value);
};

export function getPlanetData() {
    return {
        planetMass: getInputValue('planetMass'),
        planetRadius: getInputValue('planetRadius') * 1000,
        atmosphereThickness: getInputValue('atmosphereThickness') * 1000,
        airDensity: getInputValue('airDensity'),
        scaleHeight: getInputValue('scaleHeight') * 1000,
    };
}

export function getRocketData() {
    const radius = getInputValue('rocketRadius');
    const mass = getInputValue('rocketMass');
    
    return {
        rocketRadius: radius,
        rocketMass: mass,
        fuelMass: getInputValue('fuelMass'),
        fuelConsumptionRate: getInputValue('fuelConsumptionRate'),
        thrustForce: getInputValue('thrustForce'),
        originalFuelMass: mass, 
        crossSectionalArea: Math.PI * (radius ** 2)
    };
}

export class SimulationData {
    currentHeight: number;
    velocity: number;
    planetMass!: number;
    planetRadius!: number;
    escapeVelocity: number;
    currentStageIndex: number;
    time: number;
    finished: boolean;
    atmosphereThickness!: number;
    airDensity!: number;
    scaleHeight!: number;
    crossSectionalArea!: number;
    totalMass!: number;
    stages: StageData[];
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
    updateStats(data: PlanetData) {
        this.planetMass = data.planetMass;
        this.planetRadius = data.planetRadius;
        this.atmosphereThickness = data.atmosphereThickness;
        this.airDensity = data.airDensity;
        this.scaleHeight = data.scaleHeight;
        this.currentStageIndex = 0;
        this.calculateRocketMass();

        this.escapeVelocity = (2 * G * this.planetMass / this.planetRadius) ** (1 / 2);
        this.crossSectionalArea = this.stages[0]!.crossSectionalArea;
        this.velocity = 0;
        this.time = 0;
        this.finished = false;

        console.log(this);
    }
    calculateRocketMass() {
        this.totalMass = 0;
        for (let i = this.currentStageIndex; i < this.stages.length; i++) {
            this.totalMass += this.stages[i]!.rocketMass + this.stages[i]!.fuelMass;
        }
    }
    updatePhysics(deltaTime: number) {
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
            
            if (currentStage!.fuelMass > 0) {
                force = currentStage!.thrustForce - gravity * this.totalMass - 0.5 *
                currentAirDensity * currentStage!.crossSectionalArea * (this.velocity ** 2) * Math.sign(this.velocity);
            } else {
                force = -gravity * this.totalMass - 0.5 *
                currentAirDensity * currentStage!.crossSectionalArea * (this.velocity ** 2) * Math.sign(this.velocity);
            }
            //console.log(force);
            
            acceleration = force / this.totalMass;
            this.velocity += deltaTime * acceleration;
            this.currentHeight = Math.max(this.currentHeight + this.velocity * deltaTime, 0);
            currentStage!.fuelMass = Math.max(currentStage!.fuelMass - currentStage!.fuelConsumptionRate * deltaTime, 0);
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
    updateDroppedStagesPhysics(deltaTime: number, stage: any, stageIndex: number) {
        let currentHeight = stage.mesh.position.y;
        if (currentHeight > this.stages[stageIndex]!.rocketRadius * 6) {
            let currentAirDensity, gravity, force, acceleration;
            if (this.currentHeight < this.atmosphereThickness) {
                currentAirDensity = this.airDensity * Math.E ** (-currentHeight / this.scaleHeight);
            } else {
                currentAirDensity = 0;
            }
            gravity = G * this.planetMass / ((this.planetRadius + currentHeight) ** 2);
            force = -gravity * this.stages[stageIndex]!.rocketMass - /*0.5 **/
                currentAirDensity * this.stages[stageIndex]!.crossSectionalArea * (stage.velocity ** 2) * Math.sign(stage.velocity);
                     acceleration = force / this.stages[stageIndex]!.rocketMass;
            stage.velocity += deltaTime * acceleration;
            stage.mesh.position.y = Math.max(currentHeight + stage.velocity * deltaTime, 0);
        }
    }
}