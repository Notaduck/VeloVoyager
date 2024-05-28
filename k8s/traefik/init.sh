helm repo add traefik https://helm.traefik.io/traefik
helm repo update
kubectl create namespace traefik
kubectl get namespaces
helm install --namespace=traefik traefik traefik/traefik --values=values.yaml
kubectl get svc --all-namespaces -o wide
kubectl get pods --namespace traefik

