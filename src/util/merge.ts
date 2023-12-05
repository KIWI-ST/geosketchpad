/**
 * @date 2017/4/18
 * @author axamnd
 * @description 合并对象
 * @param dest 
 * @returns 
 */
const merge = (...dest: object[]): object => {
    const o = dest[0];
    for (let i = 1, len = dest.length; i < len; i++) {
        const target = dest[i];
        for (const key in target)
            o[key] = target[key];
    }
    return o;
}

export { merge }