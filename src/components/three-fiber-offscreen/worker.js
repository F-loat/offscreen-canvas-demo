import React from 'react'
import * as THREE from 'three'
import { extend, createRoot } from '@react-three/fiber'
import { emitter, createPointerEvents } from './events'
import Comp from './comp'

extend(THREE)

let root;

const eventHandleMap = {}

const handleInit = (payload) => {
  const { drawingSurface: canvas, width, height, pixelRatio } = payload;

  root = createRoot(canvas)

  root.configure({
    events: store => createPointerEvents(store, eventHandleMap),
    size: {
      width,
      height,
      updateStyle: false
    },
    dpr: pixelRatio,
  })

  root.render(<Comp />)
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

const handlerMap = {
  'resize': handleResize,
  'init': handleInit,
  'dom_events': handleEvents
}

self.onmessage = (event) => {
  const { type, payload } = event.data
  const handler = handlerMap[type]
  if (handler) handler(payload)
}
