import React, { useEffect } from 'react';

const App = () => {
  const canvasRef = React.useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    const offscreen = canvasRef.current.transferControlToOffscreen();

    const worker = new Worker(new URL('./worker.js', import.meta.url));

    worker.postMessage( {
      drawingSurface: offscreen,
      width: canvas.clientWidth,
      height: canvas.clientHeight,
      pixelRatio: window.devicePixelRatio,
    }, [ offscreen ] );
  }, []);

  return (
    <canvas ref={canvasRef} />
  );
}

export default App
