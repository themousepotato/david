import { createEffect, createSignal } from 'solid-js';
import * as THREE from 'three';

const config = {
  audioSensitivity: 12, // Adjust to increase or decrease sensitivity to audio input
}
export default function Bars() {

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const analyser = audioContext.createAnalyser();
  // const [dataArray, setDataArray] = createSignal(new Uint8Array(analyser.frequencyBinCount));

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);

  const geometry = new THREE.BoxGeometry();

  // We will add 16 cubes to represent the frequency bands
  const cubes = Array.from({ length: 16 }, (_, i) => {
    const color = new THREE.Color(`hsl(${(i / 16) * 360}, 100%, 50%)`);
    const material = new THREE.MeshBasicMaterial({ color });
    return new THREE.Mesh(geometry, material);
  })

  cubes.forEach(cube => scene.add(cube));
  cubes.forEach((cube, i) => {
    // Position each cube in a circle around the center
    const angle = (i / cubes.length) * Math.PI * 2;
    const radius = 3;
    cube.position.x = Math.cos(angle) * radius;
    cube.position.z = Math.sin(angle) * radius;
    cube.scale.set(0.5, 0.5, 0.5);
  });

  // Position the camera on top of the center of circle and rotate to look at the center
  camera.position.y = 5;
  camera.position.x = 5;
  camera.lookAt(0, 0, 0);


  // const cube = new THREE.Mesh(geometry, material);


  function animate() {
    requestAnimationFrame(animate);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    // const audioLevel = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    // average the 128 frequency bands into 16 numbers
    const audioLevels = Array.from({ length: 16 }, (_, i) => {
      const start = i * 8;
      const end = start + 8;
      return dataArray.slice(start, end).reduce((a, b) => a + b, 0) / 8;
    });

    const normalizedAudioLevels = audioLevels.map(level => level / 255);

    // console.log('lengths', {
    //   dataArray,
    //   dataArrayL: dataArray.length,
    //   audioLevels: audioLevels.length
    // })

    // Scale radius adjustment and oscillation speed based on audio level
    // const radiusAdjustment = audioLevel * config.audioSensitivity;
    cubes.forEach((cube, i) => {
      const audioLevel = normalizedAudioLevels[i];
      const radiusAdjustment = audioLevel * config.audioSensitivity;
      cube.scale.set(1, radiusAdjustment, 1);
      // cube.rotation.x += 0.001;
      // cube.rotation.y += 0.001;
    });

    // console.log({ dataArray, audioLevel, radiusAdjustment });
    // cube.scale.set(1, radiusAdjustment, 1);
    // cube.rotation.x += 0.001;
    // cube.rotation.y += 0.001;

    renderer.render(scene, camera);
  };

  createEffect(() => {
    // animate();
    analyser.fftSize = 256; // Increased fftSize for more frequency bands

    // console.log({ dataArray });
    // setDataArray(dataArray);

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        animate();
      })
      .catch(err => {
        console.error('Error accessing audio stream:', err);
      });
  });
  return (
    <div>
      {renderer.domElement}
    </div>
  );
}
