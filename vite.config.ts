import type { UserConfig } from 'vite';

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
    }
} satisfies UserConfig;