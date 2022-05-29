import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber'

function Cube(props) {
  // This reference will give us direct access to the mesh
  const mesh = useRef()
  // Set up state for the hovered and active state
  const [hovered, setHover] = useState(false)
  const [active, setActive] = useState(false)
  // Subscribe this component to the render-loop, rotate the mesh every frame
  useFrame((state, delta) => {
    mesh.current.rotation.x += 0.01
    mesh.current.rotation.y += 0.01
  })
  // Return view, these are regular three.js elements expressed in JSX
  return (
    <mesh
      {...props}
      ref={mesh}
      scale={active ? 1.5 : 1}
      onClick={() => setActive(!active)}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
    </mesh>
  )
}

const App = () => {
  return (
    <Canvas>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Cube position={[0, 0, 0]} />
    </Canvas>
  );
}

export default App
