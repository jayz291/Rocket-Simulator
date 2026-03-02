import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const simulationBox = document.getElementById('simulation');
const altitudeStat = document.getElementById('altitude');
const velocityStat = document.getElementById('velocity');
const timeStat = document.getElementById('time');
const G = 6.6743e-11;

class RocketSimulator {
    constructor(simulation) {
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({antialias: true, logarithmicDepthBuffer: true});
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.camera = new THREE.PerspectiveCamera(45, 
            simulationBox.clientWidth / simulationBox.clientHeight, 1, 10000000);
        this.simulation = simulation;
        this.init();
    }
    init() {
        this.renderer.setSize(simulationBox.clientWidth, simulationBox.clientHeight);
        simulationBox.appendChild(this.renderer.domElement);
        this.scene.background = new THREE.Color(0x0000ff);
        this.scene.add(this.camera);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.5;
        this.controls.maxPolarAngle = Math.PI / 2;

        this.camera.position.set(20, 10, 20);
        this.camera.lookAt(0, 12, 0);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
        directionalLight.position.set(20000, 20000, 300);
        this.scene.add(directionalLight);

        this.ground = new Ground(0x00ff00);
        this.launchPad = new LaunchPad();
        this.rocket = new Rocket(3, 2);
        this.scene.add(this.ground.mesh);
        this.scene.add(this.rocket.mesh);
        this.scene.add(this.launchPad.mesh);
        this.simulating = false;
        this.resetting = false;
        this.animate = this.animate.bind(this);
        this.animate();
    }
    animate() {
        requestAnimationFrame(this.animate);
        if (this.simulating && this.simulation && !this.simulation.finished) {
            let previousHeight = this.simulation.currentHeight;
            this.simulation.updatePhysics(0.016);
            let deltaY = this.simulation.currentHeight - previousHeight;
            this.rocket.mesh.position.y = 8 + this.simulation.currentHeight;
            this.camera.position.y += deltaY;
            this.controls.target.y = this.rocket.mesh.position.y;
            this.controls.maxPolarAngle = Math.PI;
        } else {
            this.simulating = false;
        }
        if (this.resetting) {
            this.simulation.currentHeight = 0;
            this.simulation.velocity = 0;
            this.simulation.time = 0;
            this.simulation.fuelMass = this.simulation.originalFuelMass;
            this.rocket.mesh.position.y = 8 + this.simulation.currentHeight;
            this.camera.position.y = 8 + this.simulation.currentHeight;
            this.controls.target.y = this.rocket.mesh.position.y;
            this.resetting = false;
        }
        altitudeStat.textContent = this.simulation.currentHeight.toFixed(5);
        velocityStat.textContent = this.simulation.velocity.toFixed(5);
        timeStat.textContent = this.simulation.time.toFixed(2);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

class Ground {
    constructor(color) {
        this.geometry = new THREE.PlaneGeometry(140000, 140000);
        this.material = new THREE.MeshLambertMaterial({ color: color});
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.set(0, 0, 0);
    }
}

class LaunchPad {
    constructor() {
        this.geometry = new THREE.PlaneGeometry(10, 10);
        this.material = new THREE.MeshLambertMaterial({color: 0x808080});
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.set(0, 0.1, 0);
    }
}

class Rocket {
    constructor(elevation, radius) {
        this.mesh = new THREE.Group();
        this.mesh.position.set(0, 5 + elevation, 0);
        this.buildRocket(elevation, radius);
    }
    buildRocket(elevation, radius) {
        const cylinder = new THREE.CylinderGeometry(radius, radius, 10, 32);
        const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        const cylinderMesh = new THREE.Mesh(cylinder, material);
      
        const cone = new THREE.ConeGeometry(radius, 4, 32);
        const coneMesh = new THREE.Mesh(cone, material);
        coneMesh.position.y = 4 + elevation;

        const finShape = new THREE.Shape();
        finShape.moveTo(radius, -5);
        finShape.lineTo(radius + 3, -8);
        finShape.lineTo(radius, -2);
        finShape.lineTo(radius, -5);
        const extrudeSettings = { depth: 0.2, bevelEnabled: false };
        const fin = new THREE.ExtrudeGeometry(finShape, extrudeSettings);
        const finMesh = new THREE.Mesh(fin, material);

        const finMesh2 = finMesh.clone();
        finMesh2.rotation.y += Math.PI * 2 / 3;
        
        const finMesh3 = finMesh.clone();
        finMesh3.rotation.y -= Math.PI * 2 / 3;

        this.mesh.add(coneMesh);
        this.mesh.add(cylinderMesh);
        this.mesh.add(finMesh);
        this.mesh.add(finMesh2);
        this.mesh.add(finMesh3);
    }
}

class Simulation {
    constructor() {
        this.planetMass = 5.972e24;
        this.planetRadius = 6378 * 1000;
        this.atmosphereThickness = 100;
        this.airDensity = 1.225;
        this.scaleHeight = 8.5 * 1000;
        this.rocketRadius = 0.1764;
        this.rocketMass = 10;
        this.fuelMass = 8;
        this.originalFuelMass = this.fuelMass;
        this.fuelConsumptionRate = 0.8;
        this.thrustForce = 500;
        this.currentHeight = 0;
        this.velocity = 0;

        this.escapeVelocity = (2 * G * this.planetMass / this.planetRadius) ** (1 / 2);
        this.totalMass = this.rocketMass + this.fuelMass;
        this.crossSectionalArea = Math.PI * this.rocketRadius ** 2;
        this.time = 0;
        this.finished = false;
    }
    updateStats(data) {
        this.planetMass = data.planetMass;
        this.planetRadius = data.planetRadius;
        this.atmosphereThickness = data.atmosphereThickness;
        this.airDensity = data.airDensity;
        this.scaleHeight = data.scaleHeight;
        this.rocketRadius = data.rocketRadius;
        this.rocketMass = data.rocketMass;
        this.fuelMass = data.fuelMass;
        this.originalFuelMass = data.fuelMass;
        this.fuelConsumptionRate = data.fuelConsumptionRate;
        this.thrustForce = data.thrustForce;

        this.escapeVelocity = (2 * G * this.planetMass / this.planetRadius) ** (1 / 2);
        this.totalMass = this.rocketMass + this.fuelMass;
        this.crossSectionalArea = Math.PI * this.rocketRadius ** 2;
        this.velocity = 0;
        this.time = 0;
        this.finished = false;

        console.log(this);
    }
    updatePhysics(deltaTime) {
        if (!this.finished) {
            let currentAirDensity, gravity, force, acceleration;
            if (this.currentHeight < this.atmosphereThickness) {
                currentAirDensity = this.airDensity * Math.E ** (-this.currentHeight / this.scaleHeight);
            } else {
                currentAirDensity = 0;
            }
            gravity = G * this.planetMass / ((this.planetRadius + this.currentHeight) ** 2);
            //console.log(gravity);
            //console.log(G * this.planetMass);
            //console.log((this.planetRadius + this.currentHeight) ** 2);
            if (this.fuelMass > 0) {
                force = this.thrustForce - gravity * this.totalMass - /*0.5 **/
                currentAirDensity * this.crossSectionalArea * (this.velocity ** 2) * Math.sign(this.velocity);
            } else {
                //this.totalMass = this.rocketMass;
                force = -gravity * this.totalMass - /*0.5 **/
                currentAirDensity * this.crossSectionalArea * (this.velocity ** 2) * Math.sign(this.velocity);
            }
            //console.log(this.totalMass);
            //console.log(this.currentHeight);
            acceleration = force / this.totalMass;
            this.velocity += deltaTime * acceleration;
            this.currentHeight = Math.max(this.currentHeight + this.velocity * deltaTime, 0);
            this.fuelMass = Math.max(this.fuelMass - this.fuelConsumptionRate * deltaTime, 0);
            this.totalMass = Math.max(this.rocketMass + this.fuelMass, this.rocketMass);
            this.time += deltaTime;
            console.log(currentAirDensity);

            if (this.velocity > this.escapeVelocity && this.currentHeight > 10000000) {
                this.finished = true;
            }
            if (this.time > 2 && this.currentHeight == 0) {
                this.finished = true;
            }
        }
    }
}



const currentSimulation = new Simulation();
const rocketSimulator = new RocketSimulator(currentSimulation);

const updateButton = document.getElementById("configure-btn");
const startButton = document.getElementById("startButton");
const resetButton = document.getElementById("resetButton");

updateButton.addEventListener('click', () => {
    const inputData = {
        rocketMass: parseFloat(document.getElementById('rocketMass').value),
        planetMass: parseFloat(document.getElementById('planetMass').value),
        planetRadius: parseFloat(document.getElementById('planetRadius').value) * 1000,
        atmosphereThickness: parseFloat(document.getElementById('atmosphereThickness').value) * 1000,
        airDensity: parseFloat(document.getElementById('airDensity').value),
        scaleHeight: parseFloat(document.getElementById('scaleHeight').value) * 1000,
        rocketRadius: parseFloat(document.getElementById('rocketRadius').value),
        rocketMass: parseFloat(document.getElementById('rocketMass').value),
        fuelMass: parseFloat(document.getElementById('fuelMass').value),
        fuelConsumptionRate: parseFloat(document.getElementById('fuelConsumptionRate').value),
        thrustForce: parseFloat(document.getElementById('thrustForce').value)
    }
    currentSimulation.updateStats(inputData);
    rocketSimulator.resetting = true;
});

startButton.addEventListener('click', () => {
    currentSimulation.finished = false;
    rocketSimulator.simulating = true;
});

resetButton.addEventListener('click', () => {

    currentSimulation.finished = true;
    rocketSimulator.simulating = false;
    rocketSimulator.resetting = true;
  
    this.controls.update();
    this.renderer.render(this.scene, this.camera);

});
