import { createRoot } from 'react-dom/client'
import { Suspense, useState, useEffect } from 'react'
import Three from './components/three'
import ThreeOffscreen from './components/three-offscreen'
import ThreeFiber from './components/three-fiber'
import ThreeFiberCustom from './components/three-fiber-custom'
import ThreeFiberOffscreen from './components/three-fiber-offscreen'
import './styles.css'

const { pathname } = location

function jank() {
	let number = 0;
	for ( let i = 0; i < 10000000; i ++ ) {
		number += Math.random();
	}
	result.textContent = number;
}

let interval = null;

const Root = () => {
  const [count, setCount] = useState(0)

  useEffect(() => {
		if (interval === null) {
      // START JANK
			// interval = setInterval(jank, 1000 / 60);
		} else {
			clearInterval(interval);
			interval = null;
		}

    // START RENDER
    // setInterval(() => setCount(count => count + 1), 1000 / 60);
  }, [])

  return (
    <>
      <Suspense fallback={null}>
        {pathname === '/three' && <Three />}
        {pathname === '/three-offscreen' && <ThreeOffscreen />}
        {pathname === '/three-fiber' && <ThreeFiber />}
        {pathname === '/three-fiber-custom' && <ThreeFiberCustom />}
        {pathname === '/three-fiber-offscreen' && <ThreeFiberOffscreen />}
        <div className="counter">{count}</div>
      </Suspense>
    </>
  )
}

createRoot(document.getElementById('root')).render(<Root />)
