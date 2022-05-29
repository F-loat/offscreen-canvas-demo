import * as THREE from 'three';
import * as React from 'react';
import { DefaultEventPriority, ContinuousEventPriority, DiscreteEventPriority, ConcurrentRoot } from 'react-reconciler/constants';
import create from 'zustand';
import Reconciler from 'react-reconciler';
import { unstable_scheduleCallback, unstable_IdlePriority } from 'scheduler';
import { suspend, preload, clear } from 'suspend-react';

var threeTypes = /*#__PURE__*/Object.freeze({
  __proto__: null
});

const isOrthographicCamera = def => def && def.isOrthographicCamera; // React currently throws a warning when using useLayoutEffect on the server.
// To get around it, we can conditionally useEffect on the server (no-op) and
// useLayoutEffect on the client.

const isSSR = typeof window === 'undefined' || !window.navigator || /ServerSideRendering|^Deno\//.test(window.navigator.userAgent);
const useIsomorphicLayoutEffect = isSSR ? React.useEffect : React.useLayoutEffect;
function useMutableCallback(fn) {
  const ref = React.useRef(fn);
  useIsomorphicLayoutEffect(() => void (ref.current = fn), [fn]);
  return ref;
}
function Block({
  set
}) {
  useIsomorphicLayoutEffect(() => {
    set(new Promise(() => null));
    return () => set(false);
  }, [set]);
  return null;
}
class ErrorBoundary extends React.Component {
  constructor(...args) {
    super(...args);
    this.state = {
      error: false
    };
  }

  componentDidCatch(error) {
    this.props.set(error);
  }

  render() {
    return this.state.error ? null : this.props.children;
  }

}

ErrorBoundary.getDerivedStateFromError = () => ({
  error: true
});

const DEFAULT = '__default';
const isDiffSet = def => def && !!def.memoized && !!def.changes;
function calculateDpr(dpr) {
  return Array.isArray(dpr) ? Math.min(Math.max(dpr[0], window.devicePixelRatio), dpr[1]) : dpr;
}
/**
 * Returns instance root state
 */

const getRootState = obj => {
  var _r3f;

  return (_r3f = obj.__r3f) == null ? void 0 : _r3f.root.getState();
};
// A collection of compare functions
const is = {
  obj: a => a === Object(a) && !is.arr(a) && typeof a !== 'function',
  fun: a => typeof a === 'function',
  str: a => typeof a === 'string',
  num: a => typeof a === 'number',
  boo: a => typeof a === 'boolean',
  und: a => a === void 0,
  arr: a => Array.isArray(a),

  equ(a, b, {
    arrays = 'shallow',
    objects = 'reference',
    strict = true
  } = {}) {
    // Wrong type or one of the two undefined, doesn't match
    if (typeof a !== typeof b || !!a !== !!b) return false; // Atomic, just compare a against b

    if (is.str(a) || is.num(a)) return a === b;
    const isObj = is.obj(a);
    if (isObj && objects === 'reference') return a === b;
    const isArr = is.arr(a);
    if (isArr && arrays === 'reference') return a === b; // Array or Object, shallow compare first to see if it's a match

    if ((isArr || isObj) && a === b) return true; // Last resort, go through keys

    let i;

    for (i in a) if (!(i in b)) return false;

    for (i in strict ? b : a) if (a[i] !== b[i]) return false;

    if (is.und(i)) {
      if (isArr && a.length === 0 && b.length === 0) return true;
      if (isObj && Object.keys(a).length === 0 && Object.keys(b).length === 0) return true;
      if (a !== b) return false;
    }

    return true;
  }

}; // Collects nodes and materials from a THREE.Object3D

function buildGraph(object) {
  const data = {
    nodes: {},
    materials: {}
  };

  if (object) {
    object.traverse(obj => {
      if (obj.name) data.nodes[obj.name] = obj;
      if (obj.material && !data.materials[obj.material.name]) data.materials[obj.material.name] = obj.material;
    });
  }

  return data;
} // Disposes an object and all its properties

function dispose(obj) {
  if (obj.dispose && obj.type !== 'Scene') obj.dispose();

  for (const p in obj) {
    p.dispose == null ? void 0 : p.dispose();
    delete obj[p];
  }
} // Each object in the scene carries a small LocalState descriptor

function prepare(object, state) {
  const instance = object;

  if (state != null && state.primitive || !instance.__r3f) {
    instance.__r3f = {
      type: '',
      root: null,
      previousAttach: null,
      memoizedProps: {},
      eventCount: 0,
      handlers: {},
      objects: [],
      parent: null,
      ...state
    };
  }

  return object;
}

function resolve(instance, key) {
  let target = instance;

  if (key.includes('-')) {
    const entries = key.split('-');
    const last = entries.pop();
    target = entries.reduce((acc, key) => acc[key], instance);
    return {
      target,
      key: last
    };
  } else return {
    target,
    key
  };
} // Checks if a dash-cased string ends with an integer


const INDEX_REGEX = /-\d+$/;
function attach(parent, child, type) {
  if (is.str(type)) {
    // If attaching into an array (foo-0), create one
    if (INDEX_REGEX.test(type)) {
      const root = type.replace(INDEX_REGEX, '');
      const {
        target,
        key
      } = resolve(parent, root);
      if (!Array.isArray(target[key])) target[key] = [];
    }

    const {
      target,
      key
    } = resolve(parent, type);
    child.__r3f.previousAttach = target[key];
    target[key] = child;
  } else child.__r3f.previousAttach = type(parent, child);
}
function detach(parent, child, type) {
  var _child$__r3f, _child$__r3f2;

  if (is.str(type)) {
    const {
      target,
      key
    } = resolve(parent, type);
    const previous = child.__r3f.previousAttach; // When the previous value was undefined, it means the value was never set to begin with

    if (previous === undefined) delete target[key]; // Otherwise set the previous value
    else target[key] = previous;
  } else (_child$__r3f = child.__r3f) == null ? void 0 : _child$__r3f.previousAttach == null ? void 0 : _child$__r3f.previousAttach(parent, child);

  (_child$__r3f2 = child.__r3f) == null ? true : delete _child$__r3f2.previousAttach;
} // This function prepares a set of changes to be applied to the instance

function diffProps(instance, {
  children: cN,
  key: kN,
  ref: rN,
  ...props
}, {
  children: cP,
  key: kP,
  ref: rP,
  ...previous
} = {}, remove = false) {
  var _instance$__r3f;

  const localState = (_instance$__r3f = instance == null ? void 0 : instance.__r3f) != null ? _instance$__r3f : {};
  const entries = Object.entries(props);
  const changes = []; // Catch removed props, prepend them so they can be reset or removed

  if (remove) {
    const previousKeys = Object.keys(previous);

    for (let i = 0; i < previousKeys.length; i++) {
      if (!props.hasOwnProperty(previousKeys[i])) entries.unshift([previousKeys[i], DEFAULT + 'remove']);
    }
  }

  entries.forEach(([key, value]) => {
    var _instance$__r3f2;

    // Bail out on primitive object
    if ((_instance$__r3f2 = instance.__r3f) != null && _instance$__r3f2.primitive && key === 'object') return; // When props match bail out

    if (is.equ(value, previous[key])) return; // Collect handlers and bail out

    if (/^on(Pointer|Click|DoubleClick|ContextMenu|Wheel)/.test(key)) return changes.push([key, value, true, []]); // Split dashed props

    let entries = [];
    if (key.includes('-')) entries = key.split('-');
    changes.push([key, value, false, entries]);
  });
  const memoized = { ...props
  };
  if (localState.memoizedProps && localState.memoizedProps.args) memoized.args = localState.memoizedProps.args;
  if (localState.memoizedProps && localState.memoizedProps.attach) memoized.attach = localState.memoizedProps.attach;
  return {
    memoized,
    changes
  };
} // This function applies a set of changes to the instance

