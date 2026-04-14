'use strict';

/**
 * Metro resolves `react-dom` here for React Native. Gluestack / @react-aria
 * expect web APIs; native uses a different renderer, so we provide minimal stubs.
 */
function flushSync(fn) {
  return fn();
}

function createPortal(children, _container) {
  return children;
}

const api = {
  createPortal,
  flushSync,
};

module.exports = api;
module.exports.default = api;
