const express = require('express'),
    app = express();

const sparqlModels = require('./queries/sparql-models'),
    sparqlGPs = require('./queries/sparql-gp'),
    sparqlGOs = require('./queries/sparql-go'),
    sparqlPMIDs = require('./queries/sparql-pmids'),
    sparqlGroups = require('./queries/sparql-groups'),
    sparqlUsers = require('./queries/sparql-users'),
    sparqlSpecies = require('./queries/sparql-species');

const dbxrefs = require('@geneontology/dbxrefs');
const utils = require('./utils');
const GraphHandler = require('./graphHandler');
const noctua_graph = require('bbop-graph-noctua').graph;

// const minerva_manager = require('lpadev-bbop-manager-minerva'),
//     noctua_graph = require('bbop-graph-noctua').graph,
//     sync_engine = require('bbop-rest-manager').sync_request;
// //     barista_response = require('bbop-response-barista');

// const barista_response = require('./response');


dbxrefs.init()
.then(() => {
  console.log("dbxrefs ready");  
});



/**
 * Initiate the BBOP communication layer with barista, to proxy it through this https endpoint
 * Note: this is a bad (and hopefully temporary solution) as barista is not https and I see no progress on that part.
 */
function initBBOP() {
  let minervaDefinitions = {
    prod: "minerva_public",
    dev: "minerva_public_dev"
  };

  let barista = {
    prod: "http://barista.berkeleybop.org",
    dev: "http://barista-dev.berkeleybop.org"
  };

  let global_barista_location = barista["prod"];
  let global_minerva_definition_name = minervaDefinitions["prod"];
  let user_token = "";

  let engine = new sync_engine(barista_response);
  engine.method('POST');
  let bmanager = new minerva_manager(global_barista_location, global_minerva_definition_name, user_token, engine, "async");  
  return bmanager;
};




// ================================================================================
//
//                           ROUTES: /models
//
// ================================================================================


keysArrayModels = ["orcids", "names", "groupids", "groupnames"];
app.get('/models', function(req, res) {
  // send a range of models (start, start + size)
  if(req.query.start && req.query.size) {
    utils.fetchAndSend(res, sparqlModels.ModelList(req.query.start, req.query.size), false, keysArrayModels);
  // send the <last> models
  } else if(req.query.last) {
    utils.fetchAndSend(res, sparqlModels.ModelList(0, req.query.last), false, keysArrayModels);
  // send the <group> models
  } else if(req.query.group) {
    utils.fetchAndSend(res, sparqlGroups.GroupModelList(req.query.group), false, keysArrayModels);
  // send the <user> models
  } else if(req.query.user) {
    utils.fetchAndSend(res, sparqlUsers.UserModelList(req.query.user), false, keysArrayModels);
  // send the <pmid> models
  } else if(req.query.pmid) {
    utils.fetchAndSend(res, sparqlPMIDs.PMIDModelList(req.query.pmid), false, keysArrayModels);
  // // send the models with at least 2 causal MF-MFs (recent addition, code below would have to be clean and merge with new API)
  } else if(req.query.causalmf) {
    utils.fetchAndSend(res, sparqlModels.ModelsWith2CausalMFs(req.query.causalmf), false, keysArrayModels);

    // send all models
  } else {
    utils.fetchAndSend(res, sparqlModels.ModelList(), false, keysArrayModels);
  }
});

// Must combine the results per gocam
keysArrayGOs = ["goclasses", "goids", "gonames", "definitions"]
app.get('/models/go', function(req, res) {
  let gocams = req.query.gocams;
  if(gocams) {
    gocams = utils.splitTrim(gocams, ",", "<http://model.geneontology.org/", ">");
    utils.fetchData(sparqlModels.ModelsGOs(gocams), keysArrayGOs, (error, data) => {
      utils.addCORS(res);
      res.send(utils.mergeResults(data, "gocam"));
    });
  } else {
    utils.fetchData(sparqlModels.AllModelsGOs(gocams), keysArrayGOs, (error, data) => {
      utils.addCORS(res);
      res.send(utils.mergeResults(data, "gocam"));
    });
  }
});

keysArrayGPs = ["gpnames", "gpids"]
app.get('/models/gp', function(req, res) {
  let gocams = req.query.gocams;
  if(gocams) {
    gocams = utils.splitTrim(gocams, ",", "<http://model.geneontology.org/", ">");
    utils.fetchAndSend(res, sparqlModels.ModelsGPs(gocams), false, keysArrayGPs);
  } else {
    utils.fetchAndSend(res, sparqlModels.AllModelsGPs(), false, keysArrayGPs);
  }
});

