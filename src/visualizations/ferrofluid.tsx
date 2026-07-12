import { createEffect, onCleanup } from 'solid-js';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils';
import { createNoise3D } from 'simplex-noise';

// Digital ferrofluid in the spirit of the BurnSlap FAV: the surface is a
// spring/tension sheet, and audio drives "electromagnet" spike sites that
// pull Rosensweig-style spikes out of it. Bands are auto-gain normalized and
// onset-driven so the blob tracks the music's transients, not its raw volume.

const BASE_RADIUS = 1.35;

// Surface physics (per-vertex radial spring with neighbor tension)
const SPRING = 70;
const DAMPING = 5.5;
const TENSION = 130; // neighbor coupling: lets ripples travel across the surface
const MIN_U = -0.3;
const MAX_U = 0.65;

export default function FerroFluid() {
  let mountRef;
  let animationFrame;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0xffffff, 1); // Set background to white
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  // Environment reflections give the surface its liquid-metal sheen
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  // Icosphere so vertices are evenly spaced — the tension term needs a uniform
  // mesh. Drop uv/normal first: mergeVertices only welds vertices whose
  // attributes all match, so the uv seam would otherwise stay split and show
  // up as a stitched line across the blob.
  const rawGeometry = new THREE.IcosahedronGeometry(BASE_RADIUS, 30);
  rawGeometry.deleteAttribute('uv');
  rawGeometry.deleteAttribute('normal');
  const geometry = mergeVertices(rawGeometry);
  geometry.computeVertexNormals();
  const positionAttribute = geometry.attributes.position;
  const count = positionAttribute.count;

  const directions = new Float32Array(count * 3);
  {
    const v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      v.fromBufferAttribute(positionAttribute, i).normalize();
      directions[i * 3] = v.x;
      directions[i * 3 + 1] = v.y;
      directions[i * 3 + 2] = v.z;
    }
  }

  // Vertex adjacency, flattened for the per-frame Laplacian
  const { neighborStart, neighborList } = (() => {
    const sets = Array.from({ length: count }, () => new Set<number>());
    const index = geometry.index.array;
    for (let t = 0; t < index.length; t += 3) {
      const a = index[t], b = index[t + 1], c = index[t + 2];
      sets[a].add(b).add(c);
      sets[b].add(a).add(c);
      sets[c].add(a).add(b);
    }
    const start = new Uint32Array(count + 1);
    for (let i = 0; i < count; i++) start[i + 1] = start[i] + sets[i].size;
    const list = new Uint32Array(start[count]);
    for (let i = 0, p = 0; i < count; i++) for (const n of sets[i]) list[p++] = n;
    return { neighborStart: start, neighborList: list };
  })();

  const displacement = new Float32Array(count);
  const velocity = new Float32Array(count);
  const force = new Float32Array(count);

  // Spike sites: fixed lattice points on the sphere where the "field"
  // concentrates. Coarse sites make big bass mounds, fine sites make the
  // dense sharp treble spikes.
  function fibonacciSphere(n) {
    const pts = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - ((i + 0.5) * 2) / n;
      const r = Math.sqrt(1 - y * y);
      pts.push(new THREE.Vector3(Math.cos(golden * i) * r, y, Math.sin(golden * i) * r));
    }
    return pts;
  }

  function buildSpikeSystem(centerCount, sigma) {
    const centers = fibonacciSphere(centerCount);
    const cutoff = sigma * 2.5;
    const inv2s2 = 1 / (2 * sigma * sigma);
    const pairVert = [], pairCenter = [], pairWeight = [];
    for (let i = 0; i < count; i++) {
      const dx = directions[i * 3], dy = directions[i * 3 + 1], dz = directions[i * 3 + 2];
      for (let c = 0; c < centers.length; c++) {
        const dot = Math.min(1, Math.max(-1, dx * centers[c].x + dy * centers[c].y + dz * centers[c].z));
        const angle = Math.acos(dot);
        if (angle < cutoff) {
          pairVert.push(i);
          pairCenter.push(c);
          pairWeight.push(Math.exp(-angle * angle * inv2s2));
        }
      }
    }
    return {
      centers,
      activation: new Float32Array(centers.length),
      pairVert: Uint32Array.from(pairVert),
      pairCenter: Uint32Array.from(pairCenter),
      pairWeight: Float32Array.from(pairWeight),
    };
  }

  const coarseSpikes = buildSpikeSystem(42, 0.32);
  const fineSpikes = buildSpikeSystem(150, 0.17);

  const noise3D = createNoise3D();

  // Each site pulses and wanders on its own so the pattern crawls like the
  // shifting field of the real thing
  function updateActivations(sys, drive, time, speed, freq) {
    for (let c = 0; c < sys.centers.length; c++) {
      const p = sys.centers[c];
      const n = 0.5 + 0.5 * noise3D(p.x * freq + time * speed, p.y * freq - time * speed, p.z * freq + time * speed * 0.7);
      sys.activation[c] = drive * n * n;
    }
  }

  function accumulateForce(sys) {
    for (let p = 0; p < sys.pairVert.length; p++) {
      force[sys.pairVert[p]] += sys.activation[sys.pairCenter[p]] * sys.pairWeight[p];
    }
  }

  const material = new THREE.MeshPhysicalMaterial({
    metalness: 1,
    roughness: 0.15,
    color: '#101010', // Dark gray color
    clearcoat: 0.6,
    clearcoatRoughness: 0.25,
    envMapIntensity: 1.2
  });

  const sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);

  const light = new THREE.AmbientLight(0x101010); // Soft dark gray light
  scene.add(light);

  const directionalLight = new THREE.DirectionalLight(0x303030, 2); // Darker gray light
  directionalLight.position.set(0, 5, 0);
  scene.add(directionalLight);

  const directionalLight2 = new THREE.DirectionalLight(0x202020, 2); // Darker gray light
  directionalLight2.position.set(5.25, 2, 5);
  scene.add(directionalLight2);

  const directionalLight3 = new THREE.DirectionalLight(0x101010, 2); // Dark gray light
  directionalLight3.position.set(-5.25, -5, 2);
  scene.add(directionalLight3);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  controls.update();
  camera.position.z = 5;

  let audioContext, analyser, dataArray;

  async function setupAudio() {
    try {
      // Browser mic processing is tuned for speech and crushes music —
      // disable it or the analyser sees a gated, pumped signal
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.3;
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);
    } catch {
      // No mic access: the idle simmer still runs
    }
  }

  function bandAverage(from, to) {
    let sum = 0;
    for (let i = from; i < to; i++) sum += dataArray[i];
    return sum / ((to - from) * 255);
  }

  // Fast attack / slow release so hits land instantly but decay like fluid
  function follow(current, target, dt) {
    const rate = target > current ? 18 : 5;
    return current + (target - current) * Math.min(1, rate * dt);
  }

  // Per-band auto-gain: each band is normalized by its own slowly decaying
  // peak, so reactivity adapts to mic level / mix instead of absolute volume
  const peaks = { bass: 0.1, lowMid: 0.1, highMid: 0.08, treble: 0.06 };
  function normalize(band, value, dt) {
    peaks[band] = Math.max(peaks[band] * Math.exp(-dt / 6), value, band === 'treble' ? 0.06 : 0.1);
    return value / peaks[band];
  }

  let bassSm = 0, lowMidSm = 0, highSm = 0, loudSm = 0;
  let prevBassN = 0, prevHighN = 0;
  let onsetLow = 0, onsetHigh = 0;

  const bassHistory = new Float32Array(45);
  let historyIndex = 0;
  let lastBeat = -10;

  let swell = 1, swellVel = 0;
  let jumpPos = 0, jumpVel = 0;

  const clock = new THREE.Clock();

  function animate() {
    animationFrame = requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.033);
    const time = performance.now() * 0.001;

    let bassN = 0, lowMidN = 0, highN = 0;
    if (analyser) {
      analyser.getByteFrequencyData(dataArray);
      bassN = normalize('bass', bandAverage(1, 6), dt);
      lowMidN = normalize('lowMid', bandAverage(6, 25), dt);
      const highMidN = normalize('highMid', bandAverage(25, 97), dt);
      const trebleN = normalize('treble', bandAverage(97, 384), dt);
      highN = highMidN * 0.5 + trebleN * 0.5;
    }
    bassSm = follow(bassSm, bassN, dt);
    lowMidSm = follow(lowMidSm, lowMidN, dt);
    highSm = follow(highSm, highN, dt);
    loudSm = follow(loudSm, (bassN + lowMidN + highN) / 3, dt);

    // Onset envelopes (positive spectral flux): spike on hits, die out fast,
    // so sustained rumble doesn't keep the blob inflated
    onsetLow = Math.max(onsetLow * Math.exp(-dt * 6), Math.min((bassN - prevBassN) * 6, 1.5));
    onsetHigh = Math.max(onsetHigh * Math.exp(-dt * 7), Math.min((highN - prevHighN) * 5, 1.5));
    prevBassN = bassN;
    prevHighN = highN;

    // Beat: bass transient above its rolling average kicks the whole system
    bassHistory[historyIndex] = bassN;
    historyIndex = (historyIndex + 1) % bassHistory.length;
    let bassAvg = 0;
    for (let i = 0; i < bassHistory.length; i++) bassAvg += bassHistory[i];
    bassAvg /= bassHistory.length;

    let beatKick = 0;
    if (bassN > 0.3 && bassN > bassAvg * 1.3 && time - lastBeat > 0.15) {
      lastBeat = time;
      const strength = Math.min(bassN / (bassAvg + 1e-4) - 1, 2);
      beatKick = 0.15 * (0.6 + strength * 0.5);
      swellVel += 0.5 * (0.5 + strength * 0.4);
      jumpVel += 0.5 * (0.5 + strength * 0.5);
    }

    // Sustained level supplies a base, onsets supply the punch; small idle
    // floor keeps the blob simmering in silence
    const coarseDrive = 1.8 + 8 * (bassSm * 0.8 + lowMidSm * 0.4) + 15 * onsetLow;
    const fineDrive = 1.4 + 9 * highSm + 12 * onsetHigh;

    updateActivations(coarseSpikes, coarseDrive, time, 0.5, 1.3);
    updateActivations(fineSpikes, fineDrive, time, 1.0, 2.4);
    force.fill(0);
    accumulateForce(coarseSpikes);
    accumulateForce(fineSpikes);

    // Whole-blob throb and hop, both springy and subtle
    const swellTarget = 1 + loudSm * 0.06;
    swellVel += (-(swell - swellTarget) * 40 - swellVel * 7) * dt;
    swell += swellVel * dt;

    jumpVel += (-jumpPos * 55 - jumpVel * 6) * dt;
    jumpPos += jumpVel * dt;

    // Integrate the surface and write positions
    for (let i = 0; i < count; i++) {
      let lap = 0;
      const s = neighborStart[i], e = neighborStart[i + 1];
      for (let n = s; n < e; n++) lap += displacement[neighborList[n]];
      lap = lap / (e - s) - displacement[i];

      let v = velocity[i] + (force[i] - SPRING * displacement[i] - DAMPING * velocity[i] + TENSION * lap) * dt;
      if (beatKick) v += force[i] * beatKick;
      let u = displacement[i] + v * dt;
      if (u > MAX_U) { u = MAX_U; v = Math.min(v, 0); }
      else if (u < MIN_U) { u = MIN_U; v = Math.max(v, 0); }
      velocity[i] = v;
      displacement[i] = u;

      // Quadratic term sharpens crests into spikes, leaves troughs shallow
      const sharp = u > 0 ? u * u * 1.5 : 0;
      const r = BASE_RADIUS * swell * (1 + u + sharp);
      positionAttribute.setXYZ(i, directions[i * 3] * r, directions[i * 3 + 1] * r, directions[i * 3 + 2] * r);
    }
    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();

    sphere.position.y = jumpPos;
    const stretch = THREE.MathUtils.clamp(1 + Math.abs(jumpVel) * 0.1, 1, 1.3);
    sphere.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));

    sphere.rotation.y += 0.002 + loudSm * 0.004;
    sphere.rotation.x += 0.001;

    directionalLight.position.x = Math.sin(time) * 2;
    directionalLight.position.z = Math.cos(time) * 3;

    directionalLight2.position.x = Math.sin(time + Math.PI) * 2;
    directionalLight2.position.z = Math.cos(time + Math.PI) * 3;

    directionalLight3.position.x = Math.sin(time + Math.PI / 2) * 2;
    directionalLight3.position.z = Math.cos(time + Math.PI / 2) * 3;

    controls.update();
    renderer.render(scene, camera);
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  createEffect(() => {
    setupAudio();
    animate();
    window.addEventListener('resize', onResize);
  });

  onCleanup(() => {
    cancelAnimationFrame(animationFrame);
    window.removeEventListener('resize', onResize);
    if (audioContext) audioContext.close();
    controls.dispose();
    geometry.dispose();
    material.dispose();
    pmrem.dispose();
    renderer.dispose();
  });

  return (
    <div ref={el => mountRef = el}>
      {mountRef && mountRef.appendChild(renderer.domElement)}
    </div>
  );
}
