import { isNode } from './isNode';

/**
 * @description
 * determine browser type.
 */
interface IBrowser {
    ie: boolean,
    ielt9: boolean,
    edge: boolean,
    webkit: boolean,
    gecko: boolean,
    android: boolean,
    android23: boolean,
    chrome: boolean,
    chromeVersion: string,
    safari: boolean,
    phantomjs: boolean,
    ie3d: boolean,
    webkit3d: boolean,
    gecko3d: boolean,
    opera12: boolean,
    any3d: boolean,
    mobile: boolean,
    mobileWebkit: boolean,
    mobileWebkit3d: boolean,
    mobileOpera: boolean,
    mobileGecko: boolean,
    touch: boolean,
    msPointer: boolean,
    pointer: boolean,
    retina: boolean,
    devicePixelRatio: number,
    language: string,
    ie9: boolean,
    ie10: boolean,
    webgl: boolean
}

let browser: IBrowser;
if (!isNode) {
    const win = window as any;
    const ua = navigator.userAgent.toLowerCase(),
        doc = document.documentElement,
        ie = 'ActiveXObject' in window,
        webkit = ua.indexOf('webkit') !== -1,
        phantomjs = ua.indexOf('phantom') !== -1,
        android23 = ua.search('android [23]') !== -1,
        chrome = ua.indexOf('chrome') !== -1,
        gecko = ua.indexOf('gecko') !== -1 && !webkit && !win['opera'] && !ie,
        mobile = typeof orientation !== 'undefined' || ua.indexOf('mobile') !== -1,
        msPointer = !window.PointerEvent && win['MSPointerEvent'],
        pointer = (window.PointerEvent && (navigator as any)['pointerEnabled']) || msPointer,
        ie3d = ie && ('transition' in doc.style),
        webkit3d = ('WebKitCSSMatrix' in window) && ('m11' in new window.WebKitCSSMatrix()) && !android23,
        gecko3d = 'MozPerspective' in doc.style,
        opera12 = 'OTransition' in doc.style,
        any3d = (ie3d || webkit3d || gecko3d) && !opera12 && !phantomjs;
    let chromeVersion = '0';
    if (chrome) {
        chromeVersion = ua.match(/chrome\/([\d.]+)/)![1];
    }
    const touch = !phantomjs && (pointer || 'ontouchstart' in window || (win['DocumentTouch'] && document instanceof win['DocumentTouch']));
    let webgl: boolean;
    try {
        const canvas = document.createElement('canvas'),
            gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        webgl = !!gl && gl instanceof WebGLRenderingContext;
    } catch (err) {
        webgl = false;
    }
    const devicePixelRatio = (window.devicePixelRatio || (win.screen['deviceXDPI'] / win.screen['logicalXDPI']));
    browser = {
        ie: ie,
        ielt9: ie && !document.addEventListener,
        edge: 'msLaunchUri' in navigator && !('documentMode' in document),
        webkit: webkit,
        gecko: gecko,
        android: ua.indexOf('android') !== -1,
        android23: android23,
        chrome: chrome,
        chromeVersion: chromeVersion,
        safari: !chrome && ua.indexOf('safari') !== -1,
        phantomjs: phantomjs,
        ie3d: ie3d,
        webkit3d: webkit3d,
        gecko3d: gecko3d,
        opera12: opera12,
        any3d: any3d,
        mobile: mobile,
        mobileWebkit: mobile && webkit,
        mobileWebkit3d: mobile && webkit3d,
        mobileOpera: mobile && win['opera'],
        mobileGecko: mobile && gecko,
        touch: !!touch,
        msPointer: !!msPointer,
        pointer: !!pointer,
        retina: devicePixelRatio > 1,
        devicePixelRatio,
        language: (navigator as any)['browserLanguage'] ? navigator as any['browserLanguage'] : navigator.language,
        ie9: (ie && (document as any)['documentMode'] === 9),
        ie10: (ie && (document as any)['documentMode'] === 10),
        webgl: webgl
    };
}

export {
    browser
}