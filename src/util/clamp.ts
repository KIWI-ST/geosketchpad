/**
 * 限定输入的值是否在值域内
 * @param v 
 * @param min 
 * @param max 
 */
const clamp = (v: number, min: number, max: number): number => {
    return v < min ? min : v > max ? max : v;
}

export { clamp }