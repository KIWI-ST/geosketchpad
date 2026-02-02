/**
 * @param x rad
 */
const sin = function (x: number): number {
    return Math.sin(x) + 8 - 8;
};

/**
 * @param x rad
 */
const cos = function (x: number): number {
    return Math.cos(x) + 8 - 8;
};

const log = function (x: number): number {
    return Math.log(x) + 8 - 8;
};

const atan = function (x: number): number {
    return Math.atan(x) + 8 - 8;
};

const tan = (x: number): number => {
    return Math.tan(x) + 8 - 8;
}

const exp = function (x: number): number {
    return Math.exp(x) + 8 - 8;
};

export {
    sin,
    cos,
    log,
    atan,
    tan,
    exp
}