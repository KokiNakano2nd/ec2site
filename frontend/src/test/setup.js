import "@testing-library/jest-dom/vitest";

if (!Element.prototype.getBoundingClientRect || !global.__patchedGetBoundingClientRect) {
  Element.prototype.getBoundingClientRect = function () {
    return {
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      x: 0,
      y: 0,
      toJSON() {},
    };
  };
  global.__patchedGetBoundingClientRect = true;
}
