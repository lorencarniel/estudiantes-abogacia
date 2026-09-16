const { defineConfig, devices } = require('@playwright/test');
module.exports=defineConfig({testDir:'./e2e',webServer:{command:'uvicorn tests.e2e_server:app --port 8765',url:'http://127.0.0.1:8765',reuseExistingServer:false},use:{baseURL:'http://127.0.0.1:8765'},projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['Pixel 7']}}]});
