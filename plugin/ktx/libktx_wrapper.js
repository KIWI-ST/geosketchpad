let ktx, initPromise;

export async function LoadLIBKTX() {
    if (ktx) {
        return ktx;
    }
    if (initPromise) {
        return initPromise;
    }
    initPromise = new Promise(async (resolve, reject) => {
        const script = document.createElement('script');
        script.type = 'module';
        const currentUrl = new URL(import.meta.url);
        const libktxWapper = currentUrl.origin + currentUrl.pathname;
        const libktxPath = libktxWapper.replace(/[^\/]+\.js$/, 'libktx.js');
        // const libktxModule = await import(/* @vite-ignore */ libktxPath);
        // return await libktxModule.LIBKTX();
        script.src = libktxPath;
        document.head.appendChild(script);
        script.addEventListener('load', async () => {
            try {
                await new Promise(res => setTimeout(res, 50));
                if (typeof LIBKTX !== 'function') {
                    throw new Error('LIBKTX function is not defined after loading libktx.js');
                }
                const result = await LIBKTX();
                resolve(result);
            }
            catch (error) {
                reject(error);
            }
        });
    });

    return initPromise;
}
