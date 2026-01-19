# Dockerfile para desenvolvimento do Expo (não recomendado para produção)
FROM node:20-alpine

WORKDIR /app

# Instalar Expo CLI globalmente
RUN npm install -g expo-cli@latest

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY . .

# Expor porta do Expo
EXPOSE 8081 19000 19001 19002

# Comando para iniciar o Expo
CMD ["npx", "expo", "start", "--tunnel"]
