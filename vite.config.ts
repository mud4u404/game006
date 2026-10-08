import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';

// base 用相对路径，这样部署到 GitHub Pages 的子路径下也能正常加载
export default defineConfig({
  base: './',
  // 助手的独立工作区（.claude/worktrees）里也有一份测试，本机跑测试时别把它们算进来
  test: { exclude: [...configDefaults.exclude, '.claude/**'] },
  build: {
    outDir: 'dist',
    target: 'es2020',
    rollupOptions: {
      input: { main: 'index.html', lab: 'lab.html' }
    }
  }
});
