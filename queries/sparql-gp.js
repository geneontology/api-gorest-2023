var separator = require("../config").separator;

module.exports = {

    /**
     * Retrieve all models and describe their Gene Products
     */
    getAllGPsModels() {
        var encoded = encodeURIComponent(`
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> 
        PREFIX owl: <http://www.w3.org/2002/07/owl#>
        PREFIX metago: <http://model.geneontology.org/>
        
        PREFIX enabled_by: <http://purl.obolibrary.org/obo/RO_0002333>
        PREFIX in_taxon: <http://purl.obolibrary.org/obo/RO_0002162>
        
        SELECT ?identifier	(GROUP_CONCAT(distinct ?gocam;separator=",") as ?gocams)
        
        WHERE 
        {
        
          GRAPH ?gocam {
            ?gocam metago:graphType metago:noctuaCam .    
            ?s enabled_by: ?gpnode .    
            ?gpnode rdf:type ?identifier .
            FILTER(?identifier != owl:NamedIndividual) .         
          }
          
        }
        GROUP BY ?identifier        
        `);
        return "?query=" + encoded;
    },

    /**
     * Retrieve all models for a given Gene Product
     * @param {*} id Gene Product IRI (e.g. http://identifiers.org/zfin/ZDB-GENE-000403-1)
     */
    getGPModels(id) {
        var encoded = encodeURIComponent(`
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#> 
        PREFIX metago: <http://model.geneontology.org/>
        PREFIX dc: <http://purl.org/dc/elements/1.1/>
        PREFIX enabled_by: <http://purl.obolibrary.org/obo/RO_0002333>
        
        SELECT distinct ?gocam ?title
        
        WHERE 
        {
        
          GRAPH ?gocam {
            ?gocam metago:graphType metago:noctuaCam .    
            ?s enabled_by: ?gpnode .    
            ?gpnode rdf:type ?identifier .
            ?gocam dc:title ?title .   
            FILTER(?identifier = <` + id + `>) .            
          }
        
        }
        ORDER BY ?gocam
        `);
        return "?query=" + encoded;
    },

    getGPModelsWith2CausalMFs(id) {
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
      PREFIX enabled_by: <http://purl.obolibrary.org/obo/RO_0002333>
      PREFIX hint: <http://www.bigdata.com/queryHints#>
      SELECT DISTINCT ?gocam ?title
      WHERE {
        GRAPH ?gocam  {  
          # Inject gene product ID here
          ?gene rdf:type <` + id + `> .
        }
        FILTER EXISTS {
          ?gocam metago:graphType metago:noctuaCam .
        }
        ?gocam dc:title ?title .
        FILTER (
          EXISTS {  
            GRAPH ?gocam  {      ?ind1 enabled_by: ?gene . }
            GRAPH ?gocam { ?ind1 ?causal1 ?ind2 } 
            ?causal1 rdfs:subPropertyOf* causally_upstream_of_or_within: .
            ?ind1 causally_upstream_of_or_within: ?ind2 . 
            GRAPH ?gocam  {       ?ind2 enabled_by: ?gpnode2 . }
            GRAPH ?gocam { ?ind2 ?causal2 ?ind3 }
            ?causal2 rdfs:subPropertyOf* causally_upstream_of_or_within: .
            ?ind2 causally_upstream_of_or_within: ?ind3 . 
            GRAPH ?gocam  {       ?ind3 enabled_by: ?gpnode3 . }
            FILTER(?gene != ?gpnode2) 
            FILTER(?gene != ?gpnode3) 
            FILTER(?gpnode2 != ?gpnode3)
          } ||  
          EXISTS {          
            GRAPH ?gocam  {       ?ind1 enabled_by: ?gpnode1 . }
            GRAPH ?gocam { ?ind1 ?causal1 ?ind2 } 
            ?causal1 rdfs:subPropertyOf* causally_upstream_of_or_within: .
            ?ind1 causally_upstream_of_or_within: ?ind2 . 
            GRAPH ?gocam  {          ?ind2 enabled_by: ?gene . }
            GRAPH ?gocam { ?ind2 ?causal2 ?ind3 }
            ?causal2 rdfs:subPropertyOf* causally_upstream_of_or_within: .
            ?ind2 causally_upstream_of_or_within: ?ind3 . 
            GRAPH ?gocam  {           ?ind3 enabled_by: ?gpnode3 . }
            FILTER(?gpnode1 != ?gene) 
            FILTER(?gpnode1 != ?gpnode3) 
            FILTER(?gene != ?gpnode3)
          } ||
          EXISTS {
            GRAPH ?gocam  {       ?ind1 enabled_by: ?gpnode1 . }
            GRAPH ?gocam { ?ind1 ?causal1 ?ind2 } 
            ?causal1 rdfs:subPropertyOf* causally_upstream_of_or_within: .
            ?ind1 causally_upstream_of_or_within: ?ind2 . 
            GRAPH ?gocam  {           ?ind2 enabled_by: ?gpnode2 . }
            GRAPH ?gocam { ?ind2 ?causal2 ?ind3 }
            ?causal2 rdfs:subPropertyOf* causally_upstream_of_or_within: .
            ?ind2 causally_upstream_of_or_within: ?ind3 . 
            GRAPH ?gocam  {         ?ind3 enabled_by: ?gene . }
            FILTER(?gpnode1 != ?gpnode2) 
            FILTER(?gpnode1 != ?gene) 
            FILTER(?gpnode2 != ?gene)
          }
        )
      }
      ORDER BY ?gocam
      `);
      return "?query=" + encoded;
    }


}
