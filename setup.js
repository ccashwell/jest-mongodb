const fs = require('fs');
const {resolve, join} = require('path');
const cwd = require('cwd');
const { MongoMemoryServer, MongoMemoryReplSet } = require('mongodb-memory-server');

const globalConfigPath = join(__dirname, 'globalConfig.json');
const debug = require('debug')('jest-mongodb:setup');

module.exports = async () => {
  const opts = getMongodbMemoryOptions()
  let mongod;
  
  if (opts.replSet) {
    mongod = new MongoMemoryReplSet({
      ...opts,
      replSet: { storageEngine: 'wiredTiger' },
      instanceOpts: opts.instance,
    });
    await mongod.waitUntilRunning();
  } else {
    mongod = new MongoMemoryServer(getMongodbMemoryOptions());
    if (!mongod.isRunning) {
      await mongod.start();
    }
  }

  const mongoConfig = {
    mongoDBName: getMongodbMemoryOptions().instance.dbName,
    mongoUri: await mongod.getUri()
  };

  // Write global config to disk because all tests run in different contexts.
  fs.writeFileSync(globalConfigPath, JSON.stringify(mongoConfig));
  debug('Config is written');

  // Set reference to mongod in order to close the server during teardown.
  global.__MONGOD__ = mongod;
  process.env.MONGO_URL = mongoConfig.mongoUri;
};

function getMongodbMemoryOptions() {
  try {
    const {mongodbMemoryServerOptions} = require(resolve(cwd(), 'jest-mongodb-config.js'));

    return mongodbMemoryServerOptions;
  } catch (e) {
    return {
      instance: {
        dbName: 'jest',
      },
      binary: {
        skipMD5: true
      },
      autoStart: false
    };
  }
}
