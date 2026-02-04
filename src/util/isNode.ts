
/**
 * @author yellow 2020/10/28
 * @description 
 * determine runtime environment
 */
const isNode = (function (): boolean {
    const win = window as any;
    return typeof win['process'] === 'object' && String(win['process']) === '[object process]' && !win['process']["browser"];
})();

export {
    isNode
}