keysArrayPMIDs = ["sources"]
app.get('/models/pmid', function(req, res) {
  let gocams = req.query.gocams;
  if(gocams) {
    gocams = utils.splitTrim(gocams, ",", "<http://model.geneontology.org/", ">");
    utils.fetchAndSend(res, sparqlModels.ModelsPMIDs(gocams), false, keysArrayPMIDs);
  } else {
    utils.fetchAndSend(res, sparqlModels.AllModelsPMIDs(), false, keysArrayPMIDs);
  }
});

// must be place at the end (route priority)
app.get('/models/:id', function(req, res) {
  utils.fetchAndSend(res, sparqlModels.Model(req.params.id), false);
});





app.get('/taxon/:taxon/models', function(req, res) {
  utils.fetchAndSend(res, sparqlSpecies.getSpeciesModels(req.params.taxon), false);
});


// ================================================================================
//
//                           ROUTES: /users
//
// ================================================================================

keysArrayUsers = ["organizations", "affiliations"];
app.get('/users', function(req, res) {
  utils.fetchAndSend(res, sparqlUsers.UserList(), false, keysArrayUsers);
});

keysArrayUser = ["organizations", "affiliations", "affiliationsIRI", "gocams", "gocamsDate", "gocamsTitle", "gpnames", "gpids", "bpnames", "bpids"];
app.get('/users/:orcid', function(req, res) {
  utils.fetchAndSend(res, sparqlUsers.UserMeta(req.params.orcid), true, keysArrayUser);
});

keysArrayUserModels = ["bpids", "bpnames", "gpids", "gpnames"];
app.get('/users/:orcid/models', function(req, res) {
  utils.fetchAndSend(res, sparqlUsers.UserModels(req.params.orcid), false, keysArrayUserModels);
});

keysArrayUserGPs = ["gocams", "dates", "titles"];
app.get('/users/:orcid/gp', function(req, res) {
  utils.fetchAndSend(res, sparqlUsers.UserGPs(req.params.orcid), false, keysArrayUserGPs);
});






// ================================================================================
//
//                           ROUTES: /groups
//
// ================================================================================

app.get('/groups', function(req, res) {  
  utils.fetchAndSend(res, sparqlGroups.GroupList());
});

// keysArrayGroups = ["membersOrcid", "membersName", "modelsList", "titlesList"]
// app.get('/groups/details', function(req, res) {
//   utils.fetchAndSend(res, sparqlGroups.GroupListDetails(), false, keysArrayGroups);
// });

app.get('/groups/:name', function(req, res) {
  utils.fetchAndSend(res, sparqlGroups.GroupMeta(req.params.name));
});






// ================================================================================
//
//                           ROUTES: /go
//
// ================================================================================

keysArrayGO = ["synonyms", "relatedSynonyms", "alternativeIds", "xrefs", "subsets"]
app.get('/go/:id', function(req, res) {
  utils.fetchAndSend(res, sparqlGOs.getSummary(req.params.id), true, keysArrayGO);
});

app.get('/go/:id/models', function(req, res) {
  utils.fetchAndSend(res, sparqlGOs.getGOModels(req.params.id));
});

app.get('/go/:id/hierarchy', function(req, res) {
  utils.fetchAndSend(res, sparqlGOs.getHierarchy(req.params.id));
});




app.get('/association/between/:subject/:object', function(req, res) {
  if(req.query.relation == "shared") {
    utils.golrSharedClass(res, req.params.subject, req.params.object);
  } else if(req.query.relation = "closest") {
    utils.golrClosestCommonClass(res, req.params.subject, req.params.object);    
  } else {
    utils.golrAssociation(res, req.params.subject, req.params.object, req.query.relation);
  }
});



// ================================================================================
//
//                           ROUTES: /gp
//
// ================================================================================

app.get('/gp/:id/models', function(req, res) {
  if(req.query.causalmf) {
    utils.fetchAndSend(res, sparqlGPs.getGPModelsWith2CausalMFs(req.params.id));
  } else {
    utils.fetchAndSend(res, sparqlGPs.getGPModels(req.params.id));
  }
});






// ================================================================================
//
//                           ROUTES: /pmid
//
// ================================================================================

app.get('/pmid/:id/models', function(req, res) {
  utils.fetchAndSend(res, sparqlPMIDs.getPMIDModels(req.params.id));
});





// ================================================================================
//
//                           ROUTES: /noctua
//                           (Temporary route to proxy barista while not https)
//
// ================================================================================