function applyProps$1(instance, data) {
  var _instance$__r3f3, _root$getState;

  // Filter equals, events and reserved props
  const localState = (_instance$__r3f3 = instance == null ? void 0 : instance.__r3f) != null ? _instance$__r3f3 : {};
  const root = localState.root;
  const rootState = (_root$getState = root == null ? void 0 : root.getState == null ? void 0 : root.getState()) != null ? _root$getState : {};
  const {
    memoized,
    changes
  } = isDiffSet(data) ? data : diffProps(instance, data);
  const prevHandlers = localState.eventCount; // Prepare memoized props

  if (instance.__r3f) instance.__r3f.memoizedProps = memoized;
  changes.forEach(([key, value, isEvent, keys]) => {
    let currentInstance = instance;
    let targetProp = currentInstance[key]; // Revolve dashed props

    if (keys.length) {
      targetProp = keys.reduce((acc, key) => acc[key], instance); // If the target is atomic, it forces us to switch the root

      if (!(targetProp && targetProp.set)) {
        const [name, ...reverseEntries] = keys.reverse();
        currentInstance = reverseEntries.reverse().reduce((acc, key) => acc[key], instance);
        key = name;
      }
    } // https://github.com/mrdoob/three.js/issues/21209
    // HMR/fast-refresh relies on the ability to cancel out props, but threejs
    // has no means to do this. Hence we curate a small collection of value-classes
    // with their respective constructor/set arguments
    // For removed props, try to set default values, if possible


    if (value === DEFAULT + 'remove') {
      if (targetProp && targetProp.constructor) {
        var _memoized$args;

        // use the prop constructor to find the default it should be
        value = new targetProp.constructor(...((_memoized$args = memoized.args) != null ? _memoized$args : []));
      } else if (currentInstance.constructor) {
        var _currentInstance$__r;

        // create a blank slate of the instance and copy the particular parameter.
        // @ts-ignore
        const defaultClassCall = new currentInstance.constructor(...((_currentInstance$__r = currentInstance.__r3f.memoizedProps.args) != null ? _currentInstance$__r : []));
        value = defaultClassCall[targetProp]; // destory the instance

        if (defaultClassCall.dispose) defaultClassCall.dispose(); // instance does not have constructor, just set it to 0
      } else {
        value = 0;
      }
    } // Deal with pointer events ...


    if (isEvent) {
      if (value) localState.handlers[key] = value;else delete localState.handlers[key];
      localState.eventCount = Object.keys(localState.handlers).length;
    } // Special treatment for objects with support for set/copy, and layers
    else if (targetProp && targetProp.set && (targetProp.copy || targetProp instanceof THREE.Layers)) {
      // If value is an array
      if (Array.isArray(value)) {
        if (targetProp.fromArray) targetProp.fromArray(value);else targetProp.set(...value);
      } // Test again target.copy(class) next ...
      else if (targetProp.copy && value && value.constructor && targetProp.constructor.name === value.constructor.name) {
        targetProp.copy(value);
      } // If nothing else fits, just set the single value, ignore undefined
      // https://github.com/pmndrs/react-three-fiber/issues/274
      else if (value !== undefined) {
        const isColor = targetProp instanceof THREE.Color; // Allow setting array scalars

        if (!isColor && targetProp.setScalar) targetProp.setScalar(value); // Layers have no copy function, we must therefore copy the mask property
        else if (targetProp instanceof THREE.Layers && value instanceof THREE.Layers) targetProp.mask = value.mask; // Otherwise just set ...
        else targetProp.set(value); // For versions of three which don't support THREE.ColorManagement,
        // Auto-convert sRGB colors
        // https://github.com/pmndrs/react-three-fiber/issues/344

        const supportsColorManagement = ('ColorManagement' in THREE);
        if (!supportsColorManagement && !rootState.linear && isColor) targetProp.convertSRGBToLinear();
      } // Else, just overwrite the value

    } else {
      currentInstance[key] = value; // Auto-convert sRGB textures, for now ...
      // https://github.com/pmndrs/react-three-fiber/issues/344

      if (!rootState.linear && currentInstance[key] instanceof THREE.Texture) {
        currentInstance[key].encoding = THREE.sRGBEncoding;
      }
    }

    invalidateInstance(instance);
  });

  if (localState.parent && rootState.internal && instance.raycast && prevHandlers !== localState.eventCount) {
    // Pre-emptively remove the instance from the interaction manager
    const index = rootState.internal.interaction.indexOf(instance);
    if (index > -1) rootState.internal.interaction.splice(index, 1); // Add the instance to the interaction manager only when it has handlers

    if (localState.eventCount) rootState.internal.interaction.push(instance);
  } // Call the update lifecycle when it is being updated, but only when it is part of the scene


  if (changes.length && instance.parent) updateInstance(instance);
  return instance;
}
function invalidateInstance(instance) {
  var _instance$__r3f4, _instance$__r3f4$root;

  const state = (_instance$__r3f4 = instance.__r3f) == null ? void 0 : (_instance$__r3f4$root = _instance$__r3f4.root) == null ? void 0 : _instance$__r3f4$root.getState == null ? void 0 : _instance$__r3f4$root.getState();
  if (state && state.internal.frames === 0) state.invalidate();
}
function updateInstance(instance) {
  instance.onUpdate == null ? void 0 : instance.onUpdate(instance);
}
function updateCamera(camera, size) {
  // https://github.com/pmndrs/react-three-fiber/issues/92
  // Do not mess with the camera if it belongs to the user
  if (!camera.manual) {
    if (isOrthographicCamera(camera)) {
      camera.left = size.width / -2;
      camera.right = size.width / 2;
      camera.top = size.height / 2;
      camera.bottom = size.height / -2;
    } else {
      camera.aspect = size.width / size.height;
    }

    camera.updateProjectionMatrix(); // https://github.com/pmndrs/react-three-fiber/issues/178
    // Update matrix world since the renderer is a frame late

    camera.updateMatrixWorld();
  }
}
/**
 * Safely sets a deeply-nested value on an object.
 */

function setDeep(obj, value, keys) {
  const key = keys.pop();
  const target = keys.reduce((acc, key) => acc[key], obj);
  return target[key] = value;
}

function makeId(event) {
  return (event.eventObject || event.object).uuid + '/' + event.index + event.instanceId;
} // https://github.com/facebook/react/tree/main/packages/react-reconciler#getcurrenteventpriority
// Gives React a clue as to how import the current interaction is


function getEventPriority() {
  var _window, _window$event;

  let name = (_window = window) == null ? void 0 : (_window$event = _window.event) == null ? void 0 : _window$event.type;

  switch (name) {
    case 'click':
    case 'contextmenu':
    case 'dblclick':
    case 'pointercancel':
    case 'pointerdown':
    case 'pointerup':
      return DiscreteEventPriority;

    case 'pointermove':
    case 'pointerout':
    case 'pointerover':
    case 'pointerenter':
    case 'pointerleave':
    case 'wheel':
      return ContinuousEventPriority;

    default:
      return DefaultEventPriority;
  }
}
/**
 * Release pointer captures.
 * This is called by releasePointerCapture in the API, and when an object is removed.
 */

function releaseInternalPointerCapture(capturedMap, obj, captures, pointerId) {
  const captureData = captures.get(obj);

  if (captureData) {
    captures.delete(obj); // If this was the last capturing object for this pointer

    if (captures.size === 0) {
      capturedMap.delete(pointerId);
      captureData.target.releasePointerCapture(pointerId);
    }
  }
}

