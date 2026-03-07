# Prometheus & Grafana (monitoring)

## Apply (after app is running)

From project root `kubernetes/`:

```powershell
kubectl apply -f k8s/monitoring/namespace.yaml
kubectl apply -f k8s/monitoring/prometheus-config.yaml
kubectl apply -f k8s/monitoring/prometheus-rbac.yaml
kubectl apply -f k8s/monitoring/prometheus-deployment.yaml
kubectl apply -f k8s/monitoring/grafana-secret.yaml
kubectl apply -f k8s/monitoring/grafana-datasource.yaml
kubectl apply -f k8s/monitoring/grafana-deployment.yaml
```

Or in one go:

```powershell
kubectl apply -f k8s/monitoring/
```

## Access

- **Grafana:** `minikube service grafana -n monitoring --url` → open the URL (e.g. `http://127.0.0.1:xxxxx`). Login: **admin** / **admin** (change password on first login).
- **Prometheus:** `minikube service prometheus -n monitoring --url` → open the URL (e.g. `http://127.0.0.1:yyyyy`). Or: `http://<minikube-ip>:30090` if NodePort is reachable.

Grafana is preconfigured with Prometheus as the default datasource.

## Optional: scrape your app

To have Prometheus scrape metrics from a pod, add these annotations to the pod template:

```yaml
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "5000"      # or your metrics port
    prometheus.io/path: "/metrics"  # path that serves Prometheus metrics
```

Your backend would need to expose a `/metrics` endpoint in Prometheus format (e.g. with `prom-client` in Node.js).
