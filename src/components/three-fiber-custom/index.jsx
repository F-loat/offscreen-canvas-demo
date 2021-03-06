import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three'
import { extend, useFrame, createRoot } from '@react-three/fiber'
import { createPointerEvents } from './events'

extend(THREE)

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
    <>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Cube position={[0, 0, 0]} />
    </>
  );
}

const AppWraper = () => {
  const canvasRef = useRef()

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = createRoot(canvasRef.current)

    root.configure({
      events: createPointerEvents,
      size: {
        width: canvas.clientWidth,
        height: canvas.clientHeight,
      }
    })

    root.render(<App />)

    return () => {
      location.reload()
    }
  }, [])

  return (
    <canvas ref={canvasRef} />
  )
}

export default AppWraper
