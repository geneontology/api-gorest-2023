var separator = require("../config").separator;

var utils = require('../utils');

module.exports = {

    ModelList(start, size) {
        var query = `
        PREFIX metago: <http://model.geneontology.org/>
        PREFIX dc: <http://purl.org/dc/elements/1.1/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> 
    	PREFIX obo: <http://www.geneontology.org/formats/oboInOwl#>
        PREFIX providedBy: <http://purl.org/pav/providedBy>
  
        SELECT  ?gocam ?date ?title (GROUP_CONCAT(distinct ?orcid;separator="` + separator + `") AS ?orcids) 
                                    (GROUP_CONCAT(distinct ?name;separator="` + separator + `") AS ?names)
							        (GROUP_CONCAT(distinct ?providedBy;separator="` + separator + `") AS ?groupids) 
							        (GROUP_CONCAT(distinct ?providedByLabel;separator="` + separator + `") AS ?groupnames) 
        
        WHERE 
        {
  	    	{
              	GRAPH ?gocam {            
	                ?gocam metago:graphType metago:noctuaCam .
              
            	    ?gocam dc:title ?title ;
        	             dc:date ?date ;
            	         dc:contributor ?orcid ;
    		    		 providedBy: ?providedBy .
    
    	            BIND( IRI(?orcid) AS ?orcidIRI ).
	                BIND( IRI(?providedBy) AS ?providedByIRI ).
                }
         
          		optional {
        		  	?providedByIRI rdfs:label ?providedByLabel .
  		        }
  
                optional { ?orcidIRI rdfs:label ?name }
        	  	BIND(IF(bound(?name), ?name, ?orcid) as ?name) .
            }   
  
        }
        GROUP BY ?gocam ?date ?title 
        ORDER BY DESC(?date)
        `;
        if(size) {
            query += "\nLIMIT " + size
        }
        if(start) {
            query += "\nOFFSET " + start
        }
        return "?query=" + encodeURIComponent(query);
    },

    Model(id) {
        var encoded = encodeURIComponent(`
        PREFIX metago: <http://model.geneontology.org/>
    
        SELECT ?subject ?predicate ?object
        WHERE 
        {     
            GRAPH metago:` + id + ` {
                ?subject ?predicate ?object
            }      
        }
        `);
        return "?query=" + encoded;
    },


    ModelsGOs(gocams) {
        // Transform the array in string
        console.log("ModelsGOs(" + gocams + "): ", gocams.reduce(utils.concat));
        var models = gocams.reduce(utils.concat);
        var encoded = encodeURIComponent(`
    	PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX metago: <http://model.geneontology.org/>
    	PREFIX owl: <http://www.w3.org/2002/07/owl#>
        PREFIX definition: <http://purl.obolibrary.org/obo/IAO_0000115>
        PREFIX BP: <http://purl.obolibrary.org/obo/GO_0008150>
        PREFIX MF: <http://purl.obolibrary.org/obo/GO_0003674>
        PREFIX CC: <http://purl.obolibrary.org/obo/GO_0005575>

		SELECT distinct ?gocam ?goclasses ?goids ?gonames ?definitions
        WHERE 
        {
		    VALUES ?gocam { ` + models + `}
#		    VALUES ?gocam { <http://model.geneontology.org/5a7e68a100001298> <http://model.geneontology.org/5a7e68a100001201> <http://model.geneontology.org/5a7e68a100001125> <http://model.geneontology.org/5a7e68a100000655>}
  
  		    GRAPH ?gocam {
                ?entity rdf:type owl:NamedIndividual .
    			?entity rdf:type ?goids
            }
  
            VALUES ?goclasses { BP: MF: CC:  } . 
  			?goids rdfs:subClassOf+ ?goclasses .
    		?goids rdfs:label ?gonames .
  		    ?goids definition: ?definitions .
        }
		ORDER BY DESC(?gocam)
        `);
        return "?query=" + encoded;
    },


    ModelsBPs(gocams) {
        // Transform the array in string
        var models = gocams.reduce(utils.concat);
        var encoded = encodeURIComponent(`
    	PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX metago: <http://model.geneontology.org/>
	    PREFIX owl: <http://www.w3.org/2002/07/owl#>
        
        PREFIX definition: <http://purl.obolibrary.org/obo/IAO_0000115>
        PREFIX BP: <http://purl.obolibrary.org/obo/GO_0008150>
        PREFIX MF: <http://purl.obolibrary.org/obo/GO_0003674>
        PREFIX CC: <http://purl.obolibrary.org/obo/GO_0005575>

        SELECT  ?gocam  (GROUP_CONCAT(?GO;separator="` + separator + `") as ?bpIDs) 
		        		(GROUP_CONCAT(?label;separator="` + separator + `") as ?bpNames)
				        (GROUP_CONCAT(?definition;separator="` + separator + `") as ?definitions)
        WHERE 
        {
  		    VALUES ?gocam { ` + models + ` }
  
            VALUES ?GO_classes { BP: MF: CC:  } .
   		    {
     		    SELECT * WHERE { ?GO_classes rdfs:label ?GO_class . }
 		    }

  		    GRAPH ?gocam {
                ?GO rdf:type owl:Class .
            }
            ?GO rdfs:subClassOf+ ?GO_classes .
  		    ?GO rdfs:label ?label .
  		    ?GO definition: ?definition
  
		    {
    		    SELECT * where {
    	  	  		filter(?GO_classes = BP:) .
	    	    }
  		    }
        }
        GROUP BY ?gocam
        `);
        return "?query=" + encoded;
    },    

    ModelsGPs(gocams) {
        // Transform the array in string
        var models = gocams.reduce(utils.concat);
        var encoded = encodeURIComponent(`
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> 
        PREFIX owl: <http://www.w3.org/2002/07/owl#>
        PREFIX metago: <http://model.geneontology.org/>

        PREFIX enabled_by: <http://purl.obolibrary.org/obo/RO_0002333>
        PREFIX in_taxon: <http://purl.obolibrary.org/obo/RO_0002162>

        SELECT ?gocam   (GROUP_CONCAT(distinct ?identifier;separator="` + separator + `") as ?gpids)
        				(GROUP_CONCAT(distinct ?name;separator="` + separator + `") as ?gpnames)

        WHERE 
        {
        #   VALUES ?gocam { <http://model.geneontology.org/5a7e68a100001298> <http://model.geneontology.org/5a7e68a100001201> <http://model.geneontology.org/5a7e68a100001125> <http://model.geneontology.org/5a7e68a100000655> <http://model.geneontology.org/586fc17a00000705> }
            VALUES ?gocam { ` + models + ` }
  
            GRAPH ?gocam {
                ?s enabled_by: ?gpnode .    
                ?gpnode rdf:type ?identifier .
                FILTER(?identifier != owl:NamedIndividual) .         
            }
            optional {
                GRAPH <http://purl.obolibrary.org/obo/go/extensions/go-graphstore.owl> {
            	    ?identifier rdfs:label ?name
                }
            }
        }
        GROUP BY ?gocam
        `);
        return "?query=" + encoded;
    },


    ModelsPMIDs(gocams) {
        var models = gocams.reduce(utils.concat);
        var encoded = encodeURIComponent(`
        PREFIX metago: <http://model.geneontology.org/>
        PREFIX dc: <http://purl.org/dc/elements/1.1/>
  
        SELECT  distinct ?gocam (GROUP_CONCAT(distinct ?source; separator="` + separator + `") as ?sources)              
        WHERE 
        {    
            values ?gocam { ` + models + ` }

            GRAPH ?gocam {
                ?s dc:source ?source .
                BIND(REPLACE(?source, " ", "") AS ?source) .
                FILTER((CONTAINS(?source, "PMID")))
            }           
        }
        GROUP BY ?gocam
        `);
        return "?query=" + encoded;
    },









    AllModelsGOs() {
        // Transform the array in string
        var encoded = encodeURIComponent(`
    	PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX metago: <http://model.geneontology.org/>
    	PREFIX owl: <http://www.w3.org/2002/07/owl#>
        
        PREFIX definition: <http://purl.obolibrary.org/obo/IAO_0000115>
        PREFIX BP: <http://purl.obolibrary.org/obo/GO_0008150>
        PREFIX MF: <http://purl.obolibrary.org/obo/GO_0003674>
        PREFIX CC: <http://purl.obolibrary.org/obo/GO_0005575>

		SELECT distinct ?gocam ?goclasses ?goids ?gonames ?definitions
        WHERE 
        {
  
  		    GRAPH ?gocam {
    			?gocam metago:graphType metago:noctuaCam  .
                ?entity rdf:type owl:NamedIndividual .
    			?entity rdf:type ?goids
            }
  
            VALUES ?goclasses { BP: MF: CC:  } . 
            # rdf:type faster then subClassOf+ but require filter 			
            # ?goids rdfs:subClassOf+ ?goclasses .
    		?entity rdf:type ?goclasses .
  			
  			# Filtering out the root BP, MF & CC terms
			filter(?goids != MF: )
  			filter(?goids != BP: )
		  	filter(?goids != CC: )
  
  			# then getting their definitions
    		?goids rdfs:label ?gonames .
  		    ?goids definition: ?definitions .
        }
		ORDER BY DESC(?gocam)
        `);
        return "?query=" + encoded;
    },


    AllModelsGPs() {
        // Transform the array in string
        var encoded = encodeURIComponent(`
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> 
        PREFIX owl: <http://www.w3.org/2002/07/owl#>
        PREFIX metago: <http://model.geneontology.org/>

        PREFIX enabled_by: <http://purl.obolibrary.org/obo/RO_0002333>
        PREFIX in_taxon: <http://purl.obolibrary.org/obo/RO_0002162>

        SELECT ?gocam   (GROUP_CONCAT(distinct ?identifier;separator="` + separator + `") as ?gpids)
			        	(GROUP_CONCAT(distinct ?name;separator="` + separator + `") as ?gpnames)

        WHERE 
        {
            GRAPH ?gocam {
                ?gocam metago:graphType metago:noctuaCam .
                ?s enabled_by: ?gpnode .    
                ?gpnode rdf:type ?identifier .
                FILTER(?identifier != owl:NamedIndividual) .
                FILTER(!contains(str(?gocam), "_inferred"))
            }
            optional {
                ?identifier rdfs:label ?name
            }
            BIND(IF(bound(?name), ?name, ?identifier) as ?name)
        }
        GROUP BY ?gocam
        `);
        return "?query=" + encoded;
    },


    AllModelsPMIDs() {
        var encoded = encodeURIComponent(`
        PREFIX metago: <http://model.geneontology.org/>
        PREFIX dc: <http://purl.org/dc/elements/1.1/>
  
        SELECT  distinct ?gocam (GROUP_CONCAT(distinct ?source; separator="` + separator + `") as ?sources)              
        WHERE 
        {    
            GRAPH ?gocam {
                ?gocam metago:graphType metago:noctuaCam .    	
                ?s dc:source ?source .
                BIND(REPLACE(?source, " ", "") AS ?source) .
                FILTER((CONTAINS(?source, "PMID")))
            }           
        }
        GROUP BY ?gocam
        `);
        return "?query=" + encoded;
    },



    /**
     * Return models with at least MF - causal - MF - causal - MF to ensure the presence of a chain
     * @param {*} causalmf : currently unused but could be used to filter models based on the presence of 1, 2, more causal between MFs
     */
    ModelsWith2CausalMFs(causalmf) {
        var encoded = encodeURIComponent(`
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX pr: <http://purl.org/ontology/prv/core#>
        PREFIX metago: <http://model.geneontology.org/>
        PREFIX dc: <http://purl.org/dc/elements/1.1/>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> 
        PREFIX obo: <http://www.geneontology.org/formats/oboInOwl#>
        PREFIX owl: <http://www.w3.org/2002/07/owl#>
        PREFIX providedBy: <http://purl.org/pav/providedBy>
        
        PREFIX MF: <http://purl.obolibrary.org/obo/GO_0003674>
        
        PREFIX causally_upstream_of_or_within: <http://purl.obolibrary.org/obo/RO_0002418>
        PREFIX causally_upstream_of_or_within_negative_effect: <http://purl.obolibrary.org/obo/RO_0004046>
        PREFIX causally_upstream_of_or_within_positive_effect: <http://purl.obolibrary.org/obo/RO_0004047>
        
        PREFIX causally_upstream_of: <http://purl.obolibrary.org/obo/RO_0002411>
        PREFIX causally_upstream_of_negative_effect: <http://purl.obolibrary.org/obo/RO_0002305>
        PREFIX causally_upstream_of_positive_effect: <http://purl.obolibrary.org/obo/RO_0002304>
        
        PREFIX regulates: <http://purl.obolibrary.org/obo/RO_0002211>
        PREFIX negatively_regulates: <http://purl.obolibrary.org/obo/RO_0002212>
        PREFIX positively_regulates: <http://purl.obolibrary.org/obo/RO_0002213>
        
        PREFIX directly_regulates: <http://purl.obolibrary.org/obo/RO_0002578>
        PREFIX directly_positively_regulates: <http://purl.obolibrary.org/obo/RO_0002629>
        PREFIX directly_negatively_regulates: <http://purl.obolibrary.org/obo/RO_0002630>
        
        PREFIX directly_activates: <http://purl.obolibrary.org/obo/RO_0002406>
        PREFIX indirectly_activates: <http://purl.obolibrary.org/obo/RO_0002407>
        
        PREFIX directly_inhibits: <http://purl.obolibrary.org/obo/RO_0002408>
        PREFIX indirectly_inhibits: <http://purl.obolibrary.org/obo/RO_0002409>
        
        PREFIX transitively_provides_input_for: <http://purl.obolibrary.org/obo/RO_0002414>
        PREFIX immediately_causally_upstream_of: <http://purl.obolibrary.org/obo/RO_0002412>
        PREFIX directly_provides_input_for: <http://purl.obolibrary.org/obo/RO_0002413>
        
        SELECT ?gocam ?date ?title (GROUP_CONCAT(distinct ?orcid;separator="` + separator + `") AS ?orcids) 
                                    (GROUP_CONCAT(distinct ?name;separator="` + separator + `") AS ?names)
                                    (GROUP_CONCAT(distinct ?providedBy;separator="` + separator + `") AS ?groupids) 
                                    (GROUP_CONCAT(distinct ?providedByLabel;separator="` + separator + `") AS ?groupnames)
        
        WHERE 
        {
          ?causal1 rdfs:subPropertyOf* causally_upstream_of_or_within: .
          ?causal2 rdfs:subPropertyOf* causally_upstream_of_or_within: .
          {
            GRAPH ?gocam {                 
              ?gocam metago:graphType metago:noctuaCam .
              ?gocam dc:date ?date .
              ?gocam dc:title ?title .
              ?gocam dc:contributor ?orcid .
              ?gocam providedBy: ?providedBy .
              BIND( IRI(?orcid) AS ?orcidIRI ).
              BIND( IRI(?providedBy) AS ?providedByIRI ).
              ?ind1 ?causal1 ?ind2 .     
              ?ind2 ?causal2 ?ind3
            }         
            ?ind1 rdf:type MF: .
            ?ind2 rdf:type MF: .
            ?ind3 rdf:type MF: .
            optional {
                ?providedByIRI rdfs:label ?providedByLabel .
            }

            optional { ?orcidIRI rdfs:label ?name }
            BIND(IF(bound(?name), ?name, ?orcid) as ?name) .
          }
        }        
        GROUP BY ?gocam ?date ?title 
        ORDER BY ?gocam
        `);        
        return "?query=" + encoded;
    }

}