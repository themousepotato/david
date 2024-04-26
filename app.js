window.onload = function() {
    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d');
    let audioContext = null;
    let analyser = null;
    let dataArray = null;

    function initializeAudio() {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(function(stream) {
                const source = audioContext.createMediaStreamSource(stream);
                source.connect(analyser);

                // Start visualizations here
                draw();
            })
            .catch(function(err) {
                console.log('Error accessing microphone:', err);
            });
    }

    function draw() {
        const WIDTH = canvas.width;
        const HEIGHT = canvas.height;

        requestAnimationFrame(draw);

        analyser.getByteFrequencyData(dataArray);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        const barWidth = (WIDTH / dataArray.length) * 2.5;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
            const barHeight = dataArray[i] * 2;

            ctx.fillStyle = `rgb(0, 0, 0)`;
            ctx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight);

            x += barWidth + 1;
        }
    }

    // Event listener for user interaction (e.g., button click)
    document.getElementById('startButton').addEventListener('click', function() {
        if (audioContext === null) {
            initializeAudio();
        }
    });
};