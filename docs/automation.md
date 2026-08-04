# Automation & Tooling

This document outlines the automation scripts and developer utilities provided in the PHOS repository. As the Infrastructure Engineer, AntiGravity maintains these scripts to ensure deterministic, repeatable, and maintainable operations.

## Root Batch Scripts (Windows)

To provide a zero-friction developer onboarding, PHOS includes several one-click `.bat` scripts in the root of the project:

- **`Start PHOS.bat`**: Bootstraps the project, installs dependencies, validates the environment, generates Prisma clients, and starts the development server.
- **`Update PHOS.bat`**: Pulls the latest code from git, re-runs bootstrap to install any new dependencies, and exits.
- **`Backup PHOS.bat`**: Safely copies the SQLite database (`dev.db`) into the `/backups` directory with a timestamp.
- **`Restore PHOS.bat`**: Lists available backups and allows the developer to interactively choose a backup to restore to `dev.db`.

## PowerShell Utilities (`/scripts`)

The batch files act as wrappers for more sophisticated PowerShell utilities located in the `/scripts` directory. These can be run independently:

- **`bootstrap.ps1`**: Runs environment verification, installs NPM packages, and triggers Prisma generation if the schema is present.
- **`verify-env.ps1`**: Ensures Node.js and NPM are installed and accessible in the system PATH.
- **`backup.ps1`**: Performs the backup logic.
- **`restore.ps1`**: Performs the restoration logic interactively.
- **`clean.ps1`**: Removes generated artifacts like `node_modules`, `.next`, `dist`, `out`, and `build` for a fresh workspace.
- **`diagnostics.ps1`**: Outputs the current system state, Node/NPM versions, and checks if the database and dependencies exist.

## Safe Automation Principles

- All scripts are designed to be idempotent (can be run multiple times safely).
- The `restore` script requires explicit user confirmation before overwriting the active database.
- Errors fail fast and output clear messages to the terminal to guide developers.
