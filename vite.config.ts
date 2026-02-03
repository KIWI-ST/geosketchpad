import type { UserConfig } from 'vite';

export default {
    base: './',
    server: {
        port: 4080,
        strictPort: true
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
