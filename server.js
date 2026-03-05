const express = require('express');
const path = require('path');

const apiRoutes = require('./src/routes/api');
const pageRoutes = require('./src/routes/pages');

const API_PORT = parseInt(process.env.API_PORT, 10) || 3000;
const USER_PORT = parseInt(process.env.USER_PORT, 10) || 3001;

// API server (agent-facing)
const apiApp = express();
apiApp.use(apiRoutes);

// User server (human-facing)
const userApp = express();
userApp.set('view engine', 'ejs');
userApp.set('views', path.join(__dirname, 'views'));
userApp.use(express.static(path.join(__dirname, 'public')));
userApp.use(pageRoutes);

apiApp.listen(API_PORT, () => {
  console.log(`API server listening on port ${API_PORT}`);
});

userApp.listen(USER_PORT, () => {
  console.log(`User server listening on port ${USER_PORT}`);
});
