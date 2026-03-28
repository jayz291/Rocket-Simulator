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