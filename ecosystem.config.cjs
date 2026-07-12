module.exports = {
  apps: [
    {
      name: "ryukomik",
      script: "npm",
      args: "start",
      cwd: "/home/ryukomik/ryukomik",
      env: {
        NODE_EXTRA_CA_CERTS: "/etc/ssl/certs/ca-certificates.crt",
        NODE_ENV: "production",
      },
    },
    {
      name: "ryukomik-push-cron",
      script: "scripts/cron-push-notify.mjs",
      cwd: "/home/ryukomik/ryukomik",
      cron_restart: "*/15 * * * *",
      autorestart: false,
      env: {
        NODE_EXTRA_CA_CERTS: "/etc/ssl/certs/ca-certificates.crt",
      },
    },
  ],
};
