'use strict';

module.exports = function (app, dbClient) {
  
  app.route('/api/threads/:board');
    
  app.route('/api/replies/:board');

};
