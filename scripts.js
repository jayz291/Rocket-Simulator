import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const simulationBox = document.getElementById('simulation');
const altitudeStat = document.getElementById('altitude');
const velocityStat = document.getElementById('velocity');
const timeStat = document.getElementById('time');
const G = 6.6743e-11;

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
        this.startColour = new THREE.Color(0x90d5ff);
        this.endColour = new THREE.Color(0x000000);
        this.scene.background = this.startColour;
        this.scene.fog = new THREE.Fog(this.startColour, 10000, 1400000);
        this.scene.add(this.camera);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.5;
        this.controls.maxPolarAngle = Math.PI / 2;

        this.camera.far = 1200000;
        this.camera.position.set(20, 10, 20);
        this.camera.lookAt(0, 12, 0);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
        directionalLight.position.set(20000, 20000, 300);
        this.scene.add(directionalLight);

        this.ground = new Ground(0x00ff00);
        this.launchPad = new LaunchPad();
        this.rocket = new Rocket(this.simulation.stages);
        this.scene.add(this.ground.mesh);
        this.scene.add(this.rocket.mesh);
        this.scene.add(this.launchPad.mesh);
        this.simulating = false;
        this.resetting = false;

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
            this.rocket.mesh.position.y = this.simulation.stages[0].rocketRadius * 6 + 0.1 + this.simulation.currentHeight;
            this.rocket.mesh.updateMatrixWorld(true);
            this.camera.position.y += deltaY;
            this.controls.target.y = this.rocket.mesh.position.y;
            this.controls.maxPolarAngle = Math.PI;
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
        if (this.resetting) {
            this.simulation.currentHeight = 0;
            this.simulation.velocity = 0;
            this.simulation.time = 0;
            for (let i = 0; i < this.simulation.stages.length; i++) {
                this.simulation.stages[i].fuelMass = this.simulation.stages[i].originalFuelMass;
            }
            this.detachedStages.forEach(detachedStage => this.scene.remove(detachedStage.mesh));
            this.detachedStages = [];
            this.previousStageIndex = 0;
            this.simulation.currentStageIndex = 0;
            this.scene.remove(this.rocket.mesh);
            this.rocket = new Rocket(this.simulation.stages);
            this.scene.add(this.rocket.mesh);

            this.rocket.mesh.position.y = this.simulation.stages[0].rocketRadius * 6 + 0.1 + this.simulation.currentHeight;
            this.camera.position.y = this.simulation.stages[0].rocketRadius * 6 + 0.1 + this.simulation.currentHeight;
            this.controls.target.y = this.rocket.mesh.position.y;
            this.resetting = false;
            startButton.disabled = false;
        }
        altitudeStat.textContent = this.simulation.currentHeight.toFixed(5);
        velocityStat.textContent = this.simulation.velocity.toFixed(5);
        timeStat.textContent = this.simulation.time.toFixed(2);
        let alpha = this.simulation.currentHeight / this.simulation.atmosphereThickness;
        let currentColour = new THREE.Color().lerpColors(this.startColour, this.endColour, alpha);
        this.scene.background = currentColour;
        this.scene.fog.color = currentColour;

        const hasThrust = this.simulating && currentStage.fuelMass > 0;
        this.rocket.updateParticles(hasThrust, currentStage.rocketRadius);
        for (let i = 0; i < this.detachedStages.length; i++) {
            this.simulation.updateDroppedStagesPhysics(0.016, this.detachedStages[i], i);
        }
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    updateRocket(newRadius) {
        this.scene.remove(this.rocket.mesh);
        //this.simulation.rocketRadius = newRadius;
        this.simulation.stages[0].rocketRadius = newRadius;
        this.rocket = new Rocket(this.simulation.stages);
        this.scene.add(this.rocket.mesh);
    }
    updateMultiStageRocket(newRadius, stageIndex) {
        this.scene.remove(this.rocket.mesh);
        this.simulation.stages[stageIndex].rocketRadius = newRadius;
        this.rocket = new Rocket(this.simulation.stages);
        this.scene.add(this.rocket.mesh);
    }
    detachStage(stageIndex) {
        if (!this.rocket.stageMeshes || !this.rocket.stageMeshes[stageIndex]) {
            return;
        }
        let stages = this.simulation.stages;
        const meshToDetach = this.rocket.stageMeshes[stageIndex];
        const worldPos = new THREE.Vector3();
        meshToDetach.getWorldPosition(worldPos);
        worldPos.y -= 3 * this.simulation.stages[stageIndex].rocketRadius;

        this.rocket.mesh.remove(meshToDetach);
        meshToDetach.position.copy(worldPos);
        this.scene.add(meshToDetach);

        this.detachedStages.push({
            mesh: meshToDetach,
            velocity: this.simulation.velocity
        })

        if (stageIndex == 0) {
            this.rocket.exhaust.position.y = stages[0].rocketRadius * 2 + stages[1].rocketRadius * 2;
        } else if (stageIndex == 1) {
            this.rocket.exhaust.position.y = stages[0].rocketRadius * 2 + stages[1].rocketRadius * 4 + 
                stages[2].rocketRadius * 2;
        }
    }
}

