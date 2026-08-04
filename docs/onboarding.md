# Developer Onboarding

Welcome to the PHOS engineering team. This document will guide you through setting up the repository and beginning your development workflow.

## 1. Prerequisites

- Node.js (v18 or higher)
- npm or pnpm
- Git
- VS Code (recommended)

## 2. Initial Setup

Currently in Sprint 0, the project setup is fully manual. Once Sprint 1 (Bootstrap Automation) is complete, you will be able to run a single setup command.

For now, simply clone the repository:

```bash
git clone <repository_url>
cd mysterious-fermi
```

## 3. Recommended Workflow

- Read the [Infrastructure Architecture](infrastructure.md) to understand the boundary between AntiGravity (Infrastructure) and Claude (Business Logic).
- Ensure your editor is configured to use the provided `.editorconfig`, `.prettierrc.json`, and `.eslintrc.json` files.
- Before opening a PR, ensure you review the [Repository Conventions](conventions.md).
