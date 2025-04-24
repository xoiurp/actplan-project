docker run -d -p 8080:80 --name actplan-container \
  -e VITE_SUPABASE_URL="https://cspnmypytthuaaneqafq.supabase.co" \
  -e VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzcG5teXB5dHRodWFhbmVxYWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NTY4NTQsImV4cCI6MjA1ODQzMjg1NH0.-L_qwPTRZYtf3oT7KPR_66GlYfIQ1diP-x4_4hsgeN4" \
  --restart unless-stopped \
  actplan-app

  sudo docker build \
  --build-arg VITE_SUPABASE_URL="https://cspnmypytthuaaneqafq.supabase.co" \
  --build-arg VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzcG5teXB5dHRodWFhbmVxYWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NTY4NTQsImV4cCI6MjA1ODQzMjg1NH0.-L_qwPTRZYtf3oT7KPR_66GlYfIQ1diP-x4_4hsgeN4" \
  -t actplan-app .

  Pull das Mudanças:

cd ~/actplan-project # Ou onde você clonou

git pull origin main

Rebuild da Imagem com Build Args: (Substitua com suas credenciais)
  sudo docker build \
  --build-arg VITE_SUPABASE_URL="https://cspnmypytthuaaneqafq.supabase.co" \
  --build-arg VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzcG5teXB5dHRodWFhbmVxYWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NTY4NTQsImV4cCI6MjA1ODQzMjg1NH0.-L_qwPTRZYtf3oT7KPR_66GlYfIQ1diP-x4_4hsgeN4" \
  -t actplan-app .

Parar e Remover Container Antigo:
sudo docker stop actplan-container || true
sudo docker rm actplan-container || true
Executar Novo Container:
sudo docker run -d -p 8080:80 --name actplan-container \
  --restart unless-stopped \
  actplan-app