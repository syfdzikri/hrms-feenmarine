# Changelog

All notable changes to this project are documented in this file.

## v12.2.0 - 2026-04-30

### Added
- New modular page structure across `pages`, `components`, `hooks`, `constants`, and `utils` to improve maintainability.
- New To-Do workspace with full/simple mode, projects, advanced filters, drag and drop, and quick note panel.
- Firebase service foundation (`auth`, `client`) and reusable hooks for data, online users, pagination, offline queue, clock, and dark mode.
- New pages and sections for dashboard, analytics, approvals, users, history, config, FAT, izin, overseas, and login.

### Changed
- UI architecture refactor from monolithic layout into reusable route and overlay components.
- Dark mode color system refined globally with additional contrast and readability improvements, including To-Do tuning for panel hierarchy and interaction states.
- App theme style rules expanded for chat, calendar, dashboard KPI cards, scrollbars, badges, tables, and modal overlays.
- Build and tooling configs updated (`vite`, `typescript`, `eslint`, and related project config updates).

### Fixed
- Improved visual consistency for dark mode backgrounds, borders, text levels, hover states, and input focus across core pages.
- Better role-based and module-level UX consistency in operational flows (leave/izin, overseas, approvals, FAT, and history).

## v12.1.0 - Previous

- Sick permit (MC) flow with required MC field and integration to calendar and logs.
- Employee CSV import with validation, duplicate skip, and template download.
- Dashboard separation for Leave quota vs Permit quota visibility.
- User management UI/UX polish and overseas project-type flexibility.
- Backup/restore, login rate-limiting, Telegram notifications, approval comments, and broadcast announcement support.