function removeInteractivity(store, object) {
  const {
    events,
    internal
  } = store.getState(); // Removes every trace of an object from the data store

  internal.interaction = internal.interaction.filter(o => o !== object);
  internal.initialHits = internal.initialHits.filter(o => o !== object);
  internal.hovered.forEach((value, key) => {
    if (value.eventObject === object || value.object === object) {
      // Clear out intersects, they are outdated by now
      internal.hovered.delete(key);
    }
  });
  internal.capturedMap.forEach((captures, pointerId) => {
    releaseInternalPointerCapture(internal.capturedMap, object, captures, pointerId);
  });
}
function createEvents(store) {
  const temp = new THREE.Vector3();
  /** Calculates delta */

  function calculateDistance(event) {
    const {
      internal
    } = store.getState();
    const dx = event.offsetX - internal.initialClick[0];
    const dy = event.offsetY - internal.initialClick[1];
    return Math.round(Math.sqrt(dx * dx + dy * dy));
  }
  /** Returns true if an instance has a valid pointer-event registered, this excludes scroll, clicks etc */


  function filterPointerEvents(objects) {
    return objects.filter(obj => ['Move', 'Over', 'Enter', 'Out', 'Leave'].some(name => {
      var _r3f;

      return (_r3f = obj.__r3f) == null ? void 0 : _r3f.handlers['onPointer' + name];
    }));
  }

  function intersect(event, filter) {
    const state = store.getState();
    const duplicates = new Set();
    const intersections = []; // Allow callers to eliminate event objects

    const eventsObjects = filter ? filter(state.internal.interaction) : state.internal.interaction; // Reset all raycaster cameras to undefined

    eventsObjects.forEach(obj => {
      const state = getRootState(obj);

      if (state) {
        state.raycaster.camera = undefined;
      }
    });

    if (!state.previousRoot) {
      // Make sure root-level pointer and ray are set up
      state.events.compute == null ? void 0 : state.events.compute(event, state);
    } // Collect events


    let hits = eventsObjects // Intersect objects
    .flatMap(obj => {
      const state = getRootState(obj); // Skip event handling when noEvents is set, or when the raycasters camera is null

      if (!state || !state.events.enabled || state.raycaster.camera === null) return []; // When the camera is undefined we have to call the event layers update function

      if (state.raycaster.camera === undefined) {
        var _state$previousRoot;

        state.events.compute == null ? void 0 : state.events.compute(event, state, (_state$previousRoot = state.previousRoot) == null ? void 0 : _state$previousRoot.getState()); // If the camera is still undefined we have to skip this layer entirely

        if (state.raycaster.camera === undefined) state.raycaster.camera = null;
      } // Intersect object by object


      return state.raycaster.camera ? state.raycaster.intersectObject(obj, true) : [];
    }) // Sort by event priority and distance
    .sort((a, b) => {
      const aState = getRootState(a.object);
      const bState = getRootState(b.object);
      if (!aState || !bState) return 0;
      return bState.events.priority - aState.events.priority || a.distance - b.distance;
    }) // Filter out duplicates
    .filter(item => {
      const id = makeId(item);
      if (duplicates.has(id)) return false;
      duplicates.add(id);
      return true;
    }); // https://github.com/mrdoob/three.js/issues/16031
    // Allow custom userland intersect sort order, this likely only makes sense on the root filter

    if (state.events.filter) hits = state.events.filter(hits, state); // Bubble up the events, find the event source (eventObject)

    for (const hit of hits) {
      let eventObject = hit.object; // Bubble event up

      while (eventObject) {
        var _r3f2;

        if ((_r3f2 = eventObject.__r3f) != null && _r3f2.eventCount) intersections.push({ ...hit,
          eventObject
        });
        eventObject = eventObject.parent;
      }
    } // If the interaction is captured, make all capturing targets part of the intersect.


    if ('pointerId' in event && state.internal.capturedMap.has(event.pointerId)) {
      for (let captureData of state.internal.capturedMap.get(event.pointerId).values()) {
        intersections.push(captureData.intersection);
      }
    }

    return intersections;
  }
  /**  Handles intersections by forwarding them to handlers */


  function handleIntersects(intersections, event, delta, callback) {
    const {
      raycaster,
      pointer,
      camera,
      internal
    } = store.getState(); // If anything has been found, forward it to the event listeners

    if (intersections.length) {
      const unprojectedPoint = temp.set(pointer.x, pointer.y, 0).unproject(camera);
      const localState = {
        stopped: false
      };

      for (const hit of intersections) {
        const hasPointerCapture = id => {
          var _internal$capturedMap, _internal$capturedMap2;

          return (_internal$capturedMap = (_internal$capturedMap2 = internal.capturedMap.get(id)) == null ? void 0 : _internal$capturedMap2.has(hit.eventObject)) != null ? _internal$capturedMap : false;
        };

        const setPointerCapture = id => {
          const captureData = {
            intersection: hit,
            target: event.target
          };

          if (internal.capturedMap.has(id)) {
            // if the pointerId was previously captured, we add the hit to the
            // event capturedMap.
            internal.capturedMap.get(id).set(hit.eventObject, captureData);
          } else {
            // if the pointerId was not previously captured, we create a map
            // containing the hitObject, and the hit. hitObject is used for
            // faster access.
            internal.capturedMap.set(id, new Map([[hit.eventObject, captureData]]));
          } // Call the original event now
          event.target.setPointerCapture(id);
        };

        const releasePointerCapture = id => {
          const captures = internal.capturedMap.get(id);

          if (captures) {
            releaseInternalPointerCapture(internal.capturedMap, hit.eventObject, captures, id);
          }
        }; // Add native event props


        let extractEventProps = {}; // This iterates over the event's properties including the inherited ones. Native PointerEvents have most of their props as getters which are inherited, but polyfilled PointerEvents have them all as their own properties (i.e. not inherited). We can't use Object.keys() or Object.entries() as they only return "own" properties; nor Object.getPrototypeOf(event) as that *doesn't* return "own" properties, only inherited ones.

        for (let prop in event) {
          let property = event[prop]; // Only copy over atomics, leave functions alone as these should be
          // called as event.nativeEvent.fn()

          if (typeof property !== 'function') extractEventProps[prop] = property;
        }

        let raycastEvent = { ...hit,
          ...extractEventProps,
          pointer,
          intersections,
          stopped: localState.stopped,
          delta,
          unprojectedPoint,
          ray: raycaster.ray,
          camera: camera,
          // Hijack stopPropagation, which just sets a flag
          stopPropagation: () => {
            // https://github.com/pmndrs/react-three-fiber/issues/596
            // Events are not allowed to stop propagation if the pointer has been captured
            const capturesForPointer = 'pointerId' in event && internal.capturedMap.get(event.pointerId); // We only authorize stopPropagation...

            if ( // ...if this pointer hasn't been captured
            !capturesForPointer || // ... or if the hit object is capturing the pointer
            capturesForPointer.has(hit.eventObject)) {
              raycastEvent.stopped = localState.stopped = true; // Propagation is stopped, remove all other hover records
              // An event handler is only allowed to flush other handlers if it is hovered itself

              if (internal.hovered.size && Array.from(internal.hovered.values()).find(i => i.eventObject === hit.eventObject)) {
                // Objects cannot flush out higher up objects that have already caught the event
                const higher = intersections.slice(0, intersections.indexOf(hit));
                cancelPointer([...higher, hit]);
              }
            }
          },
          // there should be a distinction between target and currentTarget
          target: {
            hasPointerCapture,
            setPointerCapture,
            releasePointerCapture
          },
          currentTarget: {
            hasPointerCapture,
            setPointerCapture,
            releasePointerCapture
          },
          nativeEvent: event
        }; // Call subscribers

        callback(raycastEvent); // Event bubbling may be interrupted by stopPropagation

        if (localState.stopped === true) break;
      }
    }

    return intersections;
  }

  function cancelPointer(hits) {
    const {
      internal
    } = store.getState();
    Array.from(internal.hovered.values()).forEach(hoveredObj => {
      // When no objects were hit or the the hovered object wasn't found underneath the cursor
      // we call onPointerOut and delete the object from the hovered-elements map
      if (!hits.length || !hits.find(hit => hit.object === hoveredObj.object && hit.index === hoveredObj.index && hit.instanceId === hoveredObj.instanceId)) {
        const eventObject = hoveredObj.eventObject;
        const instance = eventObject.__r3f;
        const handlers = instance == null ? void 0 : instance.handlers;
        internal.hovered.delete(makeId(hoveredObj));

        if (instance != null && instance.eventCount) {
          // Clear out intersects, they are outdated by now
          const data = { ...hoveredObj,
            intersections: hits || []
          };
          handlers.onPointerOut == null ? void 0 : handlers.onPointerOut(data);
          handlers.onPointerLeave == null ? void 0 : handlers.onPointerLeave(data);
        }
      }
    });
  }

  const handlePointer = name => {
    // Deal with cancelation
    switch (name) {
      case 'onPointerLeave':
      case 'onPointerCancel':
        return () => cancelPointer([]);

      case 'onLostPointerCapture':
        return event => {
          const {
            internal
          } = store.getState();

          if ('pointerId' in event && !internal.capturedMap.has(event.pointerId)) {
            // If the object event interface had onLostPointerCapture, we'd call it here on every
            // object that's getting removed.
            internal.capturedMap.delete(event.pointerId);
            cancelPointer([]);
          }
        };
    } // Any other pointer goes here ...


    return event => {
      const {
        onPointerMissed,
        internal
      } = store.getState(); //prepareRay(event)

      internal.lastEvent.current = event; // Get fresh intersects

      const isPointerMove = name === 'onPointerMove';
      const isClickEvent = name === 'onClick' || name === 'onContextMenu' || name === 'onDoubleClick';
      const filter = isPointerMove ? filterPointerEvents : undefined; //const hits = patchIntersects(intersect(filter), event)

      const hits = intersect(event, filter);
      const delta = isClickEvent ? calculateDistance(event) : 0; // Save initial coordinates on pointer-down

      if (name === 'onPointerDown') {
        internal.initialClick = [event.offsetX, event.offsetY];
        internal.initialHits = hits.map(hit => hit.eventObject);
      } // If a click yields no results, pass it back to the user as a miss
      // Missed events have to come first in order to establish user-land side-effect clean up


      if (isClickEvent && !hits.length) {
        if (delta <= 2) {
          pointerMissed(event, internal.interaction);
          if (onPointerMissed) onPointerMissed(event);
        }
      } // Take care of unhover


      if (isPointerMove) cancelPointer(hits);
      handleIntersects(hits, event, delta, data => {
        const eventObject = data.eventObject;
        const instance = eventObject.__r3f;
        const handlers = instance == null ? void 0 : instance.handlers; // Check presence of handlers

        if (!(instance != null && instance.eventCount)) return;

        if (isPointerMove) {
          // Move event ...
          if (handlers.onPointerOver || handlers.onPointerEnter || handlers.onPointerOut || handlers.onPointerLeave) {
            // When enter or out is present take care of hover-state
            const id = makeId(data);
            const hoveredItem = internal.hovered.get(id);

            if (!hoveredItem) {
              // If the object wasn't previously hovered, book it and call its handler
              internal.hovered.set(id, data);
              handlers.onPointerOver == null ? void 0 : handlers.onPointerOver(data);
              handlers.onPointerEnter == null ? void 0 : handlers.onPointerEnter(data);
            } else if (hoveredItem.stopped) {
              // If the object was previously hovered and stopped, we shouldn't allow other items to proceed
              data.stopPropagation();
            }
          } // Call mouse move


          handlers.onPointerMove == null ? void 0 : handlers.onPointerMove(data);
        } else {
          // All other events ...
          const handler = handlers[name];

          if (handler) {
            // Forward all events back to their respective handlers with the exception of click events,
            // which must use the initial target
            if (!isClickEvent || internal.initialHits.includes(eventObject)) {
              // Missed events have to come first
              pointerMissed(event, internal.interaction.filter(object => !internal.initialHits.includes(object))); // Now call the handler

              handler(data);
            }
          } else {
            // Trigger onPointerMissed on all elements that have pointer over/out handlers, but not click and weren't hit
            if (isClickEvent && internal.initialHits.includes(eventObject)) {
              pointerMissed(event, internal.interaction.filter(object => !internal.initialHits.includes(object)));
            }
          }
        }
      });
    };
  };

  function pointerMissed(event, objects) {
    objects.forEach(object => {
      var _r3f3;

      return (_r3f3 = object.__r3f) == null ? void 0 : _r3f3.handlers.onPointerMissed == null ? void 0 : _r3f3.handlers.onPointerMissed(event);
    });
  }

  return {
    handlePointer
  };
}

