import {describe, expect, test} from 'vitest';

import {errorFunction, stdNormalQuantile} from '../../src/continuous/normal-utils.js';
import {PRECISION, fromTo} from '../_distributions.testf.js';

describe('normal-utils', () => {
  test('errorFunction', () => {
    const x = [-5.0, ...fromTo(-2.5, -0.5, 0.5), -0.25, 0.0, 0.25, ...fromTo(0.5, 2.5, 0.5), 5.0];
    const erf = x.map(errorFunction);
    const res = [
      -0.99999999999846256316, -0.99959304798255499414, -0.99532226501895271209,
      -0.96610514647531076093, -0.84270079294971489414, -0.52049987781304651868,
      -0.2763263901682369017, 0.0, 0.2763263901682369017, 0.52049987781304651868,
      0.84270079294971478312, 0.96610514647531076093, 0.99532226501895282311,
      0.99959304798255499414, 0.99999999999846256316,
    ];

    expect(erf).toEqual(res.map((r) => expect.closeTo(r, PRECISION)));
  });

  test('stdNormalQuantile', () => {
    const x = fromTo(1, 9, 1).map((e) => e / 10);
    x.push(0.99, 1.0);
    x.unshift(0.0, 0.01);
    const snq = x.map(stdNormalQuantile);

    const res = [
      -Infinity,
      -2.3263478740408407575,
      -1.28155156554460081253,
      -0.84162123357291418468,
      -0.52440051270804066696,
      -0.25334710313579977825,
      0.0,
      0.25334710313579977825,
      0.52440051270804066696,
      0.84162123357291440673,
      1.28155156554460081253,
      2.3263478740408407575,
      Infinity,
    ];

    expect(snq).toEqual(res.map((r) => expect.closeTo(r, PRECISION)));
  });
});
