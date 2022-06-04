import React, { useState } from 'react'
import OffscreenCanvas from './offscreen-canvas'

const App = () => {
  const [position, setPosition] = useState([0, 0, 0]);

  const handleClick = () => {
    setPosition([Math.random() * 2 - 1, Math.random() * 2 - 1, 0])
  }

  return (
    <OffscreenCanvas position={position} onClick={handleClick} />
  )
}

export default App