let catalogue = {};

let extend = objects => void (catalogue = { ...catalogue,
  ...objects
});

function createRenderer(roots, getEventPriority) {
  function createInstance(type, {
    args = [],
    attach,
    ...props
  }, root) {
    let name = `${type[0].toUpperCase()}${type.slice(1)}`;
    let instance; // Auto-attach geometries and materials

    if (attach === undefined) {
      if (name.endsWith('Geometry')) attach = 'geometry';else if (name.endsWith('Material')) attach = 'material';
    }

    if (type === 'primitive') {
      if (props.object === undefined) throw `Primitives without 'object' are invalid!`;
      const object = props.object;
      instance = prepare(object, {
        type,
        root,
        attach,
        primitive: true
      });
    } else {
      const target = catalogue[name];

      if (!target) {
        throw `${name} is not part of the THREE namespace! Did you forget to extend? See: https://docs.pmnd.rs/react-three-fiber/api/objects#using-3rd-party-objects-declaratively`;
      } // Throw if an object or literal was passed for args


      if (!Array.isArray(args)) throw 'The args prop must be an array!'; // Instanciate new object, link it to the root
      // Append memoized props with args so it's not forgotten

      instance = prepare(new target(...args), {
        type,
        root,
        attach,
        // Save args in case we need to reconstruct later for HMR
        memoizedProps: {
          args
        }
      });
    } // It should NOT call onUpdate on object instanciation, because it hasn't been added to the
    // view yet. If the callback relies on references for instance, they won't be ready yet, this is
    // why it passes "true" here
    // There is no reason to apply props to injects


    if (name !== 'inject') applyProps$1(instance, props);
    return instance;
  }

  function appendChild(parentInstance, child) {
    let added = false;

    if (child) {
      var _child$__r3f, _parentInstance$__r3f;

      // The attach attribute implies that the object attaches itself on the parent.
      // That is handled at commit to avoid duplication during Suspense
      if (!((_child$__r3f = child.__r3f) != null && _child$__r3f.attach) && child.isObject3D && parentInstance.isObject3D) {
        // add in the usual parent-child way
        parentInstance.add(child);
        added = true;
      } // This is for anything that used attach, and for non-Object3Ds that don't get attached to props;
      // that is, anything that's a child in React but not a child in the scenegraph.


      if (!added) (_parentInstance$__r3f = parentInstance.__r3f) == null ? void 0 : _parentInstance$__r3f.objects.push(child);
      if (!child.__r3f) prepare(child, {});
      child.__r3f.parent = parentInstance;
      updateInstance(child);
      invalidateInstance(child);
    }
  }

  function insertBefore(parentInstance, child, beforeChild) {
    let added = false;

    if (child) {
      var _child$__r3f2, _parentInstance$__r3f2;

      if ((_child$__r3f2 = child.__r3f) != null && _child$__r3f2.attach) {
        attach(parentInstance, child, child.__r3f.attach);
      } else if (child.isObject3D && parentInstance.isObject3D) {
        child.parent = parentInstance;
        child.dispatchEvent({
          type: 'added'
        });
        const restSiblings = parentInstance.children.filter(sibling => sibling !== child);
        const index = restSiblings.indexOf(beforeChild);
        parentInstance.children = [...restSiblings.slice(0, index), child, ...restSiblings.slice(index)];
        added = true;
      }

      if (!added) (_parentInstance$__r3f2 = parentInstance.__r3f) == null ? void 0 : _parentInstance$__r3f2.objects.push(child);
      if (!child.__r3f) prepare(child, {});
      child.__r3f.parent = parentInstance;
      updateInstance(child);
      invalidateInstance(child);
    }
  }

  function removeRecursive(array, parent, dispose = false) {
    if (array) [...array].forEach(child => removeChild(parent, child, dispose));
  }

  function removeChild(parentInstance, child, dispose) {
    if (child) {
      var _parentInstance$__r3f3, _child$__r3f3, _child$__r3f5;

      // Clear the parent reference
      if (child.__r3f) child.__r3f.parent = null; // Remove child from the parents objects

      if ((_parentInstance$__r3f3 = parentInstance.__r3f) != null && _parentInstance$__r3f3.objects) parentInstance.__r3f.objects = parentInstance.__r3f.objects.filter(x => x !== child); // Remove attachment

      if ((_child$__r3f3 = child.__r3f) != null && _child$__r3f3.attach) {
        detach(parentInstance, child, child.__r3f.attach);
      } else if (child.isObject3D && parentInstance.isObject3D) {
        var _child$__r3f4;

        parentInstance.remove(child); // Remove interactivity

        if ((_child$__r3f4 = child.__r3f) != null && _child$__r3f4.root) {
          removeInteractivity(child.__r3f.root, child);
        }
      } // Allow objects to bail out of recursive dispose altogether by passing dispose={null}
      // Never dispose of primitives because their state may be kept outside of React!
      // In order for an object to be able to dispose it has to have
      //   - a dispose method,
      //   - it cannot be a <primitive object={...} />
      //   - it cannot be a THREE.Scene, because three has broken it's own api
      //
      // Since disposal is recursive, we can check the optional dispose arg, which will be undefined
      // when the reconciler calls it, but then carry our own check recursively


      const isPrimitive = (_child$__r3f5 = child.__r3f) == null ? void 0 : _child$__r3f5.primitive;
      const shouldDispose = dispose === undefined ? child.dispose !== null && !isPrimitive : dispose; // Remove nested child objects. Primitives should not have objects and children that are
      // attached to them declaratively ...

      if (!isPrimitive) {
        var _child$__r3f6;

        removeRecursive((_child$__r3f6 = child.__r3f) == null ? void 0 : _child$__r3f6.objects, child, shouldDispose);
        removeRecursive(child.children, child, shouldDispose);
      } // Remove references


      if (child.__r3f) {
        delete child.__r3f.root;
        delete child.__r3f.objects;
        delete child.__r3f.handlers;
        delete child.__r3f.memoizedProps;
        if (!isPrimitive) delete child.__r3f;
      } // Dispose item whenever the reconciler feels like it


      if (shouldDispose && child.dispose && child.type !== 'Scene') {
        unstable_scheduleCallback(unstable_IdlePriority, () => {
          try {
            child.dispose();
          } catch (e) {
            /* ... */
          }
        });
      }

      invalidateInstance(parentInstance);
    }
  }

  function switchInstance(instance, type, newProps, fiber) {
    var _instance$__r3f, _instance$__r3f2, _newInstance$__r3f;

    const parent = (_instance$__r3f = instance.__r3f) == null ? void 0 : _instance$__r3f.parent;
    if (!parent) return;
    const newInstance = createInstance(type, newProps, (_instance$__r3f2 = instance.__r3f) == null ? void 0 : _instance$__r3f2.root); // https://github.com/pmndrs/react-three-fiber/issues/1348
    // When args change the instance has to be re-constructed, which then
    // forces r3f to re-parent the children and non-scene objects
    // This can not include primitives, which should not have declarative children

    if (type !== 'primitive' && instance.children) {
      instance.children.forEach(child => appendChild(newInstance, child));
      instance.children = [];
    }

    instance.__r3f.objects.forEach(child => appendChild(newInstance, child));

    instance.__r3f.objects = [];
    removeChild(parent, instance);
    appendChild(parent, newInstance); // Re-bind event handlers

    if (newInstance.raycast && newInstance.__r3f.eventCount) {
      const rootState = newInstance.__r3f.root.getState();

      rootState.internal.interaction.push(newInstance);
    } // The attach attribute implies that the object attaches itself on the parent


    if ((_newInstance$__r3f = newInstance.__r3f) != null && _newInstance$__r3f.attach) {
      attach(parent, newInstance, newInstance.__r3f.attach);
    } // This evil hack switches the react-internal fiber node
    [fiber, fiber.alternate].forEach(fiber => {
      if (fiber !== null) {
        fiber.stateNode = newInstance;

        if (fiber.ref) {
          if (typeof fiber.ref === 'function') fiber.ref(newInstance);else fiber.ref.current = newInstance;
        }
      }
    });
  }

  const reconciler = Reconciler({
    createInstance,
    removeChild,
    appendChild,
    appendInitialChild: appendChild,
    insertBefore,
    supportsMicrotask: true,
    warnsIfNotActing: true,
    supportsMutation: true,
    isPrimaryRenderer: false,
    noTimeout: -1,
    appendChildToContainer: (container, child) => {
      const scene = container.getState().scene; // Link current root to the default scene

      scene.__r3f.root = container;
      appendChild(scene, child);
    },
    removeChildFromContainer: (container, child) => removeChild(container.getState().scene, child),
    insertInContainerBefore: (container, child, beforeChild) => insertBefore(container.getState().scene, child, beforeChild),
    getRootHostContext: () => null,
    getChildHostContext: parentHostContext => parentHostContext,

    finalizeInitialChildren(instance) {
      var _instance$__r3f3;

      const localState = (_instance$__r3f3 = instance == null ? void 0 : instance.__r3f) != null ? _instance$__r3f3 : {}; // https://github.com/facebook/react/issues/20271
      // Returning true will trigger commitMount

      return !!localState.handlers || !!localState.attach;
    },

    prepareUpdate(instance, type, oldProps, newProps) {
      // Create diff-sets
      if (instance.__r3f.primitive && newProps.object && newProps.object !== instance) {
        return [true];
      } else {
        // This is a data object, let's extract critical information about it
        const {
          args: argsNew = [],
          children: cN,
          ...restNew
        } = newProps;
        const {
          args: argsOld = [],
          children: cO,
          ...restOld
        } = oldProps; // Throw if an object or literal was passed for args

        if (!Array.isArray(argsNew)) throw 'The args prop must be an array!'; // If it has new props or arguments, then it needs to be re-instanciated

        if (argsNew.some((value, index) => value !== argsOld[index])) return [true]; // Create a diff-set, flag if there are any changes

        const diff = diffProps(instance, restNew, restOld, true);
        if (diff.changes.length) return [false, diff]; // Otherwise do not touch the instance

        return null;
      }
    },

    commitUpdate(instance, [reconstruct, diff], type, oldProps, newProps, fiber) {
      // Reconstruct when args or <primitive object={...} have changes
      if (reconstruct) switchInstance(instance, type, newProps, fiber); // Otherwise just overwrite props
      else applyProps$1(instance, diff);
    },

    commitMount(instance, type, props, int) {
      var _instance$__r3f4;

      // https://github.com/facebook/react/issues/20271
      // This will make sure events are only added once to the central container
      const localState = (_instance$__r3f4 = instance == null ? void 0 : instance.__r3f) != null ? _instance$__r3f4 : {};

      if (instance.raycast && localState.handlers && localState.eventCount) {
        instance.__r3f.root.getState().internal.interaction.push(instance);
      } // The attach attribute implies that the object attaches itself on the parent


      if (localState.attach) {
        attach(localState.parent, instance, localState.attach);
      }
    },

    getPublicInstance: instance => instance,
    shouldDeprioritizeSubtree: () => false,
    prepareForCommit: () => null,
    preparePortalMount: container => prepare(container.getState().scene),
    resetAfterCommit: () => {},
    shouldSetTextContent: () => false,
    clearContainer: () => false,
    detachDeletedInstance: () => {},

    hideInstance(instance) {
      if (instance.isObject3D) instance.visible = false;
      invalidateInstance(instance);
    },

    unhideInstance(instance, props) {
      if (instance.isObject3D && props.visible == null || props.visible) instance.visible = true;
      invalidateInstance(instance);
    },

    createTextInstance: () => {},
    hideTextInstance: () => {
      throw new Error('Text is not allowed in the R3F tree.');
    },
    unhideTextInstance: () => {},
    getCurrentEventPriority: () => getEventPriority ? getEventPriority() : DefaultEventPriority,
    // @ts-ignore
    now: typeof performance !== 'undefined' && is.fun(performance.now) ? performance.now : is.fun(Date.now) ? Date.now : undefined,
    // @ts-ignore
    scheduleTimeout: is.fun(setTimeout) ? setTimeout : undefined,
    // @ts-ignore
    cancelTimeout: is.fun(clearTimeout) ? clearTimeout : undefined,
    setTimeout: is.fun(setTimeout) ? setTimeout : undefined,
    clearTimeout: is.fun(clearTimeout) ? clearTimeout : undefined
  });
  return {
    reconciler,
    applyProps: applyProps$1
  };
}

