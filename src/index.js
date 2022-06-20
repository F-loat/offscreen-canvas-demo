import { createRoot } from 'react-dom/client'
import { Suspense, useState } from 'react'
import Three from './components/three'
import ThreeOffscreen from './components/three-offscreen'
import ThreeFiber from './components/three-fiber'
import ThreeFiberCustom from './components/three-fiber-custom'
import ThreeFiberOffscreen from './components/three-fiber-offscreen'
import './styles.css'

const { pathname } = location

function jank() {
	for ( let i = 0; i < 10000000; i ++ ) {
		Math.random()
	}
}

const routes = {
  '/offscreen-canvas-demo/three': Three,
  '/offscreen-canvas-demo/three-offscreen': ThreeOffscreen,
  '/offscreen-canvas-demo/three-fiber': ThreeFiber,
  '/offscreen-canvas-demo/three-fiber-custom': ThreeFiberCustom,
  '/offscreen-canvas-demo/three-fiber-offscreen': ThreeFiberOffscreen
}

const Comp = routes[pathname]

let interval = null

const Root = () => {
  const [count, setCount] = useState(0)

  const toggleJank = () => {
		if (interval === null) {
			interval = setInterval(() => {
        jank()
        setCount(count => count + 1)
      }, 1000 / 60)
		} else {
			clearInterval(interval)
			interval = null
      setCount(0)
		}
  }

  return (
    <Suspense fallback={null}>
      {Comp ? <Comp /> : (
        <div className="flex flex-1">
          <ThreeFiber />
          <ThreeFiberOffscreen />
        </div>
      )}
      <div className="counter">
        <button onClick={toggleJank}>
          {count ? 'STOP JANK' : 'START JANK'}
        </button>
        {count ? <div>{count}</div> : null}
      </div>
      <ul className="nav">
        {Object.keys(routes).map((route) => (
          <li key={route}>
            <a href={route} className={pathname === route ? 'highlight' : ''}>
              {route
                .replace('/offscreen-canvas-demo', '')
                .replace(/[-|\/](\w)/g, ($, $1) => $1.toUpperCase())}
            </a>
          </li>
        ))}
      </ul>
    </Suspense>
  )
}

createRoot(document.getElementById('root')).render(<Root />)
