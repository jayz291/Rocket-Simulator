import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const simulationBox = document.getElementById('simulation');
const G = 6.6743e-11;

class RocketSimulator {
    constructor() {
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({antialias: true, logarithmicDepthBuffer: true});
        this.camera = new THREE.PerspectiveCamera(45, 
            simulationBox.clientWidth / simulationBox.clientHeight, 1, 1000);
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

        const directionalLight = new THREE.AmbientLight(0xffffff, 1);
        directionalLight.position.set(100, 200, 100);
        this.scene.add(directionalLight);

        this.ground = new Ground(0x00ff00);
        this.rocket = new Rocket(3, 2);
        this.scene.add(this.ground.mesh);
        this.scene.add(this.rocket.mesh);
        this.animate = this.animate.bind(this);
        this.animate();
    }
    animate() {
        requestAnimationFrame(this.animate);
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

class Ground {
    constructor(color) {
        this.geometry = new THREE.PlaneGeometry(1400, 1400);
        this.material = new THREE.MeshLambertMaterial({ color: color});
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.set(0, 0, 0);
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
        this.planetRadius = 6378;
        this.atmosphereThickness = 100;
        this.airDensity = 1.225;
        this.scaleHeight = 8.5;
        this.rocketRadius = 2;
        this.rocketMass = 10;
        this.fuelMass = 5;
        this.fuelConsumptionRate = 1;
        this.thrustForce = 500;
        this.currentHeight = 0;
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
        this.fuelConsumptionRate = data.fuelConsumptionRate;
        this.thrustForce = data.thrustForce;

        this.escapeVelocity = (2 * G * this.planetMass / this.planetRadius) ** (1 / 2);
        this.totalMass = this.rocketMass + this.fuelMass;
        this.crossSectionalArea = this.rocketRadius * Math.PI ** 2;
        this.velocity = 0;
        this.time = 0;
        //this.gravity = G * this.planetMass / (this.planetRadius ** 2);
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
            if (this.fuelMass > 0) {
                force = this.thrustForce - gravity * this.totalMass - 
                currentAirDensity * this.crossSectionalArea * (this.velocity ** 2) * Math.abs(this.velocity);
            } else {
                this.totalMass = this.rocketMass;
                force = -gravity * this.totalMass -
                currentAirDensity * this.crossSectionalArea * (this.velocity ** 2) * Math.abs(this.velocity);
            }
            acceleration = force / this.totalMass;
            this.velocity += deltaTime * acceleration;
            this.currentHeight = Math.max(this.currentHeight + this.velocity * deltaTime, 0);
            this.fuelMass = Math.max(this.fuelMass - this.fuelConsumptionRate * deltaTime, 0);
            this.totalMass = Math.max(this.rocketMass + this.fuelMass, this.rocketMass);
            this.time += deltaTime;

            if (this.velocity > this.escapeVelocity) {
                this.finished = true;
            }
        }
    }
}

const rocketSimulator = new RocketSimulator();

const currentSimulation = new Simulation();

const updateButton = document.getElementById("configure-btn");

updateButton.addEventListener('click', () => {
    const inputData = {
        rocketMass: parseFloat(document.getElementById('rocketMass').value),
        planetMass: parseFloat(document.getElementById('planetMass').value),
        planetRadius: parseFloat(document.getElementById('planetRadius').value),
        atmosphereThickness: parseFloat(document.getElementById('atmosphereThickness').value),
        airDensity: parseFloat(document.getElementById('airDensity').value),
        scaleHeight: parseFloat(document.getElementById('scaleHeight').value),
        rocketRadius: parseFloat(document.getElementById('rocketRadius').value),
        rocketMass: parseFloat(document.getElementById('rocketMass').value),
        fuelMass: parseFloat(document.getElementById('fuelMass').value),
        fuelConsumptionRate: parseFloat(document.getElementById('fuelConsumptionRate').value),
        thrustForce: parseFloat(document.getElementById('thrustForce').value)
    }
    currentSimulation.updateStats(inputData);
});
