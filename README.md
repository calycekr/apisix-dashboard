# APISIX Dashboard (Next-Gen)

A decoupled, 100% client-side visual control plane for Apache APISIX. This project is a modern, lightweight, and type-safe rebuild of the official dashboard, eliminating the need for a custom Go backend and providing direct, browser-to-gateway administration.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](package.json)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](package.json)
[![Ant Design](https://img.shields.io/badge/Ant%20Design-6-0170FE?logo=antdesign)](package.json)
[![TanStack](https://img.shields.io/badge/TanStack-Router%20%26%20Query-FF4154?logo=reactquery)](package.json)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-2EAD33?logo=playwright)](package.json)

---

> [!IMPORTANT]
> **Zero Dashboard Backend**  
> This dashboard runs entirely in the client's browser and communicates directly with the APISIX Admin API. It completely bypasses the legacy Go backend (`manager-api`) and its etcd synchronization layer, eliminating synchronization latency, deployment overhead, and security/CVE audit risks.

---

## Product Preview

![APISIX Dashboard overview](docs/en/assets/screenshots/dashboard-overview-16x9.png)

This is not a mockup. The dashboard above is a static React SPA connected
directly to an APISIX Admin API, rendering live Routes, Services, Upstreams,
plugin usage, health checks, and recent configuration changes without a custom
backend.

What usually surprises people:

*   No `manager-api`: the browser talks to APISIX through the Admin API.
*   No dashboard database: state lives in APISIX and local browser settings.
*   Visual forms, topology, and raw JSON editing are available in one UI.

Start with the [Getting Started guide](docs/en/getting-started.md) for a guided
walkthrough of connection setup, route management, topology, and the API
console.

| Interactive topology | Route configuration | Direct Admin API console |
| :---: | :---: | :---: |
| ![Topology map](docs/en/assets/screenshots/topology-map-16x9.png) | ![Route detail](docs/en/assets/screenshots/route-detail-overview-16x9.png) | ![API console](docs/en/assets/screenshots/raw-api-console-16x9.png) |

---

## Architecture Overview

The official dashboard requires a middleman server to proxy commands to etcd. The next-generation decoupled dashboard establishes a direct path, reducing infrastructure footprint and complexity.

### Legacy Workflow (Official)
```
[ Browser ] --REST--> [ Go Backend (manager-api) ] --Sync--> [ etcd ] --> [ APISIX Gateway ]
```
*   **Drawbacks**: Heavy resource consumption, synchronization lag, additional security exposure, and complex multi-container setup.

### Next-Gen Workflow (Decoupled)
```
[ Browser (Static SPA) ] --Direct Admin API--> [ APISIX Gateway ] --> [ etcd ]
```
*   **Benefits**: Serverless deployment compatibility, instant configuration updates, and zero database dependencies.

---

## Comparison Matrix

| Capability | Official Dashboard | Next-Gen Dashboard (This Repo) |
| :--- | :--- | :--- |
| **Architecture** | Go Backend + etcd Syncer + React SPA | **100% Client-Side React SPA** (Direct Admin API) |
| **Hosting** | Requires Go binary or Docker container | **Static Hosting** (Vercel, Netlify, Nginx, S3, etc.) |
| **Frontend Stack** | React 17 / Webpack | **React 19 / Vite** (Fast HMR, optimized bundle sizing) |
| **State & Sync** | React Router 5 / Redux | **TanStack Router (Type-Safe)** + **TanStack Query (Cached)** |
| **State Storage** | Server-side database / etcd | **Local Browser Storage** (Zod-validated Jotai atoms) |
| **Visual Topology** | Not supported | **Interactive Topology Map** (`@xyflow/react` + `dagre`) |
| **AI Gateway support** | Not supported | **Dedicated AI plugin templates** (OpenAI, AWS Bedrock, etc.) |
| **Editor System** | Rigid multi-step wizard / basic text inputs | **Side-by-Side Pro Forms & Monaco Editor** (Simultaneous visual & raw JSON co-editing) |

---

## Key Features

*   **Modern Enterprise UI**: Designed with Ant Design 6, Inter-based UI typography, and IBM Plex Mono for code, IDs, and JSON. Supports responsive layout grids and dynamic dark mode customization.
*   **Interactive Topology Map**: Built using `@xyflow/react` and `dagre` graph layouts. Instantly renders the logical relationship: `Route -> Service -> Upstream -> Backend Targets`.
*   **AI Gateway Presets**: Dedicated forms and validation schemas for APISIX AI plugins (e.g., `ai-proxy` and `ai-proxy-multi`) covering OpenAI, AWS Bedrock, and OpenAI-compatible models.
*   **Visual & RAW JSON Co-Editing**: Bypasses the slow, multi-step wizards of the official dashboard. You can configure resources visually using forms, or write/paste raw JSON directly in a side-by-side Monaco Editor. Real-time Zod schema validation and autocomplete prevent syntax errors before saving.
*   **Direct API Integration**: Safely authenticate directly to your gateway. Admin API keys are stored locally inside the browser's sandbox, while API traffic uses the same-origin `/apisix/admin` path.
*   **Backup & Migration Engine**: Export and import gateway routing rules, services, upstreams, and SSL certificates in a unified JSON format in a single click.
*   **Direct Admin API Console**: Build, send, and inspect APISIX Admin API requests from the dashboard UI without leaving the control plane.

---

## Integration & Hosting

> [!TIP]
> **CORS-Free Deployment**  
> Serving the built static files directly from the APISIX gateway (Option A) automatically avoids cross-origin requests, as the dashboard shares the same origin and port with the Admin API.

### Option A: Embedded inside APISIX Gateway (Recommended)
You can serve this dashboard directly from your running APISIX gateway instance.

1. **Build the production static assets**:
   ```bash
   pnpm install
   pnpm build
   ```
2. **Copy the build folder** into your APISIX gateway instance:
   ```bash
   # Copy the static dist contents to APISIX's UI folder
   cp -r dist/* /usr/local/apisix/ui/
   ```
3. **Enable the UI** in your APISIX `conf/config.yaml` and restart the gateway:
   ```yaml
   deployment:
     admin:
       enable_admin_ui: true
   ```
4. Access the dashboard at `http://<your-apisix-host>:9180/ui/`.

---

### Option B: Standalone Static Hosting
Because the project is compiled into static assets, it can be hosted on any static file server or CDN.

1. Build the project using `pnpm build`.
2. Upload the generated `dist/` directory to Nginx, S3, Vercel, Netlify, or Cloudflare Pages.
3. Configure the host or edge proxy to forward `/apisix/admin` to the APISIX Admin API.
4. Access the hosted URL, click the **Settings** icon, and input your APISIX Admin Key.

---

## Local Development & Testing

### Prerequisites
*   Node.js 22+
*   PNPM 10+

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/jinbagi/apisix-dashboard.git
   cd apisix-dashboard
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the development server:
   ```bash
   pnpm dev
   ```
   The development server runs at `http://localhost:5173/ui/` and proxies `/apisix/admin` requests to `http://localhost:9180` by default. Override the target gateway endpoint if needed:
   ```bash
   VITE_APISIX_API_TARGET=http://your-apisix-host:9180 pnpm dev
   ```

### Dev Container Integration
A fully configured `.devcontainer` configuration is included. Opening the repository in VS Code with the Dev Containers extension will automatically spin up APISIX, etcd, Node.js, and pnpm.

### Code Quality & E2E Testing
Run the codebase test suites to verify compilation, lint rules, and CRUD functionality:

*   **Lint Check**:
    ```bash
    pnpm lint
    ```
*   **Type Compilation**:
    ```bash
    pnpm build
    ```
*   **Playwright E2E Tests** (Requires the gateway container to be running):
    ```bash
    pnpm e2e
    ```

---

## Contributing

Contributions are welcome. Please read our [Contributing Guide](CONTRIBUTING.md) for details on submitting bug reports, feature requests, and pull requests.

## License

Licensed under the [Apache License 2.0](LICENSE).
