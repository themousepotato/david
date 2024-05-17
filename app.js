// visualizer.js
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');

// Increase canvas size
const scaleFactor = 1.2;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const numPoints = 50;
const radius = 80 * scaleFactor; // Adjust radius based on scale factor
let points = [];
let centerX = canvas.width / 2;
let centerY = canvas.height / 2;
const boxPadding = 50; // Padding from canvas edges
const boxWidth = canvas.width - 2 * boxPadding;
const boxHeight = canvas.height - 2 * boxPadding;

for (let i = 0; i < numPoints; i++) {
    let angle = (i / numPoints) * Math.PI * 2;
    points.push({
        angle: angle,
        radiusOffset: Math.random() * 30 * scaleFactor, // Adjust radius offset based on scale factor
        x: centerX,
        y: centerY,
        type: 'default' // Default type for all points initially
    });
}

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256; // Increased fftSize for more frequency bands
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
const damping = 0.05;
// Adjust base oscillation speed based on audio level to reduce speed when no audio is present
const baseOscillationSpeed = 0.0002; // Initial base oscillation speed
const minOscillationSpeed = 0.0001; // Minimum oscillation speed when no audio is present
// Define maximum oscillation amplitude
let maxAmplitude = 5;
// Define rhythm modulation factor
let rhythmModulationFactor = 0.5; // Adjust to change the intensity of rhythm modulation
// Define audio sensitivity
const audioSensitivity = 0.8; // Adjust to increase or decrease sensitivity to audio input

function animate() {
    requestAnimationFrame(animate);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the bounding box
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxPadding, boxPadding, boxWidth, boxHeight);

    analyser.getByteFrequencyData(dataArray);

    const audioLevel = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

    // Scale radius adjustment and oscillation speed based on audio level
    const radiusAdjustment = audioLevel * audioSensitivity;
    const oscillationSpeed = Math.max(baseOscillationSpeed * audioLevel * audioSensitivity, minOscillationSpeed);

    ctx.beginPath();

    for (let i = 0; i < numPoints; i++) {
        let point = points[i];
        let stretchFactor = 1 + Math.sin(performance.now() * baseOscillationSpeed + point.angle) * radiusAdjustment * 0.05;
        let adjustedRadius = radius + point.radiusOffset + radiusAdjustment * stretchFactor;
        let targetX = centerX + adjustedRadius * Math.cos(point.angle);
        let targetY = centerY + adjustedRadius * Math.sin(point.angle);

        // Apply damping
        point.x += (targetX - point.x) * damping;
        point.y += (targetY - point.y) * damping;

        // Ensure points stay within the bounding box
        if (point.x < boxPadding) point.x = boxPadding;
        if (point.x > canvas.width - boxPadding) point.x = canvas.width - boxPadding;
        if (point.y < boxPadding) point.y = boxPadding;
        if (point.y > canvas.height - boxPadding) point.y = canvas.height - boxPadding;

        // Apply rhythmic oscillation modulation
        let rhythmModulation = Math.sin(performance.now() * baseOscillationSpeed * rhythmModulationFactor) * 0.05;
        let angleModulation = Math.sin(performance.now() * baseOscillationSpeed * rhythmModulationFactor * 2) * 0.05; // Adjust to change modulation frequency

        // Apply subtle oscillation with reduced randomness
        point.angle += rhythmModulation + angleModulation;

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

    // Close the path and fill the shape with gradient
    ctx.closePath();

    // Create a radial gradient for a dark ferrofluid effect
    let gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.1, centerX, centerY, radius);
    gradient.addColorStop(0, 'rgba(20, 20, 40, 1)');
    gradient.addColorStop(0.5, 'rgba(10, 10, 30, 1)');
    gradient.addColorStop(1, 'rgba(0, 0, 20, 1)');

    ctx.fillStyle = gradient;
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
