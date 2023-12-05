import { IRenderer } from './IRenderer';
import { EventEmitter } from '../core/EventEmitter';


/**
 * 可渲染对象通用方法
 * }{debug, 是否存在一种类型限定方法：
 * 例如 rendererClass: ClassDecorator where T: IRenderer
 * 每个可渲染的对象理论上都需要一个特定的渲染器，例如:
 * -topoLayer，可能需要特定的topoRenderer
 * -canvasLayer，需要特定的renderer渲染器
 */
class Renderable extends EventEmitter {
    /**
     * 渲染器hashmap 
     */
    static renderers: Map<string, { new(...args: any[]): IRenderer }> = new Map();

    /**
     * 注册渲染器到管理端
     * @param name 
     * @param clazz 
     */
    static registerRenderer = (name: string, clazz: { new(...args: any[]): IRenderer }) => {
        Renderable.renderers.set(name, clazz);
    }

    /**
     * 获取可渲染对象的渲染器
     * @param name 
     */
    protected getRegisterRender = (name: string): { new(...args: any[]): IRenderer } => {
        const clazz = Renderable.renderers.get(name);
        return clazz;
    }
}

export { Renderable }
