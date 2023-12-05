import { GLMatrix, Mat4, Vec3 } from "kiwi.matrix";
import { atan, tan } from "../util/fixed";

/**
 * @description 视锥投影矩阵
 */
class PerspectiveCamera {

    private width: number;

    private height: number;

    /**
     * 视野夹角，弧度表示, 默认60°
     */
    private fov: number = Math.PI / 3;

    /**
     * 投影近平面距离
     */
    private near: number;

    /**
     * 投影远平面距离
     */
    private far: number;

    /**
     * 视郁纵横比
     */
    private aspect: number;

    /**
     * 摄像机位置（笛卡尔坐标系）
     */
    private position: Vec3 = new Vec3();

    /**
     * 世界原点
     */
    private target: Vec3 = new Vec3().set(0, 0, 0);

    /**
     * 笛卡尔坐标系，Z轴朝上
     */
    private up: Vec3 = new Vec3().set(0, 0, 1);

    /**
     * 单位矩阵（modelMatrix备用）
     */
    private identityMatrix: Mat4;

    /**
     * 投影矩阵，转换摄像头下物体坐标到屏幕NDC坐标
     */
    private projectionMatrix: Mat4;

    /**
     * 摄像机矩阵，基于摄像机位置观察世界物体的位置矩阵
     */
    private cameraMatrix: Mat4;

    /**
     * 视角矩阵，摄像机矩阵逆矩阵，相当于从世界角度观察摄像机物体位置
     */
    private viewMatrix: Mat4;

    /**
     * 投影矩阵x视角矩阵
     */
    private viewProjectionMatrix: Mat4;

    /**
     * 视锥体参数-top
     */
    private top: number;

    /**
     * 视锥体参数-bottom
     */
    private bottom: number;

    /**
     * 视锥体参数-right
     */
    private right: number;

    /**
     * 视锥体参数-left
     */
    private left: number;

    /**
     * 视锥体参数-sseDenominator
     */
    private sseDenominator: number;

    /**
     * @description 摄像机构造
     * 
     * @example
     * //构造摄像头
     * const camera = new PerspectvieCamera(60, 800, 600, 1, 1000);
     * 
     * @param fov 视锥角度，使用度（°）表示，例如60°
     * @param width viewport像素宽度
     * @param height viewport像素高度
     * @param near 近平面距离
     * @param far 远平面距离
     */
    constructor(fov: number, width: number, height: number, near: number, far: number) {
        this.position.set(height, 0, 0);
        this.width = width;
        this.height = height;
        this.aspect = width && height ? width / height : 1.0;
        this.fov = GLMatrix.toRadian(fov);
        this.near = near ? near : 0.1;
        this.far = far ? far : 2000;
        this.identityMatrix = new Mat4().identity();
        this.projectionMatrix = Mat4.perspective(this.fov, this.aspect, this.near, this.far);
        this.updateProjectionMatrix();
        this.updateViewFrustrum();
    }

    /**
     * 更新投影矩阵
     */
    private updateProjectionMatrix = (): void => {
        const cameraMatrix = new Mat4().lookAt(this.position, this.target, this.up);
        this.cameraMatrix = cameraMatrix.clone();
        this.viewMatrix = cameraMatrix.clone().invert();
        this.viewProjectionMatrix = this.projectionMatrix.clone().multiply(this.viewMatrix)
    }

    /**
     * 更新frustrum可视域体积计算
     */
    private updateViewFrustrum = (): void => {
        //视锥体容积参数转换
        const aspectRatio = this.aspect, fov = this.fov, fovy = aspectRatio <= 1.0 ? fov : atan((tan(fov * 0.5) / aspectRatio) * 2.0), near = this.near;
        //容积计算
        this.top = near * tan(0.5 * fovy);
        this.bottom = -this.top;
        this.right = aspectRatio * this.top;
        this.left = -this.right;
        //sseDenminator
        this.sseDenominator = 2.0 * tan(0.5 * fovy);
    }

    /**
     * 更新摄像头矩阵信息
     * @param v 
     */
    public lookAt = (v: Vec3): void => {
        this.target.set(v.x, v.y, v.z);
        this.updateProjectionMatrix();
    }

    /**
     * 设置摄像机位置
     */
    public set Position(v: Vec3) {
        this.position.set(v.x, v.y, v.z);
        this.updateProjectionMatrix();
    }

    /**
     * 
     */
    public get Position(): Vec3 {
        return this.position;
    }

    /**
     * 摄像头矩阵（以摄像机为中兴观察世界物体坐标表示矩阵）
     */
    public get CameraMatrix(): Mat4 {
        return this.cameraMatrix;
    }

    /**
     * 视角矩阵
     */
    public get ViewMatrix(): Mat4 {
        return this.viewMatrix;
    }

    /**
     * 投影矩阵
     */
    public get ProjectionMatrix(): Mat4 {
        return this.projectionMatrix;
    }

    /**
     * 投影矩阵x视角矩阵
     */
    public get ViewProjectionMatrix(): Mat4 {
        return this.viewProjectionMatrix;
    }

    /**
     * 世界坐标元原点
     */
    public get Target(): Vec3 {
        return this.target;
    }

    /**
     * 摄像机正上方
     */
    public get Up(): Vec3 {
        return this.up;
    }

    /**
     * 单位矩阵
     */
    public get IdentityMatrix(): Mat4 {
        return this.identityMatrix;
    }

    /**
     * 视锥参数
     */
    public get SseDenominator(): number {
        return this.sseDenominator;
    }
}

export { PerspectiveCamera }