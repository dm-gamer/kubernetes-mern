# MERN Student Dashboard — Kubernetes & CI/CD

A full-stack **Student Dashboard** (MERN: MongoDB, Express, React, Node) with authentication, containerization, Kubernetes deployment, monitoring, and GitHub Actions CI/CD.

---

## What We Did (Top to Bottom)

### 1. Frontend (React + Vite)

- **Stack:** React 19, Vite 7, modern ES modules.
- **Features:**
  - **Auth:** Login and Register with email/password; JWT stored in memory.
  - **Dashboard (after login):** Add students (name, age, course), list students in a table, delete students, refresh list.
  - **UI:** Single-page app with auth layout (centered card) and dashboard layout; dark theme (gradients, cards, buttons) in `App.css`.
- **API:** Calls backend at `http://localhost:5000/api` (configurable for production via same origin + Ingress).
- **Build:** `npm run build` → static output in `dist/`.
- **Docker:** Multi-stage build (Node for build, Nginx for serving) → image served on port 80.

**Key files:** `frontend/src/App.jsx`, `frontend/src/App.css`, `frontend/package.json`, `frontend/Dockerfile`, `frontend/vite.config.js`.

---

### 2. Backend (Node + Express)

- **Stack:** Express 5, Mongoose (MongoDB), JWT, bcryptjs, CORS, dotenv, prom-client.
- **Features:**
  - **Auth:** `POST /api/register`, `POST /api/login` (returns JWT).
  - **Students (protected):** `GET /api/students`, `POST /api/students`, `DELETE /api/students/:id` — all require `Authorization: Bearer <token>`.
  - **Health:** `GET /api/health` — returns 200 when DB is connected, 503 when not (for K8s probes).
  - **Metrics:** `GET /metrics` — Prometheus format (default Node metrics via prom-client).
- **Data:** User model (email, hashed password); Student model (name, age, course, owner → User). Students are scoped per user.
- **Config:** `PORT`, `MONGO_URI`, `JWT_SECRET` from env (e.g. `backend/.env` locally; K8s uses Secret).
- **Docker:** Node 20 Alpine, production deps only, `npm start` on port 5000.

**Key files:** `backend/server.js`, `backend/src/routes/auth.js`, `backend/src/routes/students.js`, `backend/src/models/User.js`, `backend/src/models/Student.js`, `backend/src/middleware/auth.js`, `backend/package.json`, `backend/Dockerfile`.

---

### 3. Docker & Local Run

- **docker-compose.yml** (project root):
  - **mongodb:** Mongo 7, port 27017, persistent volume `mongo_data`.
  - **backend:** Build from `./backend`, env from `./backend/.env`, port 5000, depends on mongodb.
  - **frontend:** Build from `./frontend`, port 3000 → 80, depends on backend.
- **Run locally:** `docker-compose up --build` then frontend at `http://localhost:3000`, API at `http://localhost:5000`.

---

### 4. Kubernetes (K8s)

All app resources use the **`mern`** namespace (create it if needed: `kubectl create namespace mern`).

**Base manifests in `k8s/`:**

- **deployment.yaml** — MongoDB deployment (mongo:7), 1 replica, volume from PVC.
- **service.yaml** — MongoDB ClusterIP service (port 27017).
- **pvc.yaml** — PersistentVolumeClaim for MongoDB data (1Gi, ReadWriteOnce).
- **secret.yaml** — `backend-secret`: `MONGO_URI`, `JWT_SECRET` for backend pods.
- **ingress.yaml** — Nginx Ingress: `/` → frontend-service:80, `/api` → backend-service:5000.
- **networkpolicy.yaml** — Only frontend pods can talk to backend pods.

**App manifests in `backend/` and `frontend/`:**

- **backend/deployment.yaml** — Backend deployment: image `sanjay5raj/backend:latest`, env from `backend-secret`, liveness (TCP 5000), readiness (`/api/health`), resource requests/limits, Prometheus scrape annotations (`/metrics`).
- **backend/service.yaml** — `backend-service` ClusterIP on port 5000.
- **backend/hpa.yaml** — HorizontalPodAutoscaler for backend (1–5 replicas, 70% CPU target).
- **frontend/deployment.yaml** — Frontend deployment: image `sanjay5raj/frontend:latest`, port 80.
- **frontend/service.yaml** — `frontend-service` ClusterIP on port 80.

