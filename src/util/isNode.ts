
/**
 * @author yellow 2020/10/28
 * 判断运行环境是否是Node
 */
const isNode = (function (): boolean {
    return typeof window['process'] === 'object' && String(window['process']) === '[object process]' && !window['process']["browser"];
})();



export { isNode }