const privateKeys = ['set', 'get', 'setSize', 'setFrameloop', 'setDpr', 'events', 'invalidate', 'advance', 'size', 'viewport'];
const isRenderer = def => !!(def != null && def.render);
const context = /*#__PURE__*/React.createContext(null);

const createStore = (invalidate, advance) => {
  const rootState = create((set, get) => {
    const position = new THREE.Vector3();
    const defaultTarget = new THREE.Vector3();
    const tempTarget = new THREE.Vector3();

    function getCurrentViewport(camera = get().camera, target = defaultTarget, size = get().size) {
      const {
        width,
        height
      } = size;
      const aspect = width / height;
      if (target instanceof THREE.Vector3) tempTarget.copy(target);else tempTarget.set(...target);
      const distance = camera.getWorldPosition(position).distanceTo(tempTarget);

      if (isOrthographicCamera(camera)) {
        return {
          width: width / camera.zoom,
          height: height / camera.zoom,
          factor: 1,
          distance,
          aspect
        };
      } else {
        const fov = camera.fov * Math.PI / 180; // convert vertical fov to radians

        const h = 2 * Math.tan(fov / 2) * distance; // visible height

        const w = h * (width / height);
        return {
          width: w,
          height: h,
          factor: width / w,
          distance,
          aspect
        };
      }
    }

    let performanceTimeout = undefined;

    const setPerformanceCurrent = current => set(state => ({
      performance: { ...state.performance,
        current
      }
    }));

    const pointer = new THREE.Vector2();
    return {
      set,
      get,
      // Mock objects that have to be configured
      gl: null,
      camera: null,
      raycaster: null,
      events: {
        priority: 1,
        enabled: true,
        connected: false
      },
      xr: null,
      invalidate: (frames = 1) => invalidate(get(), frames),
      advance: (timestamp, runGlobalEffects) => advance(timestamp, runGlobalEffects, get()),
      legacy: false,
      linear: false,
      flat: false,
      scene: prepare(new THREE.Scene()),
      controls: null,
      clock: new THREE.Clock(),
      pointer,
      mouse: pointer,
      frameloop: 'always',
      onPointerMissed: undefined,
      performance: {
        current: 1,
        min: 0.5,
        max: 1,
        debounce: 200,
        regress: () => {
          const state = get(); // Clear timeout

          if (performanceTimeout) clearTimeout(performanceTimeout); // Set lower bound performance

          if (state.performance.current !== state.performance.min) setPerformanceCurrent(state.performance.min); // Go back to upper bound performance after a while unless something regresses meanwhile

          performanceTimeout = setTimeout(() => setPerformanceCurrent(get().performance.max), state.performance.debounce);
        }
      },
      size: {
        width: 0,
        height: 0
      },
      viewport: {
        initialDpr: 0,
        dpr: 0,
        width: 0,
        height: 0,
        aspect: 0,
        distance: 0,
        factor: 0,
        getCurrentViewport
      },
      setEvents: events => set(state => ({ ...state,
        events: { ...state.events,
          ...events
        }
      })),
      setSize: (width, height) => {
        const camera = get().camera;
        const size = {
          width,
          height
        };
        set(state => ({
          size,
          viewport: { ...state.viewport,
            ...getCurrentViewport(camera, defaultTarget, size)
          }
        }));
      },
      setDpr: dpr => set(state => {
        const resolved = calculateDpr(dpr);
        return {
          viewport: { ...state.viewport,
            dpr: resolved,
            initialDpr: state.viewport.initialDpr || resolved
          }
        };
      }),
      setFrameloop: (frameloop = 'always') => {
        const clock = get().clock; // if frameloop === "never" clock.elapsedTime is updated using advance(timestamp)

        clock.stop();
        clock.elapsedTime = 0;

        if (frameloop !== 'never') {
          clock.start();
          clock.elapsedTime = 0;
        }

        set(() => ({
          frameloop
        }));
      },
      previousRoot: undefined,
      internal: {
        active: false,
        priority: 0,
        frames: 0,
        lastEvent: /*#__PURE__*/React.createRef(),
        interaction: [],
        hovered: new Map(),
        subscribers: [],
        initialClick: [0, 0],
        initialHits: [],
        capturedMap: new Map(),
        subscribe: (ref, priority, store) => {
          set(({
            internal
          }) => ({
            internal: { ...internal,
              // If this subscription was given a priority, it takes rendering into its own hands
              // For that reason we switch off automatic rendering and increase the manual flag
              // As long as this flag is positive there can be no internal rendering at all
              // because there could be multiple render subscriptions
              priority: internal.priority + (priority > 0 ? 1 : 0),
              // Register subscriber and sort layers from lowest to highest, meaning,
              // highest priority renders last (on top of the other frames)
              subscribers: [...internal.subscribers, {
                ref,
                priority,
                store
              }].sort((a, b) => a.priority - b.priority)
            }
          }));
          return () => {
            set(({
              internal
            }) => ({
              internal: { ...internal,
                // Decrease manual flag if this subscription had a priority
                priority: internal.priority - (priority > 0 ? 1 : 0),
                // Remove subscriber from list
                subscribers: internal.subscribers.filter(s => s.ref !== ref)
              }
            }));
          };
        }
      }
    };
  });
  const state = rootState.getState(); // Resize camera and renderer on changes to size and pixelratio

  let oldSize = state.size;
  let oldDpr = state.viewport.dpr;
  rootState.subscribe(() => {
    const {
      camera,
      size,
      viewport,
      gl
    } = rootState.getState();

    if (size !== oldSize || viewport.dpr !== oldDpr) {
      updateCamera(camera, size); // Update renderer

      gl.setPixelRatio(viewport.dpr);
      gl.setSize(size.width, size.height);
      oldSize = size;
      oldDpr = viewport.dpr;
    }
  }); // Invalidate on any change

  rootState.subscribe(state => invalidate(state)); // Return root state

  return rootState;
};

