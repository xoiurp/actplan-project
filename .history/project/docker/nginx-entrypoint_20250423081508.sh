#!/bin/sh

# Gerar arquivo de configuração de ambiente para o frontend
echo "window._env_ = {" > /usr/share/nginx/html/env-config.js
echo "  VITE_SUPABASE_URL: \"$VITE_SUPABASE_URL\"," >> /usr/share/nginx/html/env-config.js
echo "  VITE_SUPABASE_ANON_KEY: \"$VITE_SUPABASE_ANON_KEY\"," >> /usr/share/nginx/html/env-config.js
echo "  VITE_EXTRACTION_API_URL: \"$VITE_EXTRACTION_API_URL\"" >> /usr/share/nginx/html/env-config.js
echo "};" >> /usr/share/nginx/html/env-config.js

# Executar o comando original do Nginx
exec nginx -g "daemon off;"