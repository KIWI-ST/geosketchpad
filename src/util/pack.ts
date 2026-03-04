/**
 * TypeScript实现WGSL pack4xU8等效功能
 * @param a - 第一个u8值（占u32的0~7位，范围0~255）
 * @param b - 第二个u8值（占u32的8~15位，范围0~255）
 * @param c - 第三个u8值（占u32的16~23位，范围0~255）
 * @param d - 第四个u8值（占u32的24~31位，范围0~255）
 * @returns 打包后的32位无符号整数（u32）
 * @throws 输入值超出u8范围时抛出错误
 */
const pack4xU8 = (a: number, b: number, c: number, d: number): number => {
    // 验证输入是否为合法的u8值（0~255）
    const validateU8 = (val: number, name: string) => {
        if (!Number.isInteger(val) || val < 0 || val > 255) {
            throw new Error(`${name} must be an unsigned 8-bit integer (0~255), got ${val}`);
        }
    };
    validateU8(a, 'a');
    validateU8(b, 'b');
    validateU8(c, 'c');
    validateU8(d, 'd');
    return (
        ((d << 24) | (c << 16) | (b << 8) | a) >>> 0
    );
};

/**
 * 反向解包（验证用）：将pack4xU8的结果还原为4个u8值
 * @param packed - 打包后的32位无符号整数
 * @returns 元组 [a, b, c, d] 对应原始4个u8值
 */
const unpack4xU8 = (packed: number): [number, number, number, number] => {
    // 确保输入是合法的u32值
    if (!Number.isInteger(packed) || packed < 0 || packed > 0xFFFFFFFF) {
        throw new Error('packed value must be an unsigned 32-bit integer (0~4294967295)');
    }
    // 提取各8位段（& 0xFF 过滤高位，>>> 0 确保无符号）
    const a = (packed & 0xFF) >>> 0;
    const b = ((packed >> 8) & 0xFF) >>> 0;
    const c = ((packed >> 16) & 0xFF) >>> 0;
    const d = ((packed >> 24) & 0xFF) >>> 0;
    return [a, b, c, d];
}

const unpack2xU8 = (u16Value: number): [number, number] => {
    // 1. 验证输入是否为合法的u16值（0 ~ 65535）
    if (!Number.isInteger(u16Value) || u16Value < 0 || u16Value > 0xFFFF) {
        throw new Error(`输入值必须是16位无符号整数（0~65535），当前值：${u16Value}`);
    }
    // 2. 提取低8位：& 0xFF 过滤高8位，>>> 0 确保无符号
    const lowU8 = (u16Value & 0xFF) >>> 0;
    // 3. 提取高8位：先右移8位，再过滤高位确保u8范围
    const highU8 = ((u16Value >> 8) & 0xFF) >>> 0;
    // 返回 [低8位, 高8位]（符合WGSL位段顺序）
    return [lowU8, highU8];
}

/**
 * 反向验证：两个u8拼接为u16（可选，用于验证拆解结果）
 */
const pack2xU8 = (lowU8: number, highU8: number): number => {
    // 验证输入是合法的u8值
    const validateU8 = (val: number, name: string) => {
        if (!Number.isInteger(val) || val < 0 || val > 0xFF) {
            throw new Error(`${name}必须是8位无符号整数（0~255），当前值：${val}`);
        }
    };
    validateU8(lowU8, '低8位');
    validateU8(highU8, '高8位');
    // 拼接为u16：高8位左移8位 + 低8位，>>> 0 确保无符号
    return ((highU8 << 8) | lowU8) >>> 0;
}
export {
    pack4xU8,
    unpack4xU8,
    pack2xU8,
    unpack2xU8,
}