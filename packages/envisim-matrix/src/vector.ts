import { Random, type RandomGenerator, randomArray, randomInt } from "@envisim/random";
import { ValidationError } from "@envisim/utils";
import {
  BaseMatrix,
  type MatrixCallback,
  type MatrixCallbackCompare,
  type MatrixDim,
} from "./base-matrix.js";

export class Vector extends BaseMatrix {
  /**
   * @returns `true` if `mat` is a Vector
   */
  static isVector(mat: unknown): mat is Vector {
    return mat instanceof Vector;
  }

  /**
   * @param obj
   * @throws ValidationError if `obj` is not Vector
   */
  static assert(obj: unknown): asserts obj is Vector {
    if (!(obj instanceof Vector))
      throw ValidationError.create["other-incorrect-shape"]({ arg: "this", shape: "Vector" });
  }

  /**
   * @returns a new Vector of size `length` filled with `fill`
   */
  static create(fill: number, length: MatrixDim[0]): Vector {
    return new Vector(Array.from<number>({ length }).fill(fill), true);
  }

  static borrow(vec: Vector | number[]): number[] {
    return Vector.isVector(vec) ? vec.internal : vec;
  }

  /**
   * @param arr the values used to form the Vector in column-order
   * @param shallow if `true`, uses the internal arrays of `arr` as a reference
   */
  constructor(arr: number[] | Vector, shallow: boolean = false) {
    const dims: MatrixDim = [arr.length, 1];

    if (Vector.isVector(arr)) {
      super(arr.slice(), dims);
    } else {
      super(shallow ? arr : arr.slice(), dims);
    }
  }

  // @ts-expect-error clone needs to be defined for any deriving class
  clone(): Vector {
    return new Vector(this.internal.slice(), true);
  }

  /**
   * @param inPlace performes the map in place if `true`
   * @returns a copy, where each element has been mapped by the callback fn.
   */
  // @ts-expect-error map needs to be defined for any deriving class
  map(callback: MatrixCallback<number>, inPlace: boolean = false): Vector {
    return inPlace ? super.baseMapInPlace(callback) : new Vector(super.baseMap(callback), true);
  }

  /**
   * Sorts the elements according to `compareFn`
   *
   * `callback(a, b)` return value:
   * - `> 0`: sort `a` after `b`
   * - `< 0`: sort `a` before `b`
   * - `=== 0`: keep original order
   *
   * @param callback a function that defines the sort order, being provided
   * the elements
   * @returns a sorted vector
   */
  sort(callback: MatrixCallbackCompare = (a: number, b: number) => a - b): Vector {
    return new Vector(this.slice().sort(callback));
  }

  /**
   * `callback(a, b)` return value:
   * - `> 0`: sort `a` after `b`
   * - `< 0`: sort `a` before `b`
   * - `=== 0`: keep original order
   *
   * @param callback a function that defines the sort order, being provided
   * the elements
   * @returns the indices that sorts the vector
   */
  sortIndex(
    callback: MatrixCallbackCompare = (a: number, b: number) => this.at(a) - this.at(b),
  ): number[] {
    const idx = Array.from<number>({ length: this.len });
    for (let i = 0; i < this.len; i++) idx[i] = i;
    return idx.sort(callback);
  }

  /**
   * @param inPlace if `true`, the vector is sorted in place.
   * @returns the vector with a permutated order
   * @group Maps
   * @group Copy methods
   */
  sortRandom(inPlace: boolean = false, rand: RandomGenerator = new Random()): Vector {
    const N = this.len;

    if (inPlace === true) {
      for (let i = N - 1; i > 0; i--) {
        const rnd = randomInt(i + 1, rand);
        if (i !== rnd) this.swap(i, rnd);
      }

      return this;
    }

    const s = this.clone();

    for (let i = N - 1; i > 0; i--) {
      const rnd = randomInt(i + 1, rand);
      if (i !== rnd) s.swap(i, rnd);
    }

    return s;
  }

  /**
   * @param callback a function returning true for elements to be kept
   * @returns a filtered vector according to the provided callbackFn
   */
  filter(callback: MatrixCallback<boolean>): Vector {
    return new Vector(this.internal.filter(callback), true);
  }

  /**
   * @returns the unique elements
   */
  unique(): Vector {
    return this.filter((v, i) => this.internal.indexOf(v) === i).sort();
  }

