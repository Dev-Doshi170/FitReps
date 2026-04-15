jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('./src/services/supabase', () => {
  const emptyRows = Promise.resolve({ data: [], error: null });
  const emptySingle = Promise.resolve({ data: null, error: null });
  const mockPlanRow = { id: '00000000-0000-4000-8000-000000000001' };

  const defaultBuilder = {
    insert: () => Promise.resolve({ error: null }),
    select() {
      return this;
    },
    eq() {
      return this;
    },
    maybeSingle: () => emptySingle,
    order() {
      const afterOrder = {
        limit: () => emptyRows,
        then(onFulfilled, onRejected) {
          return emptyRows.then(onFulfilled, onRejected);
        },
        catch(onRejected) {
          return emptyRows.catch(onRejected);
        },
      };
      return afterOrder;
    },
  };

  function fromTable(table) {
    if (table === 'plans') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: mockPlanRow, error: null }),
          }),
        }),
      };
    }
    if (table === 'plan_days') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => emptySingle,
            }),
          }),
        }),
      };
    }
    return defaultBuilder;
  }

  return {
    supabase: {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        signOut: () => Promise.resolve({ error: null }),
        signInWithPassword: () =>
          Promise.resolve({ data: { session: null, user: null }, error: null }),
        signUp: () => Promise.resolve({ data: { session: null, user: null }, error: null }),
      },
      from: fromTable,
    },
  };
});

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: ({ children, style, ...props }) =>
      React.createElement(View, { style, ...props }, children),
    Swipeable: ({ children }) => children,
  };
});

jest.mock('react-native-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children, ...props }) => React.createElement(View, props, children);
});

jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return {
    setItem: jest.fn((k, v) => Promise.resolve(store.set(String(k), String(v)))),
    getItem: jest.fn(k => Promise.resolve(store.has(String(k)) ? store.get(String(k)) : null)),
    removeItem: jest.fn(k => Promise.resolve(store.delete(String(k)))),
    clear: jest.fn(() => Promise.resolve(store.clear())),
    getAllKeys: jest.fn(() => Promise.resolve([...store.keys()])),
    multiGet: jest.fn(keys => Promise.resolve(keys.map((k) => [k, store.has(String(k)) ? store.get(String(k)) : null]))),
    multiSet: jest.fn(pairs => {
      pairs.forEach(([k, v]) => store.set(String(k), String(v)));
      return Promise.resolve();
    }),
  };
});