**Apply (from repo root):**

```powershell
kubectl create namespace mern
kubectl apply -f k8s/
kubectl apply -f backend/
kubectl apply -f frontend/
kubectl rollout status deployment/backend -n mern
kubectl rollout status deployment/frontend -n mern
```

Ingress assumes an Nginx Ingress Controller (e.g. on Minikube: `minikube addons enable ingress`). Then open the Ingress host (e.g. `http://127.0.0.1` or Minikube IP) to use the app.

---

### 5. Monitoring (Prometheus & Grafana)

- **Location:** `k8s/monitoring/`.
- **Contents:** Namespace `monitoring`, Prometheus deployment + config + RBAC, Grafana deployment + default admin secret + Prometheus datasource. Prometheus is configured to scrape the `mern` and `monitoring` namespaces; backend exposes `/metrics` and has scrape annotations.
- **Apply:** From project root, `kubectl apply -f k8s/monitoring/`.
- **Access:** Use `kubectl` or `minikube service` to get URLs for Grafana and Prometheus (see `k8s/monitoring/README.md`).

---

### 6. CI/CD (GitHub Actions)

- **Workflow:** `.github/workflows/cicd.yml`.
- **Trigger:** Push to `main`.
- **Runner:** Self-hosted, Windows, x64; uses `KUBECONFIG` for cluster access.
- **Steps:**
  1. Checkout repo.
  2. **Backend:** Node 20, `npm ci` in `backend/` (tests can be enabled later).
  3. **Frontend:** Node 20, `npm ci` and `npm run build` in `frontend/`.
  4. **Docker:** Login to Docker Hub using `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets.
  5. **Build & push:** Backend image → `sanjay5raj/backend:latest`, Frontend image → `sanjay5raj/frontend:latest`.
  6. **Deploy:** `kubectl apply -f k8s/ -f backend/ -f frontend/`, then wait for `deployment/backend` and `deployment/frontend` rollouts in namespace `mern`.

**Secrets to set in the repo:** `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`. Runner machine needs `kubectl` and access to the target cluster (e.g. `C:\Users\Sanjay\.kube\config`).

---

## Project Layout (Summary)

```
kubernetes/
├── .github/workflows/cicd.yml    # CI/CD pipeline
├── docker-compose.yml            # Local Docker run
├── README.md                     # This file
├── backend/
│   ├── server.js                 # Express app, health, metrics
│   ├── Dockerfile
│   ├── deployment.yaml           # K8s deployment + probes
│   ├── service.yaml
│   ├── hpa.yaml
│   └── src/
│       ├── routes/auth.js        # register, login
│       ├── routes/students.js    # CRUD students (auth)
│       ├── models/User.js, Student.js
│       └── middleware/auth.js   # JWT check
├── frontend/
│   ├── src/App.jsx, App.css     # UI and API calls
│   ├── Dockerfile               # Build + Nginx
│   ├── deployment.yaml
│   └── service.yaml
└── k8s/
    ├── deployment.yaml          # MongoDB
    ├── service.yaml
    ├── pvc.yaml
    ├── secret.yaml
    ├── ingress.yaml
    ├── networkpolicy.yaml
    └── monitoring/              # Prometheus + Grafana
```

---

## Quick Start (Local)

1. **Backend env:** Create `backend/.env` with `MONGO_URI`, `JWT_SECRET`, optional `PORT`.
2. **With Docker:**  
   `docker-compose up --build`  
   Frontend: http://localhost:3000 — API: http://localhost:5000
3. **Without Docker:**  
   Start MongoDB (e.g. local or container). In `backend`: `npm install && npm run dev`. In `frontend`: `npm install && npm run dev`. Use backend URL in `frontend/src/App.jsx` if different from default.

---

## Summary

From top to bottom we implemented: a **React frontend** (auth + student CRUD + styled UI), an **Express backend** (JWT auth, student API, health and Prometheus metrics), **Docker** (compose + Dockerfiles), **Kubernetes** (MongoDB, backend, frontend, Ingress, secrets, PVC, network policy, HPA), **Prometheus/Grafana** monitoring, and **GitHub Actions** to build, push images, and deploy to the cluster on push to `main`.
