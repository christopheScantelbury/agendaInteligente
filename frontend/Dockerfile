# Multi-stage build
FROM node:20-alpine AS build

WORKDIR /app

# Argumento para URL da API
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Copiar arquivos de dependências
COPY package*.json ./
RUN npm install

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Imagem de produção com Nginx
FROM nginx:alpine

# Copiar build para nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar template do nginx (será processado pelo entrypoint do nginx:alpine)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Variável de ambiente com valor padrão
ENV BACKEND_HOST=backend

EXPOSE 80

# O nginx:alpine processa automaticamente templates em /etc/nginx/templates/*.template
CMD ["nginx", "-g", "daemon off;"]