function createSubs(callback, subs) {
  const index = subs.length;
  subs.push(callback);
  return () => void subs.splice(index, 1);
}

let i;
let globalEffects = [];
let globalAfterEffects = [];
let globalTailEffects = [];
/**
 * Adds a global render callback which is called each frame.
 * @see https://docs.pmnd.rs/react-three-fiber/api/additional-exports#addEffect
 */

const addEffect = callback => createSubs(callback, globalEffects);
/**
 * Adds a global after-render callback which is called each frame.
 * @see https://docs.pmnd.rs/react-three-fiber/api/additional-exports#addAfterEffect
 */

const addAfterEffect = callback => createSubs(callback, globalAfterEffects);
/**
 * Adds a global callback which is called when rendering stops.
 * @see https://docs.pmnd.rs/react-three-fiber/api/additional-exports#addTail
 */

const addTail = callback => createSubs(callback, globalTailEffects);

function run(effects, timestamp) {
  for (i = 0; i < effects.length; i++) effects[i](timestamp);
}

let subscribers;
let subscription;

function render$1(timestamp, state, frame) {
  // Run local effects
  let delta = state.clock.getDelta(); // In frameloop='never' mode, clock times are updated using the provided timestamp

  if (state.frameloop === 'never' && typeof timestamp === 'number') {
    delta = timestamp - state.clock.elapsedTime;
    state.clock.oldTime = state.clock.elapsedTime;
    state.clock.elapsedTime = timestamp;
  } // Call subscribers (useFrame)


  subscribers = state.internal.subscribers;

  for (i = 0; i < subscribers.length; i++) {
    subscription = subscribers[i];
    subscription.ref.current(subscription.store.getState(), delta, frame);
  } // Render content


  if (!state.internal.priority && state.gl.render) state.gl.render(state.scene, state.camera); // Decrease frame count

  state.internal.frames = Math.max(0, state.internal.frames - 1);
  return state.frameloop === 'always' ? 1 : state.internal.frames;
}

function createLoop(roots) {
  let running = false;
  let repeat;
  let frame;
  let state;

  function loop(timestamp) {
    frame = requestAnimationFrame(loop);
    running = true;
    repeat = 0; // Run effects

    if (globalEffects.length) run(globalEffects, timestamp); // Render all roots

    roots.forEach(root => {
      var _state$gl$xr;

      state = root.store.getState(); // If the frameloop is invalidated, do not run another frame

      if (state.internal.active && (state.frameloop === 'always' || state.internal.frames > 0) && !((_state$gl$xr = state.gl.xr) != null && _state$gl$xr.isPresenting)) {
        repeat += render$1(timestamp, state);
      }
    }); // Run after-effects

    if (globalAfterEffects.length) run(globalAfterEffects, timestamp); // Stop the loop if nothing invalidates it

    if (repeat === 0) {
      // Tail call effects, they are called when rendering stops
      if (globalTailEffects.length) run(globalTailEffects, timestamp); // Flag end of operation

      running = false;
      return cancelAnimationFrame(frame);
    }
  }

  function invalidate(state, frames = 1) {
    var _state$gl$xr2;

    if (!state) return roots.forEach(root => invalidate(root.store.getState()), frames);
    if ((_state$gl$xr2 = state.gl.xr) != null && _state$gl$xr2.isPresenting || !state.internal.active || state.frameloop === 'never') return; // Increase frames, do not go higher than 60

    state.internal.frames = Math.min(60, state.internal.frames + frames); // If the render-loop isn't active, start it

    if (!running) {
      running = true;
      requestAnimationFrame(loop);
    }
  }

  function advance(timestamp, runGlobalEffects = true, state, frame) {
    if (runGlobalEffects) run(globalEffects, timestamp);
    if (!state) roots.forEach(root => render$1(timestamp, root.store.getState()));else render$1(timestamp, state, frame);
    if (runGlobalEffects) run(globalAfterEffects, timestamp);
  }

  return {
    loop,

    /**
     * Invalidates the view, requesting a frame to be rendered. Will globally invalidate unless passed a root's state.
     * @see https://docs.pmnd.rs/react-three-fiber/api/additional-exports#invalidate
     */
    invalidate,

    /**
     * Advances the frameloop and runs render effects, useful for when manually rendering via `frameloop="never"`.
     * @see https://docs.pmnd.rs/react-three-fiber/api/additional-exports#advance
     */
    advance
  };
}

