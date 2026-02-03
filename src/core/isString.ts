/**
 * reference:
 *  http://www.css88.com/doc/underscore/docs/underscore.html
 */
const isString = (str: any): boolean => {
    return (typeof str == 'string') && str.constructor == String;
}

export { isString }