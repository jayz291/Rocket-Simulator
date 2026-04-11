import * as THREE from 'three';
import type { StageData, PlanetData, SimulationState } from "./types.js";
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
    originalPosition!: THREE.Vector3;
    /* ---Changing values---- */
    velocity: THREE.Vector3;
    velocityMagnitude!: number;
    position!: THREE.Vector3;
    totalMass!: number;
    currentHeight: number;
    finished: boolean;
    time: number;
    thrustDirection!: THREE.Vector3;
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
            let directionVector: THREE.Vector3;
            let thrustForce: THREE.Vector3;

            const rocketPos = this.position.clone();
            directionVector = new THREE.Vector3().subVectors(rocketPos, this.planetCentre);
            const rHat = directionVector.clone().normalize();
            let currentStage = this.stages[this.currentStageIndex];

            const globalZ = new THREE.Vector3(0, 0, 1);
        
            let pitchAngle = this.calculatePitchAngle();

            if (currentStage && currentStage.fuelMass <= 0 && this.currentStageIndex < this.stages.length - 1) {
                this.currentStageIndex++;
                currentStage = this.stages[this.currentStageIndex];
            }
            this.thrustDirection = rHat.clone().applyAxisAngle(globalZ, -pitchAngle);
            thrustForce = new THREE.Vector3(0, 0, 0);
            if (currentStage!.fuelMass > 0) {
                thrustForce = this.thrustDirection.clone().normalize().multiplyScalar(currentStage!.thrustForce);
            }

            this.calculateRocketMass();
            this.calculateCurrentHeight();
            
            this.incrementPhysics({
                velocity: this.velocity,
                velocityMagnitude: this.velocity.length(),
                position: this.position,
                totalMass: this.totalMass,
                currentHeight: this.currentHeight,
                thrustForce: thrustForce,
                crossSectionalArea: currentStage!.crossSectionalArea,
            }, deltaTime);

            currentStage!.fuelMass = Math.max(currentStage!.fuelMass - currentStage!.fuelConsumptionRate * deltaTime, 0);
            this.time += deltaTime;
            
            if (this.velocity.length() > this.escapeVelocity && this.currentHeight > 100000000) {
                this.finished = true;
            }
            if (this.time > 10 && this.currentHeight == 0) {
                this.finished = true;
            }
        }
    }
    calculateCurrentHeight() {
        this.currentHeight = Math.max(this.position.distanceTo(this.planetCentre) - this.planetRadius, 0);
    }
    calculatePitchAngle(): number {
        let pitchAngle = 0;
        const turnStartHeight = 5000; 
        const turnEndHeight = 160000;

        if (this.currentHeight > turnStartHeight) {
            let turnProgress = (this.currentHeight - turnStartHeight) / (turnEndHeight - turnStartHeight);
            turnProgress = Math.min(turnProgress, 1);
            const aggressiveTurn = Math.pow(turnProgress, 2.5);
            pitchAngle = aggressiveTurn * (Math.PI * 0.42);
        }
        return pitchAngle;
    }
    incrementPhysics(currentData: SimulationState, deltaTime: number) {
        let directionVector: THREE.Vector3;
        let gravityForce: THREE.Vector3;
        let gravityMagnitude: number;
        let currentAirDensity: number;
        let airResistanceForce: THREE.Vector3;
        let airResistanceMagnitude: number;
        let totalForce: THREE.Vector3;
        let acceleration: THREE.Vector3;

        const rocketPos = currentData.position.clone();
        directionVector = new THREE.Vector3().subVectors(rocketPos, this.planetCentre);
        const rHat = directionVector.normalize();

        currentAirDensity = 0;
        if (currentData.currentHeight < this.atmosphereThickness) {
            currentAirDensity = this.airDensity * Math.E ** (-currentData.currentHeight / this.scaleHeight);
        } 

        gravityMagnitude = G * this.planetMass / ((this.planetRadius + currentData.currentHeight) ** 2);
        gravityForce = rHat.clone().multiplyScalar(-gravityMagnitude * currentData.totalMass);
        currentData.velocityMagnitude = currentData.velocity.length();
        const vHat = currentData.velocity.clone().normalize();
            
        airResistanceMagnitude = 0.5 * currentAirDensity * currentData.crossSectionalArea * 
            (currentData.velocityMagnitude ** 2) * 0.25;
        airResistanceForce = vHat.clone().multiplyScalar(-airResistanceMagnitude);

        if (currentData.thrustForce) {
            totalForce = new THREE.Vector3().add(airResistanceForce).add(currentData.thrustForce).add(gravityForce);
        } else {
            totalForce = new THREE.Vector3().add(airResistanceForce).add(gravityForce);
        }
            
        acceleration = totalForce.divideScalar(currentData.totalMass);
        currentData.velocity.add(acceleration.clone().multiplyScalar(deltaTime));
        currentData.position.add(currentData.velocity.clone().multiplyScalar(deltaTime));
    }
    updateDroppedStagesPhysics(deltaTime: number, stage: any, stageIndex: number) {
        stage.mesh.getWorldPosition(stage.position);
        stage.currentHeight = Math.max(stage.position.distanceTo(this.planetCentre) - this.planetRadius, 0);
        
        if (stage.currentHeight > this.stages[stageIndex]!.rocketRadius * 6) {
            //console.log(stage.velocity);
            this.incrementPhysics({
                velocity: stage.velocity,
                velocityMagnitude: stage.velocity.length(),
                position: stage.mesh.position,
                totalMass: this.stages[stageIndex]!.rocketMass,
                currentHeight: stage.currentHeight,
                crossSectionalArea: this.stages[stageIndex]!.crossSectionalArea,
            }, deltaTime)
        }
    }
}