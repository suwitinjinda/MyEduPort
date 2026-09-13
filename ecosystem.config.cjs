// PM2 process manager config for MyEduPort
// Usage:
//   pm2 start ecosystem.config.cjs           # start both processes
//   pm2 reload myeduport-backend             # zero-downtime reload (after backend code changes)
//   pm2 logs myeduport-backend               # tail logs
//   pm2 save && pm2 startup                  # persist across reboots
module.exports = {
  apps: [
    {
      name: "myeduport-backend",
      cwd: "./backend",
      script: "src/index.js",
      interpreter: "node",
      env: { NODE_ENV: "development" },
      env_production: { NODE_ENV: "production" },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "500M",
      error_file: "../logs/backend-error.log",
      out_file: "../logs/backend-out.log",
      merge_logs: true,
      time: true
    },
    {
      name: "myeduport-frontend",
      cwd: "./frontend",
      script: "npm",
      args: "run dev",
      env: { NODE_ENV: "development" },
      watch: false,
      autorestart: true,
      max_restarts: 5,
      min_uptime: "10s",
      error_file: "../logs/frontend-error.log",
      out_file: "../logs/frontend-out.log",
      merge_logs: true,
      time: true
    }
  ]
};