class Ground {
    constructor(color) {
        this.geometry = new THREE.PlaneGeometry(2800000, 2800000);
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
    constructor(stages) {
        console.log(stages);
        this.mesh = new THREE.Group();
        this.mesh.position.set(0, stages[0].rocketRadius * 6, 0);
        if (modeMulti.checked) {
            this.buildMultiStageRocket(stages);
        } else {
            this.buildRocket(stages);
        }
    }
    buildMultiStageRocket(stages) {
        this.stage1 = new THREE.Group();
        console.log(stages[0]);
        let stage1Radius = stages[0].rocketRadius;
        const cylinder = new THREE.CylinderGeometry(stage1Radius, stage1Radius, stage1Radius * 4, 32);
        const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        material.depthWrite = true;
        material.transparent = false;
        const finShape = new THREE.Shape();
        finShape.moveTo(stage1Radius, -stage1Radius * 2);
        finShape.lineTo(stage1Radius * 4, -stage1Radius * 6);
        finShape.lineTo(stage1Radius, 0);
        finShape.lineTo(stage1Radius, -stage1Radius * 2);
        const extrudeSettings = { depth: stage1Radius / 10, bevelEnabled: false };
        const fin = new THREE.ExtrudeGeometry(finShape, extrudeSettings);
        const finMesh = new THREE.Mesh(fin, material);
        const finMesh2 = finMesh.clone();
        finMesh2.rotation.y += Math.PI * 2 / 3;
        
        const finMesh3 = finMesh.clone();
        finMesh3.rotation.y -= Math.PI * 2 / 3;

        const stage1Mesh = new THREE.Mesh(cylinder, material);

        this.stage1.add(stage1Mesh);
        this.stage1.add(finMesh);
        this.stage1.add(finMesh2);
        this.stage1.add(finMesh3);
        this.addParticles(stage1Radius)

        this.stage2 = new THREE.Group();
        let stage2Radius = stages[1].rocketRadius;

        const cylinder2 = new THREE.CylinderGeometry(stage2Radius, stage2Radius, stage2Radius * 4);
        const stage2Mesh = new THREE.Mesh(cylinder2, material);
        stage2Mesh.position.y = stage1Radius * 2 + stage2Radius * 2;
        this.stage2.add(stage2Mesh);

        this.stage3 = new THREE.Group();
        let stage3Radius = stages[2].rocketRadius;
        const cylinder3 = new THREE.CylinderGeometry(stage3Radius, stage3Radius, stage3Radius * 4);
        const stage3Mesh = new THREE.Mesh(cylinder3, material);
        stage3Mesh.position.y = stage1Radius * 2 + stage2Radius * 4 + stage3Radius * 2;
        const cone = new THREE.ConeGeometry(stage3Radius, stage3Radius * 2, 32);
        const coneMesh = new THREE.Mesh(cone, material);
        coneMesh.position.y = stage1Radius * 2 + stage2Radius * 4 + stage3Radius * 5;

        this.stage3.add(stage3Mesh);
        this.stage3.add(coneMesh);

        this.mesh.add(this.stage1);
        this.mesh.add(this.stage2);
        this.mesh.add(this.stage3);
        this.mesh.add(this.exhaust);

        this.stageMeshes = [this.stage1, this.stage2, this.stage3];
    }
    buildRocket(stages) {
        let radius = stages[0].rocketRadius;
        const cylinder = new THREE.CylinderGeometry(radius, radius, radius * 6, 32);
        const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        material.depthWrite = true;
        material.transparent = false;
        const cylinderMesh = new THREE.Mesh(cylinder, material);
      
        const cone = new THREE.ConeGeometry(radius, radius * 2, 32);
        const coneMesh = new THREE.Mesh(cone, material);
        coneMesh.position.y = radius * 4;

        const finShape = new THREE.Shape();
        finShape.moveTo(radius, -radius * 2);
        finShape.lineTo(radius * 4, -radius * 6);
        finShape.lineTo(radius, 0);
        finShape.lineTo(radius, -radius * 2);
        const extrudeSettings = { depth: radius / 10, bevelEnabled: false };
        const fin = new THREE.ExtrudeGeometry(finShape, extrudeSettings);
        const finMesh = new THREE.Mesh(fin, material);

        const finMesh2 = finMesh.clone();
        finMesh2.rotation.y += Math.PI * 2 / 3;
        
        const finMesh3 = finMesh.clone();
        finMesh3.rotation.y -= Math.PI * 2 / 3;
        this.addParticles(radius);

        this.mesh.add(coneMesh);
        this.mesh.add(cylinderMesh);
        this.mesh.add(finMesh);
        this.mesh.add(finMesh2);
        this.mesh.add(finMesh3);
        this.mesh.add(this.exhaust);
    }
    addParticles(radius) {
        this.particleCount = 1000;
        const positions = new Float32Array(this.particleCount * 3);
        this.particleVelocities = [];

        for (let i = 0; i < this.particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * radius;
            positions[i * 3 + 1] = -radius * 3 + (Math.random() * radius * 2);
            positions[i * 3 + 2] = (Math.random() - 0.5) * radius;
            this.particleVelocities.push({
                x: (Math.random() - 0.5) * 0.1,
                y: -Math.random() * 0.5 - 0.2, 
                z: (Math.random() - 0.5) * 0.1
            });
        }

        this.particleGeometry = new THREE.BufferGeometry();
        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const thrustMaterial = new THREE.PointsMaterial({
            size: radius / 5,
            color: 0xffa500, 
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
            opacity: 0.8
        });
        this.exhaust = new THREE.Points(this.particleGeometry, thrustMaterial);
    }
    updateParticles(isThrusting, radius) {
        this.exhaust.visible = isThrusting;
        if (!isThrusting) {
            return;
        }
        const positions = this.particleGeometry.attributes.position.array;
        for (let i = 0; i < this.particleCount; i++) {
            positions[i * 3] += this.particleVelocities[i].x;
            positions[i * 3 + 1] += this.particleVelocities[i].y;
            positions[i * 3 + 2] += this.particleVelocities[i].z;
            if (positions[i * 3 + 1] < -radius * 12) {
                positions[i * 3] = (Math.random() - 0.5) * radius;
                positions[i * 3 + 1] = -radius * 3;
                positions[i * 3 + 2] = (Math.random() - 0.5) * radius;
            }
        }
        this.particleGeometry.attributes.position.needsUpdate = true;
    }
}

class Simulation {
    constructor() {
        this.planetMass = 5.972e24;
        this.planetRadius = 6378 * 1000;
        this.atmosphereThickness = 100;
        this.airDensity = 1.225;
        this.scaleHeight = 8.5 * 1000;
        //this.rocketRadius = 0.1764;
        //this.rocketMass = 10;
        //this.fuelMass = 8;
        //this.originalFuelMass = this.fuelMass;
        //this.fuelConsumptionRate = 0.8;
        //this.thrustForce = 500;
        this.currentHeight = 0;
        this.velocity = 0;
        const rocketData = {
            rocketRadius: parseFloat(document.getElementById('rocketRadius').value),
            rocketMass: parseFloat(document.getElementById('rocketMass').value),
            fuelMass: parseFloat(document.getElementById('fuelMass').value),
            fuelConsumptionRate: parseFloat(document.getElementById('fuelConsumptionRate').value),
            thrustForce: parseFloat(document.getElementById('thrustForce').value),
            originalFuelMass: parseFloat(document.getElementById('fuelMass').value),
            crossSectionalArea: Math.PI * parseFloat(document.getElementById('rocketRadius').value) ** 2
        };

        this.stages = [];
        this.stages.push(rocketData);
        this.currentStageIndex = 0;
        this.calculateRocketMass();

        this.escapeVelocity = (2 * G * this.planetMass / this.planetRadius) ** (1 / 2);
        //this.totalMass = this.rocketMass + this.fuelMass;
        //this.crossSectionalArea = Math.PI * this.rocketRadius ** 2;
        this.time = 0;
        this.finished = false;
    }
    updateStats(data) {
        this.planetMass = data.planetMass;
        this.planetRadius = data.planetRadius;
        this.atmosphereThickness = data.atmosphereThickness;
        this.airDensity = data.airDensity;
        this.scaleHeight = data.scaleHeight;
        //this.rocketRadius = this.stages[0].rocketRadius;
        //this.rocketMass = this.stages;
        this.fuelMass = this.stages[0].fuelMass;
        this.originalFuelMass = this.stages[0].fuelMass;
        this.fuelConsumptionRate = this.stages[0].fuelConsumptionRate;
        this.thrustForce = this.stages[0].thrustForce;
        //this.stages = data.stages;
        this.currentStageIndex = 0;
        this.calculateRocketMass();

        this.escapeVelocity = (2 * G * this.planetMass / this.planetRadius) ** (1 / 2);
        this.totalMass = this.rocketMass + this.fuelMass;
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
            console.log(force);
            
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

function addData() {
    const inputData = {
    rocketMass: parseFloat(document.getElementById('rocketMass').value),
    planetMass: parseFloat(document.getElementById('planetMass').value),
    planetRadius: parseFloat(document.getElementById('planetRadius').value) * 1000,
    atmosphereThickness: parseFloat(document.getElementById('atmosphereThickness').value) * 1000,
    airDensity: parseFloat(document.getElementById('airDensity').value),
    scaleHeight: parseFloat(document.getElementById('scaleHeight').value) * 1000,
    }
    if (!modeMulti.checked) {
        currentSimulation.stages = [];
        const rocketData = {
            rocketRadius: parseFloat(document.getElementById('rocketRadius').value),
            rocketMass: parseFloat(document.getElementById('rocketMass').value),
            fuelMass: parseFloat(document.getElementById('fuelMass').value),
            fuelConsumptionRate: parseFloat(document.getElementById('fuelConsumptionRate').value),
            thrustForce: parseFloat(document.getElementById('thrustForce').value),
            originalFuelMass: parseFloat(document.getElementById('fuelMass').value),
            crossSectionalArea: Math.PI * parseFloat(document.getElementById('rocketRadius').value) ** 2
        };
        currentSimulation.stages.push(rocketData);
    } else {
        currentSimulation.stages = [];
        const stage1Data = {
            rocketRadius: parseFloat(document.getElementById('s1_radius').value),
            rocketMass: parseFloat(document.getElementById('s1_mass').value),
            fuelMass: parseFloat(document.getElementById('s1_fuel').value),
            fuelConsumptionRate: parseFloat(document.getElementById('s1_burn').value),
            thrustForce: parseFloat(document.getElementById('s1_thrust').value),
            originalFuelMass: parseFloat(document.getElementById('s1_fuel').value),
            crossSectionalArea: Math.PI * parseFloat(document.getElementById('s1_radius').value) ** 2
        }
        const stage2Data = {
            rocketRadius: parseFloat(document.getElementById('s2_radius').value),
            rocketMass: parseFloat(document.getElementById('s2_mass').value),
            fuelMass: parseFloat(document.getElementById('s2_fuel').value),
            fuelConsumptionRate: parseFloat(document.getElementById('s2_burn').value),
            thrustForce: parseFloat(document.getElementById('s2_thrust').value),
            originalFuelMass: parseFloat(document.getElementById('s2_fuel').value),
            crossSectionalArea: Math.PI * parseFloat(document.getElementById('s2_radius').value) ** 2
        }
        const stage3Data = {
            rocketRadius: parseFloat(document.getElementById('s3_radius').value),
            rocketMass: parseFloat(document.getElementById('s3_mass').value),
            fuelMass: parseFloat(document.getElementById('s3_fuel').value),
            fuelConsumptionRate: parseFloat(document.getElementById('s3_burn').value),
            thrustForce: parseFloat(document.getElementById('s3_thrust').value),
            originalFuelMass: parseFloat(document.getElementById('s3_fuel').value),
            crossSectionalArea: Math.PI * parseFloat(document.getElementById('s3_radius').value) ** 2
        }
        currentSimulation.stages.push(stage1Data);
        currentSimulation.stages.push(stage2Data);
        currentSimulation.stages.push(stage3Data);
    }
    currentSimulation.updateStats(inputData);
}

const currentSimulation = new Simulation();
const rocketSimulator = new RocketSimulator(currentSimulation);

startButton.addEventListener('click', () => {
    addData();
    rocketSimulator.resetting = true;
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
            rocketSimulator.updateMultiStageRocket(newRadius, 0);
        }
    })
}

if (stage2RadiusInput) {
    stage2RadiusInput.addEventListener('input', (event) => {
        const newRadius = parseFloat(event.target.value);
        if (!isNaN(newRadius) && newRadius > 0) {
            rocketSimulator.simulation.stages[1].rocketRadius = newRadius;
            rocketSimulator.updateMultiStageRocket(newRadius, 1);
        }
    })
}

if (stage3RadiusInput) {
    stage3RadiusInput.addEventListener('input', (event) => {
        const newRadius = parseFloat(event.target.value);
        if (!isNaN(newRadius) && newRadius > 0) {
            rocketSimulator.simulation.stages[2].rocketRadius = newRadius;
            rocketSimulator.updateMultiStageRocket(newRadius, 2);
        }
    })
}

function toggleInterface() {
    let currentRadius;
    if (modeMulti.checked) {
        singleStageInput.style.display = 'none';
        multiStageInput.style.display = 'block';
        const s1RadiusInput = document.getElementById('s1_radius');
        if (s1RadiusInput) {
            currentRadius = parseFloat(s1RadiusInput.value) || 1;
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
        console.log(rocketSimulator.simulation.stages);
        rocketSimulator.updateRocket(currentRadius);
    }
}

