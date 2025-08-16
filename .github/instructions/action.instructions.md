---
applyTo: '**'
---

这是一个 GitHub Action，用于自动化处理应用镜像的版本更新和 PR 创建。它支持多种应用和变体，并提供灵活的模板系统来生成 PR 标题和内容

## Code Standards

工作目录: `action/`

### Required Before Each Commit

- 确保代码符合 TypeScript 和 ESLint 规范
- 运行 `bun run lint` 检查代码风格
- 使用 [`@actions/toolkit`](https://github.com/actions/toolkit) 提供的工具来处理相关的 GitHub Action 功能
- 类型约束在 `.vscode/meta.schema.json` 中定义，确保代码符合预期的结构和类型

## Development Flow

- 安装依赖: `bun install`
- 开发服务器: `bun run --filter action dev`
- 构建: `bun run --filter build`
- Lint: `bun run lint`

## Key Guidelines

- 代码应具有良好的可读性和一致的风格
- 使用 TypeScript 的类型系统来增强代码的可维护性