function useStore() {
  const store = React.useContext(context);
  if (!store) throw `R3F hooks can only be used within the Canvas component!`;
  return store;
}
/**
 * Accesses R3F's internal state, containing renderer, canvas, scene, etc.
 * @see https://docs.pmnd.rs/react-three-fiber/api/hooks#usethree
 */

function useThree(selector = state => state, equalityFn) {
  return useStore()(selector, equalityFn);
}
/**
 * Executes a callback before render in a shared frame loop.
 * Can order effects with render priority or manually render with a positive priority.
 * @see https://docs.pmnd.rs/react-three-fiber/api/hooks#useframe
 */

function useFrame(callback, renderPriority = 0) {
  const store = useStore();
  const subscribe = store.getState().internal.subscribe; // Memoize ref

  const ref = useMutableCallback(callback); // Subscribe on mount, unsubscribe on unmount

  useIsomorphicLayoutEffect(() => subscribe(ref, renderPriority, store), [renderPriority, subscribe, store]);
  return null;
}
/**
 * Returns a node graph of an object with named nodes & materials.
 * @see https://docs.pmnd.rs/react-three-fiber/api/hooks#usegraph
 */

function useGraph(object) {
  return React.useMemo(() => buildGraph(object), [object]);
}

function loadingFn(extensions, onProgress) {
  return function (Proto, ...input) {
    // Construct new loader and run extensions
    const loader = new Proto();
    if (extensions) extensions(loader); // Go through the urls and load them

    return Promise.all(input.map(input => new Promise((res, reject) => loader.load(input, data => {
      if (data.scene) Object.assign(data, buildGraph(data.scene));
      res(data);
    }, onProgress, error => reject(`Could not load ${input}: ${error.message}`)))));
  };
}

/**
 * Synchronously loads and caches assets with a three loader.
 *
 * Note: this hook's caller must be wrapped with `React.Suspense`
 * @see https://docs.pmnd.rs/react-three-fiber/api/hooks#useloader
 */
function useLoader(Proto, input, extensions, onProgress) {
  // Use suspense to load async assets
  const keys = Array.isArray(input) ? input : [input];
  const results = suspend(loadingFn(extensions, onProgress), [Proto, ...keys], {
    equal: is.equ
  }); // Return the object/s

  return Array.isArray(input) ? results : results[0];
}
/**
 * Preloads an asset into cache as a side-effect.
 */

useLoader.preload = function (Proto, input, extensions) {
  const keys = Array.isArray(input) ? input : [input];
  return preload(loadingFn(extensions), [Proto, ...keys]);
};
/**
 * Removes a loaded asset from cache.
 */


useLoader.clear = function (Proto, input) {
  const keys = Array.isArray(input) ? input : [input];
  return clear([Proto, ...keys]);
};

const roots = new Map();
const {
  invalidate,
  advance
} = createLoop(roots);
const {
  reconciler,
  applyProps
} = createRenderer(roots, getEventPriority);
const shallowLoose = {
  objects: 'shallow',
  strict: false
};

const createRendererInstance = (gl, canvas) => {
  const customRenderer = typeof gl === 'function' ? gl(canvas) : gl;
  if (isRenderer(customRenderer)) return customRenderer;else return new THREE.WebGLRenderer({
    powerPreference: 'high-performance',
    canvas: canvas,
    antialias: true,
    alpha: true,
    ...gl
  });
};

function createRoot(canvas) {
  // Check against mistaken use of createRoot
  let prevRoot = roots.get(canvas);
  let prevFiber = prevRoot == null ? void 0 : prevRoot.fiber;
  let prevStore = prevRoot == null ? void 0 : prevRoot.store;
  if (prevRoot) console.warn('R3F.createRoot should only be called once!'); // Report when an error was detected in a previous render
  // https://github.com/pmndrs/react-three-fiber/pull/2261

  const logRecoverableError = typeof reportError === 'function' ? // In modern browsers, reportError will dispatch an error event,
  // emulating an uncaught JavaScript error.
  reportError : // In older browsers and test environments, fallback to console.error.
  console.error; // Create store

  const store = prevStore || createStore(invalidate, advance); // Create renderer

  const fiber = prevFiber || reconciler.createContainer(store, ConcurrentRoot, null, false, null, '', logRecoverableError, null); // Map it

  if (!prevRoot) roots.set(canvas, {
    fiber,
    store
  }); // Locals

  let onCreated;
  let configured = false;
  return {
    configure(props = {}) {
      var _canvas$parentElement, _canvas$parentElement2, _canvas$parentElement3, _canvas$parentElement4;

      let {
        gl: glConfig,
        size,
        events,
        onCreated: onCreatedCallback,
        shadows = false,
        linear = false,
        flat = false,
        legacy = false,
        orthographic = false,
        frameloop = 'always',
        dpr = [1, 2],
        performance,
        raycaster: raycastOptions,
        camera: cameraOptions,
        onPointerMissed
      } = props;
      let state = store.getState(); // Set up renderer (one time only!)

      let gl = state.gl;
      if (!state.gl) state.set({
        gl: gl = createRendererInstance(glConfig, canvas)
      }); // Set up raycaster (one time only!)

      let raycaster = state.raycaster;
      if (!raycaster) state.set({
        raycaster: raycaster = new THREE.Raycaster()
      }); // Set raycaster options

      const {
        params,
        ...options
      } = raycastOptions || {};
      if (!is.equ(options, raycaster, shallowLoose)) applyProps(raycaster, { ...options
      });
      if (!is.equ(params, raycaster.params, shallowLoose)) applyProps(raycaster, {
        params: { ...raycaster.params,
          ...params
        }
      }); // Create default camera (one time only!)

      if (!state.camera) {
        const isCamera = cameraOptions instanceof THREE.Camera;
        const camera = isCamera ? cameraOptions : orthographic ? new THREE.OrthographicCamera(0, 0, 0, 0, 0.1, 1000) : new THREE.PerspectiveCamera(75, 0, 0.1, 1000);

        if (!isCamera) {
          camera.position.z = 5;
          if (cameraOptions) applyProps(camera, cameraOptions); // Always look at center by default

          if (!(cameraOptions != null && cameraOptions.rotation)) camera.lookAt(0, 0, 0);
        }

        state.set({
          camera
        });
      } // Set up XR (one time only!)


      if (!state.xr) {
        // Handle frame behavior in WebXR
        const handleXRFrame = (timestamp, frame) => {
          const state = store.getState();
          if (state.frameloop === 'never') return;
          advance(timestamp, true, state, frame);
        }; // Toggle render switching on session


        const handleSessionChange = () => {
          const gl = store.getState().gl;
          gl.xr.enabled = gl.xr.isPresenting; // @ts-ignore
          // WebXRManager's signature is incorrect.
          // See: https://github.com/pmndrs/react-three-fiber/pull/2017#discussion_r790134505

          gl.xr.setAnimationLoop(gl.xr.isPresenting ? handleXRFrame : null);
        }; // WebXR session manager


        const xr = {
          connect() {
            const gl = store.getState().gl;
            gl.xr.addEventListener('sessionstart', handleSessionChange);
            gl.xr.addEventListener('sessionend', handleSessionChange);
          },

          disconnect() {
            const gl = store.getState().gl;
            gl.xr.removeEventListener('sessionstart', handleSessionChange);
            gl.xr.removeEventListener('sessionend', handleSessionChange);
          }

        }; // Subscribe to WebXR session events

        if (gl.xr) xr.connect();
        state.set({
          xr
        });
      } // Set shadowmap


      if (gl.shadowMap) {
        const isBoolean = is.boo(shadows);

        if (isBoolean && gl.shadowMap.enabled !== shadows || !is.equ(shadows, gl.shadowMap, shallowLoose)) {
          const old = gl.shadowMap.enabled;
          gl.shadowMap.enabled = !!shadows;
          if (!isBoolean) Object.assign(gl.shadowMap, shadows);else gl.shadowMap.type = THREE.PCFSoftShadowMap;
          if (old !== gl.shadowMap.enabled) gl.shadowMap.needsUpdate = true;
        }
      } // Safely set color management if available.
      // Avoid accessing THREE.ColorManagement to play nice with older versions


      if ('ColorManagement' in THREE) {
        setDeep(THREE, legacy, ['ColorManagement', 'legacyMode']);
      }

      const outputEncoding = linear ? THREE.LinearEncoding : THREE.sRGBEncoding;
      const toneMapping = flat ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
      if (gl.outputEncoding !== outputEncoding) gl.outputEncoding = outputEncoding;
      if (gl.toneMapping !== toneMapping) gl.toneMapping = toneMapping; // Update color management state

      if (state.legacy !== legacy) state.set(() => ({
        legacy
      }));
      if (state.linear !== linear) state.set(() => ({
        linear
      }));
      if (state.flat !== flat) state.set(() => ({
        flat
      })); // Set gl props

      if (glConfig && !is.fun(glConfig) && !isRenderer(glConfig) && !is.equ(glConfig, gl, shallowLoose)) applyProps(gl, glConfig); // Store events internally

      if (events && !state.events.handlers) state.set({
        events: events(store)
      }); // Check pixelratio

      if (dpr && state.viewport.dpr !== calculateDpr(dpr)) state.setDpr(dpr); // Check size, allow it to take on container bounds initially

      size = size || {
        width: (_canvas$parentElement = (_canvas$parentElement2 = canvas.parentElement) == null ? void 0 : _canvas$parentElement2.clientWidth) != null ? _canvas$parentElement : 0,
        height: (_canvas$parentElement3 = (_canvas$parentElement4 = canvas.parentElement) == null ? void 0 : _canvas$parentElement4.clientHeight) != null ? _canvas$parentElement3 : 0
      };
      if (!is.equ(size, state.size, shallowLoose)) state.setSize(size.width, size.height); // Check frameloop

      if (state.frameloop !== frameloop) state.setFrameloop(frameloop); // Check pointer missed

      if (!state.onPointerMissed) state.set({
        onPointerMissed
      }); // Check performance

      if (performance && !is.equ(performance, state.performance, shallowLoose)) state.set(state => ({
        performance: { ...state.performance,
          ...performance
        }
      })); // Set locals

      onCreated = onCreatedCallback;
      configured = true;
      return this;
    },

    render(children) {
      // The root has to be configured before it can be rendered
      if (!configured) this.configure();
      reconciler.updateContainer( /*#__PURE__*/React.createElement(Provider, {
        store: store,
        children: children,
        onCreated: onCreated,
        rootElement: canvas
      }), fiber, null, () => undefined);
      return store;
    },

    unmount() {
      unmountComponentAtNode(canvas);
    }

  };
}

