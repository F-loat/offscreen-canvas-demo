import { useState, useEffect } from 'react'
import * as THREE from 'three'
import { extend, render } from 'r3f6'
import { emitter, createPointerEvents } from './events'
import Comp from './comp'

extend(THREE)

const CompWrapper = (initialProps) => {
  const [props, setProps] = useState(initialProps)

  useEffect(() => {
    emitter.on('props', setProps)
    return () => {
      emitter.off('props', setProps)
    }
  }, [])

  return <Comp {...props} />
}

const handleInit = (payload) => {
  const { props, drawingSurface: canvas, width, height, pixelRatio } = payload;

  render(<CompWrapper {...props} />, canvas, {
    events: createPointerEvents,
    size: {
      width,
      height,
      updateStyle: false
    },
    dpr: pixelRatio,
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
  'init': handleInit,
  'dom_events': handleEvents,
  'props': handleProps,
}

self.onmessage = (event) => {
  const { type, payload } = event.data
  const handler = handlerMap[type]
  if (handler) handler(payload)
}
