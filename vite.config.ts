import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';

// base 用相对路径，这样部署到 GitHub Pages 的子路径下也能正常加载
export default defineConfig({
  base: './',
  // 助手的独立工作区（.claude/worktrees）里也有一份测试，本机跑测试时别把它们算进来；外接硬盘上的 ._ 垃圾文件也不算
  // 单个测试默认 5 秒：CI 上乱点、走遍测试占满 CPU 时，「场景不挤」这类要遍历的测试会超过，随机变红；放宽到 30 秒
  test: { testTimeout: 30000, exclude: [...configDefaults.exclude, '.claude/**', '**/._*'] },
  build: {
    outDir: 'dist',
    target: 'es2020',
    rollupOptions: {
      input: { main: 'index.html', lab: 'lab.html', xin: 'xin/index.html' }
    }
  }
});
