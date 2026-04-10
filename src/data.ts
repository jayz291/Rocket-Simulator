import * as THREE from 'three';
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
    /* ---Constants throughout the simulation---- */
    planetMass!: number;
    planetRadius!: number;
    planetCentre!: THREE.Vector3;
    escapeVelocity: number;
    currentStageIndex: number;
    atmosphereThickness!: number;
    airDensity!: number;
    scaleHeight!: number;
    crossSectionalArea!: number;
    stages: StageData[];
    /* ---Changing values---- */
    velocity: THREE.Vector3;
    velocityMagnitude!: number;
    acceleration!: THREE.Vector3;
    directionVector!: THREE.Vector3;
    position!: THREE.Vector3;
    gravityMagnitude!: number;
    gravityForce!: THREE.Vector3;
    totalMass!: number;
    airResistanceMagnitude!: number;
    airResistanceForce!: THREE.Vector3;
    thrustForce!: THREE.Vector3;
    totalForce!: THREE.Vector3;
    currentHeight: number;
    finished: boolean;
    time: number;
    currentAirDensity!: number;
    constructor() {
        const planetData = getPlanetData();
        this.currentHeight = 0;
        //this.velocity = 0;
        this.velocity = new THREE.Vector3(0, 0, 0);
        const rocketData = getRocketData();

        this.stages = [];
        this.stages.push(rocketData);
        this.currentStageIndex = 0;
        this.calculateRocketMass();

        this.escapeVelocity = (2 * G * this.planetMass / this.planetRadius) ** (1 / 2);
        this.time = 0;
        this.finished = false;
        this.updateStats(planetData);
        this.planetCentre = new THREE.Vector3(0, -this.planetRadius, 0);
        //this.directionVector = new THREE.Vector3().subVectors(this.position, this.planetCentre);
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
        //this.velocity = 0;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.time = 0;
        this.finished = false;
        this.position = new THREE.Vector3();

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
            const rocketPos = this.position.clone();
            this.directionVector = new THREE.Vector3().subVectors(rocketPos, this.planetCentre);
            const rHat = this.directionVector.normalize();
            //let velocityMagnitude;
            let currentStage = this.stages[this.currentStageIndex];

            if (currentStage && currentStage.fuelMass <= 0 && this.currentStageIndex < this.stages.length - 1) {
                this.currentStageIndex++;
                currentStage = this.stages[this.currentStageIndex];
                
            }
            this.calculateRocketMass();
            this.calculateCurrentHeight();
            

            if (this.currentHeight < this.atmosphereThickness) {
                this.currentAirDensity = this.airDensity * Math.E ** (-this.currentHeight / this.scaleHeight);
            } else {
                this.currentAirDensity = 0;
            }
            this.gravityMagnitude = G * this.planetMass / ((this.planetRadius + this.currentHeight) ** 2);
            this.gravityForce = rHat.clone().multiplyScalar(-this.gravityMagnitude * this.totalMass);
            this.velocityMagnitude = this.velocity.length();
            const vHat = this.velocity.clone().normalize();
            
            this.airResistanceMagnitude = 0.5 * this.currentAirDensity * currentStage!.crossSectionalArea * 
                (this.velocityMagnitude ** 2);
            this.airResistanceForce = vHat.clone().multiplyScalar(-this.airResistanceMagnitude);
            this.thrustForce = this.directionVector.clone().multiplyScalar(currentStage!.thrustForce);
            if (currentStage!.fuelMass > 0) {
                this.totalForce = new THREE.Vector3().add(this.airResistanceForce).add(this.thrustForce).add(this.gravityForce);
            } else {
                this.totalForce = new THREE.Vector3().add(this.airResistanceForce).add(this.gravityForce);
            }
            
            this.acceleration = this.totalForce.divideScalar(this.totalMass);
            this.velocity.add(this.acceleration.clone().multiplyScalar(deltaTime));
            this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
            currentStage!.fuelMass = Math.max(currentStage!.fuelMass - currentStage!.fuelConsumptionRate * deltaTime, 0);
            this.time += deltaTime;

            if (this.velocity.length() > this.escapeVelocity && this.currentHeight > 100000000) {
                this.finished = true;
            }
            if (this.time > 2 && this.currentHeight == 0) {
                this.finished = true;
            }
        }
    }
    calculateCurrentHeight() {
        this.currentHeight = Math.max(this.position.distanceTo(this.planetCentre) - this.planetRadius, 0);
    }
    updateDroppedStagesPhysics(deltaTime: number, stage: any, stageIndex: number) {
        stage.mesh.getWorldPosition(stage.position);
        stage.currentHeight = Math.max(stage.position.distanceTo(this.planetCentre) - this.planetRadius, 0);
        stage.directionVector = new THREE.Vector3().subVectors(stage.position, this.planetCentre);
        const rHat = stage.directionVector.normalize();
        stage.gravityMagnitude = G * this.planetMass / ((this.planetRadius + stage.currentHeight) ** 2);
        stage.gravityForce = rHat.clone().multiplyScalar(-stage.gravityMagnitude * this.stages[stageIndex]!.rocketMass);
        stage.velocityMagnitude = stage.velocity.length();
        const vHat = stage.velocity.clone().normalize();
        
        if (stage.currentHeight > this.stages[stageIndex]!.rocketRadius * 6) {
            //console.log(stage.velocity);
            if (this.currentHeight < this.atmosphereThickness) {
                stage.currentAirDensity = this.airDensity * Math.E ** (-stage.currentHeight / this.scaleHeight);
            } else {
                stage.currentAirDensity = 0;
            }
            stage.airResistanceMagnitude = 0.5 * stage.currentAirDensity * this.stages[stageIndex]!.crossSectionalArea * 
                (stage.velocityMagnitude ** 2);        
            stage.airResistanceForce = vHat.clone().multiplyScalar(-stage.airResistanceMagnitude);
            stage.totalForce = new THREE.Vector3().add(stage.airResistanceForce).add(stage.gravityForce);
            stage.acceleration = stage.totalForce.divideScalar(this.stages[stageIndex]!.rocketMass);
            stage.velocity.add(stage.acceleration.clone().multiplyScalar(deltaTime));
            stage.mesh.position.add(stage.velocity.clone().multiplyScalar(deltaTime));
        }
    }
}