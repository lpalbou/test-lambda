'use strict';

var fs = require('fs');
var path = require('path');
var request = require("request");

var baseUrl = "http://rdf.geneontology.org/blazegraph/sparql";


var separator = "@!@";

exports.get = function (event, context, callback) {
  var contents = fs.readFileSync(`public${path.sep}index.html`);

  var url = baseUrl + SPARQL_UserList();
  GetJSON(url, transformUserList, callback);

};





function GetJSON(url, transformCallback, resultCallback) {
  var options = {
    uri: url,
    method: 'POST',
    headers: {
      'Content-Type': 'application/sparql-results+json',
      'Accept': 'application/json',
    }
  };

  request(options, function (error, response, body) {
    if (error || response.statusCode != 200) {
      resultCallback(error);
    } else {
      if (transformCallback) {
        transformCallback(JSON.parse(body).results.bindings, resultCallback);
      } else {
        resultCallback(null, {
          isBase64Encoded: false,
          statusCode: 200,
          body: JSON.stringify({ result: JSON.parse(body).results.bindings } )
        });
      }
    }
  });
}
//body: { result: JSON.parse(body).results.bindings }


/* transform the user list json */
function transformUserList(json, resultCallback) {
  var jsmodified = json.map(function (item) {
    return {
      "orcid": item.orcid.value,
      "name": item.name ? item.name.value : "N/A",
      "organizations": item.organizations ? item.organizations.value.split(separator) : "N/A",
      "affiliations": item.affiliations ? item.affiliations.value.split(separator) : "N/A",
      "gocams": item.cams.value
    }
  });

  resultCallback(null, {
    isBase64Encoded: false,
    statusCode: 200,
    body: JSON.stringify({ result: jsmodified })
  });
//  headers: { 'content-type': 'application/json' },

}



function SPARQL_UserList() {
  var encoded = encodeURIComponent(`
  PREFIX metago: <http://model.geneontology.org/>
  PREFIX dc: <http://purl.org/dc/elements/1.1/>
  PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> 
PREFIX has_affiliation: <http://purl.obolibrary.org/obo/ERO_0000066> 

  SELECT  ?orcid ?name    (GROUP_CONCAT(distinct ?organization;separator="` + separator + `") AS ?organizations) 
                          (GROUP_CONCAT(distinct ?affiliation;separator="` + separator + `") AS ?affiliations) 
                          (COUNT(distinct ?cam) AS ?cams)
  WHERE 
  {
      ?cam metago:graphType metago:noctuaCam .
      ?cam dc:contributor ?orcid .
      
      BIND( IRI(?orcid) AS ?orcidIRI ).
      
      optional { ?orcidIRI rdfs:label ?name } .
      optional { ?orcidIRI <http://www.w3.org/2006/vcard/ns#organization-name> ?organization } .
      optional { ?orcidIRI has_affiliation: ?affiliation } .

    BIND(IF(bound(?name), ?name, ?orcid) as ?name) .

  }
  GROUP BY ?orcid ?name 
  `);
  return "?query=" + encoded;
}