import { createRoot } from 'react-dom/client'
import { Suspense } from 'react'
import Three from './components/three'
import ThreeOffscreen from './components/three-offscreen'
import ThreeFiber from './components/three-fiber'
import './styles.css'

const { pathname } = location

createRoot(document.getElementById('root')).render(
  <>
    <Suspense fallback={null}>
      {pathname === '/three' && <Three />}
      {pathname === '/three-offscreen' && <ThreeOffscreen />}
      {pathname === '/three-fiber' && <ThreeFiber />}
    </Suspense>
  </>,
)
