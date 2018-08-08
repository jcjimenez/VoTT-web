process.chdir(__dirname);

require('dotenv').config();

const PORT = process.env.PORT || 8080;

const azureStorage = require('azure-storage');
const bodyParser = require('body-parser');
const connect_ensure_login = require('connect-ensure-login');
const cookieParser = require('cookie-parser');
const express = require('express');
const expressSession = require('express-session');
const passport = require('passport');
const passportGithub = require('passport-github');
const path = require('path');

const blobServiceConnectionString = process.env.BLOB_SERVICE_CONNECTION_STRING;
const blobService = azureStorage.createBlobService(blobServiceConnectionString);

const tableServiceConnectionString = process.env.TABLE_SERVICE_CONNECTION_STRING;
const tableService = azureStorage.createTableService(tableServiceConnectionString);

const queueServiceConnectionString = process.env.QUEUE_SERVICE_CONNECTION_STRING;
const queueService = azureStorage.createQueueService(queueServiceConnectionString);

passport.use(new passportGithub.Strategy(
  {
    clientID: process.env.GITHUB_CLIENT,
    clientSecret: process.env.GITHUB_SECRET,
    callbackURL: "http://localhost:8080/auth/github/callback"
  },
  (accessToken, refreshToken, profile, cb) => {
    return cb(null, profile);
  }
));
passport.serializeUser((user, done) => {
  /**
   * Github replies with something like:
   * {
   *   "id":"1117904",
   *   "displayName":"Juan Carlos Jimenez",
   *   "username":"jcjimenez",
   *   "provider":"github",
   *   ...
   * }
   */
  done(null, JSON.stringify(user));
});
passport.deserializeUser((user, done) => {
  done(null, JSON.parse(user));
});

const app = express();
app.use(cookieParser());
app.use(expressSession({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(passport.session());

app.get('/login', passport.authenticate('github'));
app.get('/vott', connect_ensure_login.ensureLoggedIn(), (req, res, next) => {
  next();
});
app.get(
  '/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/');
  }
);

const projectService = new (require('./src/model/project-service').ProjectService)(
  blobService,
  tableService,
  queueService
);
const projectController = new (require('./src/api/project-controller')).ProjectController(projectService);

// TODO: Enforce policies.
const router = new express.Router();
router.get('/projects', (req, res) => { projectController.list(req, res); });
router.post('/projects', (req, res) => { projectController.create(req, res); });
router.get('/projects/:id', (req, res) => { projectController.read(req, res); });
router.put('/projects/:id', (req, res) => { projectController.update(req, res); });
router.delete('/projects/:id', (req, res) => { projectController.delete(req, res); });

router.get('/projects/:projectId/images/:imageId', (req, res) => { projectController.image(req, res); });

router.post('/projects/:id/instructionsImage', (req, res) => { projectController.allocateInstructionsImage(req, res); });
router.put('/projects/:id/instructionsImage', (req, res) => { projectController.commitInstructionsImage(req, res); });

app.use('/api/vott/v1', router);

app.use(require('serve-static')(path.join(__dirname, 'public')));
app.listen(PORT, () => console.log(`Listening on port ${PORT}.`));
