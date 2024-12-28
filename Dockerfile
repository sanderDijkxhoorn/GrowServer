FROM oven/bun:latest

# Create app directory
# COPY package.json ./
# COPY bun.lockb ./
COPY . .

# Install dependencies
# RUN bun install 
RUN bun install --production

# Expose ports
EXPOSE 17091 80 8080 443

# Run the app
# RUN bun run dev
CMD ["bun", "run", "dev"]