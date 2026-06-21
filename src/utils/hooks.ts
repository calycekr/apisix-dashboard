/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
  type DependencyList,
  type EffectCallback,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

// ---------------------------------------------------------------------------
// useDisclosure
// Replacement for @mantine/hooks useDisclosure
// ---------------------------------------------------------------------------

type DisclosureHandlers = {
  open: () => void;
  close: () => void;
  toggle: () => void;
};

export function useDisclosure(
  initialState = false
): [boolean, DisclosureHandlers] {
  const [opened, setOpened] = useState(initialState);

  const open = useCallback(() => setOpened(true), []);
  const close = useCallback(() => setOpened(false), []);
  const toggle = useCallback(() => setOpened((v) => !v), []);

  return [opened, { open, close, toggle }];
}

// ---------------------------------------------------------------------------
// useListState
// Replacement for @mantine/hooks useListState
// ---------------------------------------------------------------------------

type ListStateHandlers<T> = {
  setState: (state: T[]) => void;
  append: (...items: T[]) => void;
  remove: (...indices: number[]) => void;
  filter: (fn: (item: T, index: number) => boolean) => void;
  applyWhere: (
    condition: (item: T, index: number) => boolean,
    fn: (item: T) => T
  ) => void;
};

export function useListState<T>(
  initialState: T[] = []
): [T[], ListStateHandlers<T>] {
  const [state, setState] = useState<T[]>(initialState);

  const handlers: ListStateHandlers<T> = {
    setState,
    append: useCallback((...items: T[]) => {
      setState((current) => [...current, ...items]);
    }, []),
    remove: useCallback((...indices: number[]) => {
      const indexSet = new Set(indices);
      setState((current) => current.filter((_, i) => !indexSet.has(i)));
    }, []),
    filter: useCallback((fn: (item: T, index: number) => boolean) => {
      setState((current) => current.filter(fn));
    }, []),
    applyWhere: useCallback(
      (
        condition: (item: T, index: number) => boolean,
        fn: (item: T) => T
      ) => {
        setState((current) =>
          current.map((item, index) => (condition(item, index) ? fn(item) : item))
        );
      },
      []
    ),
  };

  return [state, handlers];
}

// ---------------------------------------------------------------------------
// useMap
// Replacement for @mantine/hooks useMap
// ---------------------------------------------------------------------------

type MapHandlers<K, V> = {
  set: (key: K, value: V) => void;
  delete: (key: K) => void;
  clear: () => void;
};

export function useMap<K, V>(
  initialState?: Iterable<readonly [K, V]>
): [Map<K, V>, MapHandlers<K, V>] {
  const [map, setMap] = useState<Map<K, V>>(
    () => new Map(initialState as Iterable<[K, V]> | undefined)
  );

  const set = useCallback((key: K, value: V) => {
    setMap((current) => new Map(current).set(key, value));
  }, []);

  const remove = useCallback((key: K) => {
    setMap((current) => {
      const next = new Map(current);
      next.delete(key);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setMap(new Map());
  }, []);

  return [map, { set, delete: remove, clear }];
}

// ---------------------------------------------------------------------------
// useCallbackRef
// Replacement for @mantine/hooks useCallbackRef
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCallbackRef<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback(
    ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
    []
  );
}

// ---------------------------------------------------------------------------
// useClickOutside
// Replacement for @mantine/hooks useClickOutside
// ---------------------------------------------------------------------------

export function useClickOutside<T extends HTMLElement>(
  handler: () => void
): React.RefObject<T | null> {
  const ref = useRef<T>(null);
  const handlerRef = useCallbackRef(handler);

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handlerRef();
      }
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [handlerRef]);

  return ref;
}

// ---------------------------------------------------------------------------
// useShallowEffect
// Replacement for @mantine/hooks useShallowEffect
// ---------------------------------------------------------------------------

function shallowEqual(a: DependencyList, b: DependencyList): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}

export function useShallowEffect(
  effect: EffectCallback,
  deps: DependencyList
): void {
  const prevDepsRef = useRef<DependencyList | undefined>(undefined);
  const runCountRef = useRef(0);

  if (
    prevDepsRef.current === undefined ||
    !shallowEqual(prevDepsRef.current, deps)
  ) {
    prevDepsRef.current = deps;
    runCountRef.current += 1;
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, [runCountRef.current]);
}
