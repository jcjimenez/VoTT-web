const async = require('async');
const azureStorage = require('azure-storage');
const uuid = require('uuid/v4');

const storageFoundation = require('../foundation/storage');

function AccessRightsService(tableService) {
    this.tableService = tableService;

    this.userTableName = 'Users';
    this.accessRightsByProjectTableName = 'AccessRightsByProject';
    this.ensureTablesExist();
}

AccessRightsService.prototype.ensureTablesExist = function () {
    return new Promise((resolve, reject) => {
        async.series(
            [
                (callback) => { this.tableService.createTableIfNotExists(this.userTableName, callback); },
                (callback) => { this.tableService.createTableIfNotExists(this.accessRightsByProjectTableName, callback); }
            ],
            (error, results) => {
                if (error) return reject(error);
                resolve(results);
            }
        );
    });
}

AccessRightsService.prototype.list = function (projectId) {
    return new Promise((resolve, reject) => {
        const tableQuery = new azureStorage.TableQuery().where('PartitionKey == ?', projectId);
        this.tableService.queryEntities(this.accessRightsByProjectTableName, tableQuery, null, (error, result) => {
            if (error) {
                return reject(error);
            }
            return resolve(result.entries.map(entity => {
                return this.mapEntityToAccessRight(entity);
            }));
        });
    });
}

AccessRightsService.prototype.create = function (record) {
    return new Promise((resolve, reject) => {
        const entityByProject = mapAccessRightToEntity(record);
        this.tableService.insertEntity(this.accessRightsByProjectTableName, entityByProject, (error, result, response) => {
            if (error) {
                return reject(error);
            }
            return resolve(record);
        });
    });
}

AccessRightsService.prototype.read = function (projectId, userId) {
    return new Promise((resolve, reject) => {
        if (!projectId) {
            projectId = 'root';
        }
        this.tableService.retrieveEntity(this.accessRightsByProjectTableName, projectId, userId, (error, entity) => {
            if (error) {
                return reject(error);
            }
            return resolve(this.mapEntityToAccessRight(entity));
        });
    });
}

AccessRightsService.prototype.upsertUser = function (user) {
    return new Promise((resolve, reject) => {
        const entity = mapUserToEntity(user);
        this.tableService.insertEntity(this.userTableName, entity, (error, result, response) => {
            if (error) {
                return reject(error);
            }
            return resolve(user);
        });
    });
}

AccessRightsService.prototype.delete = function (projectId, userId) {
    return new Promise((resolve, reject) => {
        const generator = azureStorage.TableUtilities.entityGenerator;
        const entity = {
            PartitionKey: generator.String(projectId),
            RowKey: generator.String(userId)
        };
        this.tableService.deleteEntity(this.accessRightsByProjectTableName, entity, (error, result, response) => {
            if (error) {
                return reject(error);
            }
            return resolve();
        });
    });
}

AccessRightsService.prototype.mapEntityToAccessRight = function (rightEntity) {
    const userId = rightEntity.RowKey._;
    const projectId = rightEntity.PartitionKey._;
    return {
        id: userId,
        projectId: projectId,
        role: rightEntity.role._,
        user: {
            userId: userId,
            name: (rightEntity.name) ? rightEntity.name._ : null,
            email: rightEntity.email._
        }
    };
}

function mapAccessRightToEntity(right) {
    const generator = azureStorage.TableUtilities.entityGenerator;
    return {
        PartitionKey: generator.String(right.projectId),
        RowKey: generator.String(right.userId),
        email: generator.String(right.email),
        role: generator.String(right.role)
    };
}

/**
 * Github replies with something like:
 * {
 *   "id":"1117904",
 *   "displayName":"Juan Carlos Jimenez",
 *   "username":"jcjimenez",
 *   "provider":"github",
 *   ...
 * }
 * @param {*} user representing Github user interpreted by passport.
 */
function mapUserToEntity(user) {
    const generator = azureStorage.TableUtilities.entityGenerator;
    return {
        PartitionKey: generator.String(user.provider),
        RowKey: generator.String(user.username),
        name: generator.String(user.displayName)
    };
}

function mapEntityToUser(user) {
    return {
        provider: rightEntity.RowKey._,
        username: rightEntity.PartitionKey._,
        displayName: rightEntity.displayName._
    };
}

module.exports = AccessRightsService;