require('dotenv').config();

const async = require("async");
const azure = require('azure-storage');
const express = require('express');
const expressGraphql = require('express-graphql');
const expressSession = require('express-session');
const methodOverride = require('method-override');
const helmet = require('helmet');
const graphiql = require('graphql');
const fs = require("fs");
// const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');

const collaborationController = require('./src/collaboration');
const projectController = require('./src/project');

const blobService = azure.createBlobService();
const queueService = azure.createQueueService();
const tableService = azure.createTableService();
const services = {
  azure: azure,
  blobService: blobService,
  queueService: queueService,
  tableService: tableService
};

collaborationController.setServices(services);
projectController.setServices(services);

const schemaFile = fs.readFileSync("src/schema.graphql", "utf8");

const collaborationSchemaFile = fs.readFileSync("src/collaboration.graphql", "utf8");
const collaborationSchema = graphiql.buildSchema(schemaFile + collaborationSchemaFile);

const projectSchemaFile = fs.readFileSync("src/project.graphql", "utf8");
const projectSchema = graphiql.buildSchema(schemaFile + projectSchemaFile);

const graphiqlEnabled = process.env.GRAPHIQL_ENABLED == 'true';
const app = express();

app.use(methodOverride());
app.use(cookieParser());
app.use(expressSession({ secret: 'keyboard gato', resave: true, saveUninitialized: false }));
// app.use(bodyParser.urlencoded({ extended: true }));

app.use('/v1/graphql/projects', expressGraphql({
  schema: projectSchema,
  rootValue: projectController,
  graphiql: graphiqlEnabled,
  pretty: true
}));

app.use('/v1/graphql/collaboration', expressGraphql({
  schema: collaborationSchema,
  rootValue: collaborationController,
  graphiql: graphiqlEnabled,
  pretty: true
}));

app.get('/vott-training/projects/:projectId/:modelId/annotations.csv', (request, response) => {
  const projectId = request.params.projectId;
  const modelId = request.params.modelId;
  projectController.getTrainingImagesAnnotations(projectId, (error, images) => {
    if (error) {
      console.log(error);
      response.send(error);
      return;
    }

    response.set('Content-Type', 'text/plain; charset=utf8');
    response.set('Content-Disposition', 'attachment;filename=annotations.csv');
    var csv = '';
    for (var i = 0; i < images.length; i++) {
      const image = images[i];

      for (var annotationIndex = 0; annotationIndex < image.annotations.length; annotationIndex++) {
        const annotation = image.annotations[annotationIndex];
        csv += `${image.fileURL},${annotation.boundingBox.x},${annotation.boundingBox.y},${annotation.boundingBox.width},${annotation.boundingBox.height},${annotation.objectClassName}\n`;
      }
    }
    response.send(csv);
  });
})

app.use(express.static('public'));
app.listen(process.env.PORT, () => console.log(`Started on port ${process.env.PORT}`));
