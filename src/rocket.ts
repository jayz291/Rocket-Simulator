import * as THREE from 'three';
import { multiStageMode } from "./main.js";
import type { StageData } from './types.js';

export class Rocket {
    mesh: THREE.Group;
    stage1!: THREE.Group;
    stage2!: THREE.Group;
    stage3!: THREE.Group;
    stageMeshes!: THREE.Group[];
    fins!: THREE.Group;
    exhaust!: THREE.Points;
    particleCount!: number;
    particleGeometry!: THREE.BufferGeometry;
    particleVelocities!: {x: number, y: number, z: number } [];
    constructor(stages: any[]) {
        //console.log(stages);
        this.mesh = new THREE.Group();
        this.mesh.position.set(0, stages[0].rocketRadius * 6, 0);
        if (multiStageMode.checked) {
            this.buildMultiStageRocket(stages);
        } else {
            this.buildRocket(stages);
        }
    }
    buildMultiStageRocket(stages: any[]) {
        
        let stage1Radius = stages[0].rocketRadius;
        let stage2Radius = stages[1].rocketRadius;
        
        
        const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        material.depthWrite = true;
        material.transparent = false;
 
        
        this.addFins(stage1Radius, material);

        this.stage1 = new THREE.Group();
        const cylinder = new THREE.CylinderGeometry(stage1Radius, stage1Radius, stage1Radius * 4, 32);
        const stage1Mesh = new THREE.Mesh(cylinder, material);

        this.stage1.add(stage1Mesh);
        this.stage1.add(this.fins);
        this.addParticles(stage1Radius)

        this.stage2 = new THREE.Group();
        

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
    buildRocket(stages: any[]) {
        let radius = stages[0].rocketRadius;
        const cylinder = new THREE.CylinderGeometry(radius, radius, radius * 6, 32);
        const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        material.depthWrite = true;
        material.transparent = false;
        const cylinderMesh = new THREE.Mesh(cylinder, material);
      
        const cone = new THREE.ConeGeometry(radius, radius * 2, 32);
        const coneMesh = new THREE.Mesh(cone, material);
        coneMesh.position.y = radius * 4;

        this.addFins(radius, material);
        this.addParticles(radius);

        this.mesh.add(coneMesh);
        this.mesh.add(cylinderMesh);
        this.mesh.add(this.fins);
        this.mesh.add(this.exhaust);
    }
    buildStage(radius: number, nextRadius: number, material: THREE.MeshLambertMaterial) {
        let stage = new THREE.Group();
        const totalHeight = radius * 4; 
        const bottomHeight = totalHeight * 0.75; 
        const topHeight = totalHeight * 0.25;

        const cylinder = new THREE.CylinderGeometry(radius, radius, bottomHeight, 32);
        const cylinder2 = new THREE.CylinderGeometry(nextRadius, radius, topHeight, 32);
        const cylinderMesh = new THREE.Mesh(cylinder, material);
        const cylinder2Mesh = new THREE.Mesh(cylinder2, material);
        cylinderMesh.position.y = 0;
        cylinder2Mesh.position.y = (topHeight / 2);

        stage.add(cylinderMesh);
        stage.add(cylinder2Mesh);
        return stage;
    }
    addFins(radius: number, material: THREE.MeshLambertMaterial) {
        this.fins = new THREE.Group();
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
        this.fins.add(finMesh);
        this.fins.add(finMesh2);
        this.fins.add(finMesh3);
    }
    addParticles(radius: number) {
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
    updateParticles(isThrusting: boolean, radius: number) {
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
    separateStage(stageIndex: number, stagesData: StageData[]) {
        if (!this.stageMeshes || !this.stageMeshes[stageIndex]) {
            return;
        }
        //let stages = this.simulation.stages;
        const meshToDetach = this.stageMeshes[stageIndex];
        const worldPos = new THREE.Vector3();
        meshToDetach.getWorldPosition(worldPos);
        //worldPos.y -= 3 * stagesData[stageIndex].rocketRadius;

        this.mesh.remove(meshToDetach);
        meshToDetach.position.copy(worldPos);

        if (stageIndex == 0) {
            this.exhaust.position.y = stagesData[0].rocketRadius * 2 + stagesData[1].rocketRadius * 2;
        } else if (stageIndex == 1) {
            this.exhaust.position.y = stagesData[0].rocketRadius * 2 + stagesData[1].rocketRadius * 4 + 
                stagesData[2].rocketRadius * 2;
        }
        return meshToDetach;
    }
}