  /**
   * @returns the unique elements of the union of `this` and `vec`
   * @group Maps
   */
  union(vec: number[] | Vector): Vector {
    const s = [...this.internal, ...(Array.isArray(vec) ? vec : vec.internal)];

    return new Vector(
      s.filter((v, i) => s.indexOf(v) === i),
      true,
    );
  }

  /**
   * @returns the unique elements of the intersect
   * @group Maps
   */
  intersect(vec: Vector): Vector {
    return new Vector(
      this.internal.filter((v, i) => this.internal.indexOf(v) === i && vec.internal.includes(v)),
    );
  }

  /**
   * @returns the cumulative sums of the vector elements
   * @group Statistics
   */
  cumulativeSum(): Vector {
    let t = 0.0;
    return this.map((e) => {
      t += e;
      return t;
    });
  }

  /**
   * @returns the covariance of `this` and `vec`
   * @throws ValidationError if the vectors has different sizes
   * @group Statistics
   */
  covariance(vec: Vector): number {
    if (!this.hasSizeOf(vec))
      throw ValidationError.create["other-incorrect-shape"]({ arg: "this", shape: "this" });

    return (
      this.subtract(this.mean()).multiply(vec.subtract(vec.mean()), true).sum() / (this.len - 1)
    );
  }

  /**
   * @returns the correlation between `this` and `vec`
   */
  correlation(vec: Vector): number {
    return this.covariance(vec) / Math.sqrt(this.variance() * vec.variance());
  }

  /**
   * @returns the values needed in order to construct a histogram
   * @throws RangeError if the provided range is not finite, or in the incorrect order.
   */
  histogram(
    bins: number,
    range: [number, number] = this.range(),
  ): { range: [number, number]; bins: number[]; width: number } {
    bins = Math.ceil(bins);
    const width = (range[1] - range[0]) / bins;

    (
      ValidationError.check["number-not-positive"]({ arg: "bins" }, bins) ??
      ValidationError.check["number-not-in-interval"](
        { arg: "range[1]", interval: range, ends: "left-open" },
        range[1],
      ) ??
      ValidationError.check["number-not-finite"]({ arg: "range" }, width)
    )?.raise();

    if (width === 0.0) {
      return {
        range,
        bins: [this.internal.reduce((t, v) => (t + v === range[0] ? 1 : 0))],
        width: 0.0,
      };
    }

    const obj = {
      range,
      width,
      bins: Array.from<number>({ length: bins }).fill(0),
    };

    for (const v of this.internal) {
      if (v < range[0] || range[1] < v) continue;
      const i = Math.min(Math.floor((v - range[0]) / width), bins - 1);
      obj.bins[i] += 1;
    }

    return obj;
  }
}

/**
 * Generates a vector-like of random numbers on [0, 1).
 *
 * @param length - the length of the vector
 * @param rand - an RNG
 * @returns a vector-like of random numbers on [0, 1).
 */
export function randomVector(length: number, rand: RandomGenerator = new Random()): Vector {
  return new Vector(randomArray(length, rand));
}

/**
 * Generates a vector-like of a sequence of numbers.
 *
 * @example
 * const seq1 = ColumnVector.createSequence(0, 2, 0.5);
 * // seq1 is a ColumnVector with elements [0.0, 0.5, 1.0, 1.5, 2.0]
 * const seq2 = ColumnVector.createSequence(0, 1.9, 0.5);
 * // seq2 is a ColumnVector with elements [0.0, 0.5, 1.0, 1.5]
 *
 * @param from - The starting number in the sequence.
 * @param to - A number for which the sequence will not generate beyond.
 * @param by - The incrementing (or decrementing) size of the sequence. Must be positive.
 * @returns A vector of size needed to reach `to`, however not going over it.
 */
export function sequence(from: number, to: number, by: number = 1.0): Vector {
  ValidationError.check["number-not-positive"]({ arg: "by" }, by)?.raise();

  const dim = Math.floor(Math.abs((to - from) / by)) + 1;

  if (dim >= 4294967296) throw new RangeError("by is to small");

  const s = Array.from<number>({ length: dim });
  let current = from;
  const b = to < from ? -by : by;

  for (let i = 0; i < dim; i++) {
    s[i] = current;
    current += b;
  }

  return new Vector(s, true);
}