function render(children, canvas, config) {
  console.warn('R3F.render is no longer supported in React 18. Use createRoot instead!');
  const root = createRoot(canvas);
  root.configure(config);
  return root.render(children);
}

function Provider({
  store,
  children,
  onCreated,
  rootElement
}) {
  useIsomorphicLayoutEffect(() => {
    const state = store.getState(); // Flag the canvas active, rendering will now begin

    state.set(state => ({
      internal: { ...state.internal,
        active: true
      }
    })); // Notifiy that init is completed, the scene graph exists, but nothing has yet rendered

    if (onCreated) onCreated(state); // Connect events to the targets parent, this is done to ensure events are registered on
    // a shared target, and not on the canvas itself

    if (!store.getState().events.connected) state.events.connect == null ? void 0 : state.events.connect(rootElement); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return /*#__PURE__*/React.createElement(context.Provider, {
    value: store
  }, children);
}

function unmountComponentAtNode(canvas, callback) {
  const root = roots.get(canvas);
  const fiber = root == null ? void 0 : root.fiber;

  if (fiber) {
    const state = root == null ? void 0 : root.store.getState();
    if (state) state.internal.active = false;
    reconciler.updateContainer(null, fiber, null, () => {
      if (state) {
        setTimeout(() => {
          try {
            var _state$gl, _state$gl$renderLists, _state$gl2, _state$gl3;

            state.events.disconnect == null ? void 0 : state.events.disconnect();
            (_state$gl = state.gl) == null ? void 0 : (_state$gl$renderLists = _state$gl.renderLists) == null ? void 0 : _state$gl$renderLists.dispose == null ? void 0 : _state$gl$renderLists.dispose();
            (_state$gl2 = state.gl) == null ? void 0 : _state$gl2.forceContextLoss == null ? void 0 : _state$gl2.forceContextLoss();
            if ((_state$gl3 = state.gl) != null && _state$gl3.xr) state.xr.disconnect();
            dispose(state);
            roots.delete(canvas);
            if (callback) callback(canvas);
          } catch (e) {
            /* ... */
          }
        }, 500);
      }
    });
  }
}

function createPortal(children, container, state) {
  return /*#__PURE__*/React.createElement(Portal, {
    key: container.uuid,
    children: children,
    container: container,
    state: state
  });
}

function Portal({
  state = {},
  children,
  container
}) {
  /** This has to be a component because it would not be able to call useThree/useStore otherwise since
   *  if this is our environment, then we are not in r3f's renderer but in react-dom, it would trigger
   *  the "R3F hooks can only be used within the Canvas component!" warning:
   *  <Canvas>
   *    {createPortal(...)} */
  const {
    events,
    size,
    ...rest
  } = state;
  const previousRoot = useStore();
  const [raycaster] = React.useState(() => new THREE.Raycaster());
  const [pointer] = React.useState(() => new THREE.Vector2());
  const inject = React.useCallback((rootState, injectState) => {
    const intersect = { ...rootState
    }; // all prev state props
    // Only the fields of "rootState" that do not differ from injectState
    // Some props should be off-limits
    // Otherwise filter out the props that are different and let the inject layer take precedence

    Object.keys(rootState).forEach(key => {
      if ( // Some props should be off-limits
      privateKeys.includes(key) || // Otherwise filter out the props that are different and let the inject layer take precedence
      rootState[key] !== injectState[key]) {
        delete intersect[key];
      }
    });
    let viewport = undefined;

    if (injectState && size) {
      const camera = injectState.camera; // Calculate the override viewport, if present

      viewport = rootState.viewport.getCurrentViewport(camera, new THREE.Vector3(), size); // Update the portal camera, if it differs from the previous layer

      if (camera !== rootState.camera) updateCamera(camera, size);
    }

    return { // The intersect consists of the previous root state
      ...intersect,
      // Portals have their own scene, which forms the root, a raycaster and a pointer
      scene: container,
      raycaster,
      pointer,
      mouse: pointer,
      // Their previous root is the layer before it
      previousRoot,
      // Events, size and viewport can be overridden by the inject layer
      events: { ...rootState.events,
        ...(injectState == null ? void 0 : injectState.events),
        ...events
      },
      size: { ...rootState.size,
        ...size
      },
      viewport: { ...rootState.viewport,
        ...viewport
      },
      ...rest
    };
  }, [state]);
  const [usePortalStore] = React.useState(() => {
    // Create a mirrored store, based on the previous root with a few overrides ...
    const previousState = previousRoot.getState();
    const store = create((set, get) => ({ ...previousState,
      scene: container,
      raycaster,
      pointer,
      mouse: pointer,
      previousRoot,
      events: { ...previousState.events,
        ...events
      },
      size: { ...previousState.size,
        ...size
      },
      ...rest,
      // Set and get refer to this root-state
      set,
      get,
      // Layers are allowed to override events
      setEvents: events => set(state => ({ ...state,
        events: { ...state.events,
          ...events
        }
      }))
    }));
    return store;
  });
  React.useEffect(() => {
    // Subscribe to previous root-state and copy changes over to the mirrored portal-state
    const unsub = previousRoot.subscribe(prev => usePortalStore.setState(state => inject(prev, state)));
    return () => {
      unsub();
      usePortalStore.destroy();
    };
  }, []);
  React.useEffect(() => {
    usePortalStore.setState(injectState => inject(previousRoot.getState(), injectState));
  }, [inject]);
  return /*#__PURE__*/React.createElement(React.Fragment, null, reconciler.createPortal( /*#__PURE__*/React.createElement(context.Provider, {
    value: usePortalStore
  }, children), usePortalStore, null));
}

reconciler.injectIntoDevTools({
  bundleType: process.env.NODE_ENV === 'production' ? 0 : 1,
  rendererPackageName: '@react-three/fiber',
  version: '18.0.0'
});
const act = React.unstable_act;

export { Block as B, ErrorBoundary as E, createRoot as a, useIsomorphicLayoutEffect as b, createEvents as c, unmountComponentAtNode as d, extend as e, context as f, createPortal as g, reconciler as h, applyProps as i, dispose as j, invalidate as k, advance as l, addEffect as m, addAfterEffect as n, addTail as o, getRootState as p, act as q, render as r, roots as s, threeTypes as t, useMutableCallback as u, useStore as v, useThree as w, useFrame as x, useGraph as y, useLoader as z };
