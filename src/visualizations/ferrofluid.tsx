// import GUI from 'lil-gui';
import {
  createEffect
} from 'solid-js';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { createNoise3D } from 'simplex-noise';

export default function FerroFluid() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  // const gui = new GUI();


  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);

  const geometry = new THREE.SphereGeometry(4, 64, 32);

  /**
   * Wobble
   */
  // Material
  const material = new THREE.MeshPhysicalMaterial({
    metalness: 0.66,
    roughness: 0.33,
    color: '#1f212a',
    transmission: 0,
    ior: 1.85,
    thickness: 1,
    transparent: false,
    wireframe: false
  })

  // Tweaks
  // gui.add(material, 'metalness', 0, 1, 0.001)
  // gui.add(material, 'roughness', 0, 1, 0.001)
  // gui.add(material, 'transmission', 0, 1, 0.001)
  // gui.add(material, 'ior', 0, 10, 0.001)
  // gui.add(material, 'thickness', 0, 10, 0.001)
  // gui.addColor(material, 'color')

  const sphere = new THREE.Mesh(geometry, material);
  sphere.castShadow = true;
  scene.add(sphere);

  const light = new THREE.AmbientLight(0x8040a0); // soft white light
  scene.add(light);

  const directionalLight = new THREE.DirectionalLight(0xff5370, 2);
  directionalLight.shadow.mapSize.set(1024, 1024)
  directionalLight.shadow.camera.far = 15
  directionalLight.shadow.normalBias = 0.05
  directionalLight.position.set(0, 5, 0)
  scene.add(directionalLight);

  const directionalLight2 = new THREE.DirectionalLight(0x2fafcf, 2);
  directionalLight2.shadow.mapSize.set(1024, 1024)
  directionalLight2.shadow.camera.far = 15
  directionalLight2.shadow.normalBias = 0.05
  directionalLight2.position.set(5.25, 2, 5)
  scene.add(directionalLight2);

  const directionalLight3 = new THREE.DirectionalLight(0xc220ff, 2);
  directionalLight3.shadow.mapSize.set(1024, 1024)
  directionalLight3.shadow.camera.far = 15
  directionalLight3.shadow.normalBias = 0.05
  directionalLight3.position.set(-5.25, -5, 2)
  scene.add(directionalLight3);


  // Add a surface at z = -1 for shadows, with 10 x 10 size
  // const planeGeometry = new THREE.PlaneGeometry(20, 20);
  // const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x101010 });
  // const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  // plane.receiveShadow = true;
  // plane.rotation.x = - Math.PI / 2;
  // plane.position.y = -2;
  // scene.add(plane);

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  controls.update();
  camera.position.z = 5;


  const noise3D = createNoise3D();
  function animate() {
    requestAnimationFrame(animate);



    const time = performance.now() * 0.001;
    const positionAttribute = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i);

      const noise = noise3D(vertex.x * 0.5 + time / 2, vertex.y * 0.5 + time / 2, vertex.z * 0.5 + time / 2);
      // Calculate noise value for current vertex
      // const noise = simpleNoise(
      //   vertex.x + time * 0.05,
      //   vertex.y + time * 0.05,
      //   vertex.z + time * 0.05
      // );

      // Update vertex position
      const scale = 1 + noise * 0.2; // Adjust the scale factor for more/less spikes
      vertex.setLength(2 * scale);

      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();

    sphere.geometry.computeVertexNormals();



    sphere.rotation.x += 0.002;
    sphere.rotation.y += 0.002;

    directionalLight.position.x = Math.sin(time) * 2;
    directionalLight.position.z = Math.cos(time) * 3;

    directionalLight2.position.x = Math.sin(time + Math.PI) * 2;
    directionalLight2.position.z = Math.cos(time + Math.PI) * 3;

    directionalLight3.position.x = Math.sin(time + Math.PI / 2) * 2;
    directionalLight3.position.z = Math.cos(time + Math.PI / 2) * 3;

    controls.update();
    renderer.render(scene, camera);
  };
  createEffect(() => {
    animate();
  });
  return (
    <div>
      {renderer.domElement}
    </div>
  );
}
