import * as THREE from 'three';

export interface StageData {
    rocketRadius: number;
    rocketMass: number;
    fuelMass: number;
    fuelConsumptionRate: number;
    thrustForce: number;
    originalFuelMass: number;
    crossSectionalArea: number;
}

export interface PlanetData {
    planetMass: number;
    planetRadius: number;
    atmosphereThickness: number;
    airDensity: number;
    scaleHeight: number;
}

export interface SimulationState {
    velocity: THREE.Vector3;
    velocityMagnitude: number;
    position: THREE.Vector3;
    totalMass: number;
    currentHeight: number;
    thrustForce?: THREE.Vector3;
    crossSectionalArea: number;
}