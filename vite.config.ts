import type { UserConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default {
    base: './',
    server: {
        port: 10086
    },
    build: {
        outDir: 'build',
        rollupOptions: {
            input: {
                main: './index.html'
            }
        }
    },
    plugins: [
        viteStaticCopy({
            targets: [
                {
                    src: 'plugin/ktx/**/*',    // 'example/plugin/libktx/**/*',
                    dest: '.',
                },
            ]
        })
    ]
} satisfies UserConfig;