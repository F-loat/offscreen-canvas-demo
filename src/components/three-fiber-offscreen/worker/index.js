import { useState, useEffect } from 'react'
import * as THREE from 'three'
import { extend, createRoot } from '@react-three/fiber'
// import { extend, render } from 'r3f6'
import { emitter, createPointerEvents } from './events'
import Comp from './comp'

extend(THREE)

let root;

const CompWrapper = (initialProps) => {
  const [store, setStore] = useState({})
  const [props, setProps] = useState(initialProps)

  useEffect(() => {
    emitter.on('props', p => {
      setProps(p)
      setStore({ props: p })
    })
    return () => {
      emitter.off('props', setProps)
    }
  }, [])

  return <Comp {...props} />
}

const handleInit = (payload) => {
  const { props, drawingSurface: canvas, width, height, pixelRatio } = payload;

  root = createRoot(canvas)

  root.configure({
    events: createPointerEvents,
    size: {
      width,
      height,
      updateStyle: false
    },
    dpr: pixelRatio,
  })

  root.render(<CompWrapper {...props} />)

  // r3f6
  // render(<CompWrapper {...props} />, canvas, {
  //   events: createPointerEvents,
  //   size: {
  //     width,
  //     height,
  //     updateStyle: false
  //   },
  //   dpr: pixelRatio,
  // })
}

const handleResize = ({ width, height }) => {
  if (!root) return;
  root.configure({
    size: {
      width,
      height,
      updateStyle: false
    },
  })
}

const handleEvents = (payload) => {
  emitter.emit(payload.eventName, payload)
  emitter.on('disconnect', () => {
    self.postMessage({ type: 'dom_events_disconnect' })
  })
}

const handleProps = (payload) => {
  emitter.emit('props', payload)
}

const handlerMap = {
  'resize': handleResize,
  'init': handleInit,
  'dom_events': handleEvents,
  'props': handleProps,
}

self.onmessage = (event) => {
  const { type, payload } = event.data
  const handler = handlerMap[type]
  if (handler) handler(payload)
}

self.window = {}
