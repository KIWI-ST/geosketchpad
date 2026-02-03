
const win = window as any;

const getPrefixe = (name: string) => {
    return win['wekit' + name] || win['moz' + name] || win['ms' + name];
}

const RAF = window['requestAnimationFrame'] ||
    getPrefixe('requestAnimationFrame') ||
    function (fn: Function) {
        return setTimeout(fn, 16)
    };

const CRAF = window['cancelAnimationFrame'] ||
    getPrefixe('cancelAnimationFrame') ||
    getPrefixe('CanvelRequestAnimationFrame') ||
    function (id: number) {
        window.clearTimeout(id);
    };

export {
    RAF,
    CRAF
}