app.get('/gocam/:id/raw', function(req, res) {
  let id = req.params.id;
  let idtrim = id.replace("gomodel:", "");

  console.log("Asking for RAW model: ", id);

  let url = "http://barista.berkeleybop.org/api/minerva_public/m3Batch?token=&intention=query&requests=%5B%7B%22entity%22%3A%22model%22%2C%22operation%22%3A%22get%22%2C%22arguments%22%3A%7B%22model-id%22%3A%22gomodel%3A" + idtrim + "%22%7D%7D%5D";
  console.log(url);
  utils.getData(url)
  .then(data => {
    return data.json();
  })
  .then(data => {
    data = data["data"];
    utils.addCORS(res);
    res.json(data);  
  })
});

app.get('/gocam/:id/activities', function(req, res) {
  let id = req.params.id;
  let idtrim = id.replace("gomodel:", "");

  console.log("Asking for ACTIVITIES model: ", id);

  let url = "http://barista.berkeleybop.org/api/minerva_public/m3Batch?token=&intention=query&requests=%5B%7B%22entity%22%3A%22model%22%2C%22operation%22%3A%22get%22%2C%22arguments%22%3A%7B%22model-id%22%3A%22gomodel%3A" + idtrim + "%22%7D%7D%5D";
  console.log(url);
  utils.getData(url)
  .then(data => {
    return data.json();
  })
  .then(data => {
    data = data["data"];

    let graph = new noctua_graph();
    graph.load_data_basic(data);

    // Prepare graph
    graph.unfold();
    graph.fold_go_noctua(this.relations_collapsible)

    let ghandler = new GraphHandler(graph);
    ghandler.setDBXrefs(dbxrefs);

    let activities = ghandler.getAllActivities();
    utils.addCORS(res);
    res.json(activities);
  });
});


app.get('/gocam/:id/enriched', function(req, res) {
  let id = req.params.id;
  let idtrim = id.replace("gomodel:", "");

  console.log("Asking for ENRICHED model: ", id);

  let url = "http://barista.berkeleybop.org/api/minerva_public/m3Batch?token=&intention=query&requests=%5B%7B%22entity%22%3A%22model%22%2C%22operation%22%3A%22get%22%2C%22arguments%22%3A%7B%22model-id%22%3A%22gomodel%3A" + idtrim + "%22%7D%7D%5D";
  console.log(url);
  utils.getData(url)
  .then(data => {
    return data.json();
  })
  .then(data => {
    data = data["data"];

    let graph = new noctua_graph();
    graph.load_data_basic(data);

    // Prepare graph
    graph.unfold();
    graph.fold_go_noctua(this.relations_collapsible)

    let ghandler = new GraphHandler(graph);
    ghandler.setDBXrefs(dbxrefs);

    let activities = ghandler.getAllActivities();
    ghandler.enrichActivities(activities)
    .then(enrichedGraph => {
      // console.log("ENRICHED: ", data);
        utils.addCORS(res);
        res.json(enrichedGraph);
    });    

  });
});


// VERSION BELOW IS USING THE BBOP COMMUNICATION LIBRARIES WHICH ESSENTIALLY DOESN T SERVE ANY PURPOSE
// AND SLOW DOWN THE QUERIES.. LEAVING IT HERE WHILE TESTING DIRECT HTTP REQUESTS

// app.get('/gocam/:id/graw', function(req, res) {
//   let id = req.params.id;
//   let idtrim = id.replace("gomodel:", "");

//   console.log("Asking for RAW model: ", id);

//   let bmanager = initBBOP();
//   bmanager.register('rebuild', (resp, man) => {
//     utils.addCORS(res);
//     res.json(resp.data());
//   });

//   let model = bmanager.get_model(id);  
// });


// app.get('/gocam/:id/enriched', function(req, res) {
//   let id = req.params.id;

//   console.log("Asking for ENRICHED model: ", id);

//   let bmanager = initBBOP();
//   bmanager.register('rebuild', (resp, man) => {
//     let graph = new noctua_graph();
//     graph.load_data_basic(resp.data());

//     // Prepare graph
//     graph.unfold();
//     graph.fold_go_noctua(this.relations_collapsible)

//     let ghandler = new GraphHandler(graph);
//     ghandler.setDBXrefs(dbxrefs);

//     let activities = ghandler.getAllActivities();
//     ghandler.enrichActivities(activities)
//     .then(enrichedGraph => {
//       // console.log("ENRICHED: ", data);
//         utils.addCORS(res);
//         res.json(enrichedGraph);
//     });

//   });

//   let model = bmanager.get_model(id);  

// });




// Export your Express configuration so that it can be consumed by the Lambda handler
module.exports = app

// Uncomment if want to perform local test
// var port = 8888;
// app.listen(port, () => {
//   console.log(`Example app listening at http://localhost:${port}`)
// })