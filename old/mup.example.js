
module.exports = {
    
    servers: {
      one: {
        host: 'HOST',
        username: 'USERNAME',
        password: 'PASSWORD'
      }
    },
  
    app: {
      name: 'faucet',
      path: './',
    
      servers: {
        one: {},
      },
  
      buildOptions: {
        serverOnly: true,
      },
  
      env: {
        ROOT_URL: 'https://DOMAIN',
        MONGO_URL: 'mongodb://localhost/meteor',
      },
      
      ssl: {
        autogenerate: {
          email: 'EMAIL',
          domains: 'DOMAIN'
        }
      },
      
      docker: {
        // change to 'abernix/meteord:base' if your app is using Meteor 1.4 - 1.5
        image: 'abernix/meteord:node-8.4.0-base',
      },
  
      // Show progress bar while uploading bundle to server
      // You might need to disable it on CI servers
      enableUploadProgressBar: true
    },
  
    mongo: {
      version: '3.4.1',
      servers: {
        one: {}
      }
    }
};
