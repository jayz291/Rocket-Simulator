import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const simulationBox = document.getElementById('simulation');

class RocketSimulator {
    constructor() {
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer();
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

class Stats {
    deltat;
    planetMass;
    planetRadius;
    atmosphereThickness;
    airDensity;
    scaleHeight;
    crossSectionalArea;
    rocketMass;
    fuelMass;
    fuelConsumptionRate;
    thrustForce;
}

const rocketSimulator = new RocketSimulator();