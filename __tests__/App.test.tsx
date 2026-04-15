/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('../src/components/crt/TerminalText', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('redux-persist/integration/react', () => ({
  PersistGate: (props: { children: React.ReactNode }) => props.children,
}));

test('renders correctly', async () => {
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<App />);
  });
});
