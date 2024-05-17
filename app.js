const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');

// Increase canvas size
const scaleFactor = 1.2;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const numPoints = 20;
const radius = 500 * scaleFactor; // Adjust radius based on scale factor
let points = [];
let centerX = canvas.width / 2;
let centerY = canvas.height / 2;

for (let i = 0; i < numPoints; i++) {
    let angle = (i / numPoints) * Math.PI * 2;
    points.push({
        angle: angle,
        radiusOffset: Math.random() * 30 * scaleFactor // Adjust radius offset based on scale factor
    });
}

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 32;
const dataArray = new Uint8Array(analyser.frequencyBinCount);

navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        animate();
    })
    .catch(err => {
        console.error('Error accessing audio stream:', err);
    });

// Define damping factor
const damping = 0.01;
// Adjust base oscillation speed based on audio level to reduce speed when no audio is present
const baseOscillationSpeed = 0.00002; // Initial base oscillation speed
const minOscillationSpeed = 0.00001; // Minimum oscillation speed when no audio is present
// Define maximum oscillation amplitude
let maxAmplitude = 10;
// Define rhythm modulation factor
let rhythmModulationFactor = 1.0; // Adjust to change the intensity of rhythm modulation
// Define audio sensitivity
const audioSensitivity = 0.5; // Adjust to increase or decrease sensitivity to audio input

// Define arrays to store previous positions of points
let prevX = [];
let prevY = [];

function animate() {
    requestAnimationFrame(animate);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    analyser.getByteFrequencyData(dataArray);

    const audioLevel = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

    // Scale radius adjustment and oscillation speed based on audio level
    const radiusAdjustment = audioLevel * audioSensitivity;
    const oscillationSpeed = Math.max(baseOscillationSpeed * audioLevel * audioSensitivity, minOscillationSpeed);

    ctx.beginPath();

    for (let i = 0; i < numPoints; i++) {
        let point = points[i];
        let adjustedRadius = radius + point.radiusOffset + radiusAdjustment * i / numPoints;
        let targetX = centerX + adjustedRadius * Math.cos(point.angle);
        let targetY = centerY + adjustedRadius * Math.sin(point.angle);

        // Apply damping
        point.x += (targetX - point.x) * damping;
        point.y += (targetY - point.y) * damping;

        // Apply rhythmic oscillation modulation
        let rhythmModulation = Math.sin(performance.now() * baseOscillationSpeed * audioLevel * rhythmModulationFactor);
        let angleModulation = Math.sin(performance.now() * baseOscillationSpeed * audioLevel * rhythmModulationFactor * 2); // Adjust to change modulation frequency
        let randomOffset = (Math.random() * 2 - 1) * maxAmplitude;

        // Apply subtle oscillation with randomness
        point.angle += oscillationSpeed + rhythmModulation + angleModulation + randomOffset;

        // Draw curve to the point
        if (i === 0) {
            ctx.moveTo(point.x, point.y);
        } else {
            let prevPoint = points[i - 1];
            let xc = (point.x + prevPoint.x) / 2;
            let yc = (point.y + prevPoint.y) / 2;
            ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, xc, yc);
        }
    }

    ctx.closePath();
    ctx.fillStyle = 'black';
    ctx.fill();
}

// Initialize initial positions of points
for (let i = 0; i < numPoints; i++) {
    let angle = (i / numPoints) * Math.PI * 2;
    let x = centerX + (radius + points[i].radiusOffset) * Math.cos(angle);
    let y = centerY + (radius + points[i].radiusOffset) * Math.sin(angle);
    points[i].x = x;
    points[i].y = y;
    points[i].angle = angle;
}


window.addEventListener('resize', () => {
    canvas.width = window.innerWidth * scaleFactor;
    canvas.height = window.innerHeight * scaleFactor;
    centerX = canvas.width / 2;
    centerY = canvas.height / 2;
});
