import mitt from 'mitt'
import { createEvents } from 'r3f6'

export const DOM_EVENTS = {
  onClick: ['click', false],
  onContextMenu: ['contextmenu', false],
  onDoubleClick: ['dblclick', false],
  onWheel: ['wheel', true],
  onPointerDown: ['pointerdown', true],
  onPointerUp: ['pointerup', true],
  onPointerLeave: ['pointerleave', true],
  onPointerMove: ['pointermove', true],
  onPointerCancel: ['pointercancel', true],
  onLostPointerCapture: ['lostpointercapture', true],
}

export const emitter = mitt()

/** R3F event manager for web offscreen canvas */
export function createPointerEvents(store) {
  const { handlePointer } = createEvents(store)

  return {
    priority: 1,
    enabled: true,
    compute(event, state) {
      // https://github.com/pmndrs/react-three-fiber/pull/782
      // Events trigger outside of canvas when moved, use offsetX/Y by default and allow overrides
      state.pointer.set((event.offsetX / state.size.width) * 2 - 1, -(event.offsetY / state.size.height) * 2 + 1)
      state.raycaster.setFromCamera(state.pointer, state.camera)
    },

    connected: undefined,
    handlers: Object.keys(DOM_EVENTS).reduce(
      (acc, key) => ({ ...acc, [key]: handlePointer(key) }),
      {},
    ),
    connect: (target) => {
      const { set, events } = store.getState()
      events.disconnect?.()
      set((state) => ({ events: { ...state.events, connected: target } }))
      Object.entries(events?.handlers ?? []).forEach(([name, event]) => {
        const [eventName] = DOM_EVENTS[name]
        emitter.on(eventName, event)
      })
    },
    disconnect: () => {
      const { set, events } = store.getState()
      if (events.connected) {
        Object.entries(events.handlers ?? []).forEach(([name, event]) => {
          const [eventName] = DOM_EVENTS[name]
          emitter.off(eventName, event)
        })
        emitter.emit('disconnect')
        set((state) => ({ events: { ...state.events, connected: undefined } }))
      }
    },
  }
}
