{
  "apps": [
    {
      "name": "fireworks-api",
      "script": "server/index.js",
      "cwd": "/home/wp_rgntit/fireworks-inventory",
      "instances": 1,
      "exec_mode": "fork",
      "env_production": {
        "NODE_ENV": "production",
        "PORT": 3001
      }
    },
    {
      "name": "fireworks-frontend",
      "script": "npx",
      "args": "serve -s dist -l 5173",
      "cwd": "/home/wp_rgntit/fireworks-inventory",
      "instances": 1,
      "exec_mode": "fork",
      "env_production": {
        "NODE_ENV": "production"
      }
    }
  ]
}
