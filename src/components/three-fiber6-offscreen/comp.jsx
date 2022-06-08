import React, { useRef, useState } from 'react'
import { useFrame } from 'r3f6'

function Cube(props) {
  const mesh = useRef()

  const [hovered, setHover] = useState(false)
  const [active, setActive] = useState(false)

  useFrame((state, delta) => {
    mesh.current.rotation.x += 0.01
    mesh.current.rotation.y += 0.01
  })

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

const Comp = ({ position }) => {
  return (
    <>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Cube position={position} />
    </>
  );
}

export default Comp
