import * as THREE from 'three';
import { useAnalyzer } from '../utils';

const config = {
  audioSensitivity: 12, // Adjust to increase or decrease sensitivity to audio input
}

export default function Bars() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);

  const geometry = new THREE.BoxGeometry();

  // We will add 64 cubes to represent the frequency bands
  const cubes = Array.from({ length: 64 }, (_, i) => {
    const color = new THREE.Color(`hsl(${(i / 64) * 360}, 100%, 50%)`);
    const material = new THREE.MeshBasicMaterial({ color });
    return new THREE.Mesh(geometry, material);
  })

  const cubeSep = 0.1;
  const cubeWidth = 0.2;
  cubes.forEach(cube => scene.add(cube));
  cubes.forEach((cube, i) => {
    // Position each cube in a line, -32 to 32
    cube.position.x = i * (cubeWidth + cubeSep) - 9.5;
    cube.scale.set(0.1, 0.1, 0.1);
  });

  // Position the camera on top of the center of circle and rotate to look at the center
  camera.position.y = 8;
  camera.lookAt(0, 0, 0);


  // const cube = new THREE.Mesh(geometry, material);
  const analyzer = useAnalyzer({
    fftSize: 256,
    onStream: stream => animate()
  })


  function animate() {
    requestAnimationFrame(animate);

    const dataArray = new Uint8Array(analyzer.frequencyBinCount);
    analyzer.getByteFrequencyData(dataArray);

    const audioLevels = Array.from({ length: 64 }, (_, i) => {
      const start = i * 2;
      const end = start + 2;
      return dataArray.slice(start, end).reduce((a, b) => a + b, 0) / 8;
    });

    const normalizedAudioLevels = audioLevels.map(level => level / 255);


    // Scale radius adjustment and oscillation speed based on audio level
    // const radiusAdjustment = audioLevel * config.audioSensitivity;
    cubes.forEach((cube, i) => {
      const audioLevel = normalizedAudioLevels[i];
      const radiusAdjustment = audioLevel * config.audioSensitivity;
      cube.scale.set(0.1, radiusAdjustment, radiusAdjustment);
      // cube.rotation.x += 0.001;
      cube.rotation.x += 0.01;
    });

    renderer.render(scene, camera);
  };

  return (
    <div>
      {renderer.domElement}
    </div>
  );
}
