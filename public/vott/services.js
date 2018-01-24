angular.module('vott.factories', [])
    .factory('ProjectService', function ($http) {
        const baseUrl = '/v1/graphql/projects';
        return {
            getProjects: function (nextPageToken) {
                const invocation = nextPageToken ? `projects(nextPageToken:${JSON.stringify(nextPageToken)})` : 'projects';
                return $http({
                    method: 'POST',
                    url: baseUrl,
                    data: { query: "query { " + invocation + "{ nextPageToken entries { projectId name taskType } } }" }
                });
            },
            getProject: function (projectId) {
                return $http({
                    method: 'POST',
                    url: baseUrl,
                    data: { query: `query { project (projectId:${JSON.stringify(projectId)} ) { projectId name taskType objectClassNames instructionsText instructionsImageURL } }` }
                });
            },
            createProject: function (project) {
                const parameters = [
                    `name:${JSON.stringify(project.name)}`,
                    `taskType:${project.taskType}`,
                    `objectClassNames:${JSON.stringify(project.objectClassNames)}`,
                    `instructionsText:${JSON.stringify(project.instructionsText)}`
                ].join(', ');
                return $http({
                    method: 'POST',
                    url: baseUrl,
                    data: { query: `mutation { createProject (${parameters}) { projectId } }` }
                });
            },
            updateProject: function (project) {
                const parameters = [
                    `projectId:${JSON.stringify(project.projectId)}`,
                    `name:${JSON.stringify(project.name)}`,
                    `taskType:${project.taskType}`,
                    `objectClassNames:${JSON.stringify(project.objectClassNames)}`,
                    `instructionsText:${JSON.stringify(project.instructionsText)}`
                ].join(', ');
                return $http({
                    method: 'POST',
                    url: baseUrl,
                    data: { query: `mutation { updateProject (${parameters}) { projectId } }` }
                });
            },
            removeProject: function (projectId) {
                return $http({
                    method: 'POST',
                    url: baseUrl,
                    data: { query: `mutation { removeProject (projectId:${JSON.stringify(projectId)}) }` }
                });
            },
            //  createInstructionsImage(projectId: String!): Image
            createInstructionsImage: function (projectId) {
                return $http({
                    method: 'POST',
                    url: baseUrl,
                    data: { query: `mutation { createInstructionsImage (projectId:${JSON.stringify(projectId)}) { projectId fileId fileURL } }` }
                });
            },
            commitInstructionsImage: function (confirmedFile) {
                const parameters = [
                    `projectId:${JSON.stringify(confirmedFile.projectId)}`,
                    `fileId:${JSON.stringify(confirmedFile.fileId)}`
                ].join(', ');
                return $http({
                    method: 'POST',
                    url: baseUrl,
                    data: { query: `mutation { commitInstructionsImage (image:{ ${parameters} }) }` }
                });
            },
            images: function (projectId, nextPageToken) {
                const invocation = nextPageToken ?
                    `images(projectId: ${JSON.stringify(projectId)}, nextPageToken:${JSON.stringify(nextPageToken)})` :
                    `images(projectId: ${JSON.stringify(projectId)})`;
                return $http({
                    method: 'POST',
                    url: baseUrl,
                    data: { query: "query { " + invocation + "{ nextPageToken entries { projectId imageId imageURL } } }" }
                });
            }
        };
    });
