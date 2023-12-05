const getPrefixe = (name: string) => {
    return window['wekit' + name] || window['moz' + name] || window['ms' + name];
}

const RAF = window['requestAnimationFrame'] || getPrefixe('requestAnimationFrame') || function (fn: Function) { return setTimeout(fn, 16) };

const CRAF = window['cancelAnimationFrame'] || getPrefixe('cancelAnimationFrame') || getPrefixe('CanvelRequestAnimationFrame') || function (id: number) { window.clearTimeout(id); };

export {
    RAF,
    CRAF
}