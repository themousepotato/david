interface AnalyserConfig {
  fftSize?: number;
  onStream?: (stream: MediaStream) => void;
}
export const useAnalyzer = (config: AnalyserConfig) => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = config.fftSize;
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      if (config.onStream) {
        config.onStream(stream);
      }
    })
    .catch(err => {
      console.error('Error accessing audio stream:', err);
    });
  return analyser;
}
