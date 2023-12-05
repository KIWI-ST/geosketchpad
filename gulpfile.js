
//多入口打包，先打包worker后打包index
const rollup = require('rollup').rollup;
const nodeResolve = require('@rollup/plugin-node-resolve').nodeResolve;
const rollupTypescript = require('@rollup/plugin-typescript');
const commonjs = require('@rollup/plugin-commonjs');

//gulp
const gulp = require('gulp');
const fs = require('fs');
const path = require('path');
const Bundler = require('parcel-bundler');
const parcel = require('parcel');

//功能函数：清空文件夹
function dleDir(path) {
    let files = [];
    if (fs.existsSync(path)) {
        files = fs.readdirSync(path);
        files.forEach((file, index) => {
            let curPath = path + '/' + file;
            if (fs.statSync(curPath).isDirectory())
                dleDir(curPath);
            else
                fs.unlinkSync(curPath);
        });
        fs.rmdirSync(path);
    }
}

//功能: worker打包
gulp.task('worker', async function () {
    dleDir('./dist/worker/');
    const workerDir = './src/worker/';
    //获取指定路径下的文件
    fs.readdir(workerDir, function (err, files) {
        files.forEach(async (f) => {
            const p = workerDir + f;
            const ext = path.extname(f);
            const df = f.replace(ext, '');
            const bundle = await rollup({
                input: p,
                plugins: [
                    commonjs(),
                    nodeResolve(),
                    rollupTypescript()
                ]
            });
            await bundle.write({
                file: './dist/worker/' + df + '.txt',
                format: 'umd'
                // sourcemap:true
            });
        });
    });
});

//功能：全功能打包
gulp.task('build', async function () {
    const bd = new parcel('./src/index.ts', { outDir: './dist/bundle/' });
    await bd.bundle();
    await bd.stop();
});

//功能：整包发布
gulp.task('release', gulp.series(['worker', 'build']));