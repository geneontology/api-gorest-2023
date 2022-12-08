/**
 * Response handler for dealing with the parsing of responses from
 * Barista (enveloping Minerva).
 *
 * It will detect if the incoming response is structured correctly and
 * give safe access to fields and properties.
 *
 * It is not meant to be a model for the parts in the data section,
 * see the graph sections for that.
 *
 * @module bbop-response-barista
 */

var bbop = require('bbop-core');
var us = require('underscore');
var bbop_rest_response = require('bbop-rest-response').base;

/**
 * Contructor for a Minerva REST JSON response object.
 *
 * The constructor argument is an object or a string.
 *
 * @constructor
 * @param {Object|String} raw - the JSON object as a string or object
 * @returns {response} response object
 */
var response = function(raw){
    bbop_rest_response.call(this);
    this._is_a = 'bbop-response-barista';

    // Required top-level strings in the response.
    // message and message_type are defined in the superclass.
    this._uid = null; // initiating user
    this._packet_id = null; // identify the packet
    this._intention = null; // what the user wanted to do ('query', 'action')
    this._reasoner_p = null; // was the reasoner used?
    this._groups = null; // did groups come over the wire?
    this._signal = null; // 'merge', 'rebuild', 'meta', etc.

    // Optional top-level strings in the response.
    this._commentary = null;

    // Optional top-level objects.
    // Data contains model_id, inconsistency, etc.
    this._data = null;

    // Start with the assumption that the response is bad, try and
    // prove otherwise.
    this.okay(false);

    // Raw will only be provided in that cases that it makes sense.
    this._raw = null;

    // If we have no data coming in, there is a problem...
    if( ! raw ){

	this.message('empty response in handler');
	this.message_type('error');

    }else{

	// If we do have something coming in, And it looks like
	// something we might be able to deal with, do our best to
	// decode it.
	var itsa = bbop.what_is(raw);
	if( itsa !== 'string' && itsa !== 'object' ){

	    // No idea what this thing is...
	    this.message('bad argument type in handler');
	    this.message_type('error');

	}else{

	    // Try to make the string an object.
	    if( itsa === 'string' ){
		try {
		    this._raw = JSON.parse(raw);
		}catch(e){
		    // Didn't make it--chuck it to create a signal.
		    this._raw = null;
		    this.message('handler could not parse string response: ' +
				 raw);
		    this.message_type('error');
		}
	    }else{
		// Looks like somebody else got here first.
		this._raw = raw;
	    }

	    // If we managed to define some kind of raw incoming data
	    // that is (or has been parsed to) a model, start probing
	    // it out to see if it is structured correctly.
	    if( this._raw ){

		// Check required fields.
		var jresp = this._raw;
		// These must always be defined.
		if( ! jresp['message-type'] || ! jresp['message'] ){
		    // Core info.
		    this.message_type('error');
		    this.message('message and message_type must always exist');
		}else{

		    // Take out the individual optional bits for
		    // examination.
		    var cdata = jresp['commentary'] || null;
		    var odata = jresp['data'] || null;

		    // If data, object.
		    if( odata && bbop.what_is(odata) !== 'object' ){
		    // if( odata && bbop.what_is(odata) != 'object' &&
		    // 	bbop.what_is(odata) != 'array' ){
			this.message('data not object');
			this.message_type('error');
		    }else{
			// If commentary, string.
			if( cdata && bbop.what_is(cdata) !== 'string' ){
			    this.message('commentary not string');
			    this.message_type('error');
			}else{
			    // Looks fine then I guess.
			    this.okay(true);

			    // Super-class.
			    this.message_type(jresp['message-type']);
			    this.message(jresp['message']);

			    // Plug in the other required fields.
			    this._uid = jresp['uid'] || 'unknown';
			    this._intention = jresp['intention'] || 'unknown';
			    this._reasoner_p = false;
			    if( typeof(jresp['is-reasoned']) === 'boolean' ){
				this._reasoner_p = jresp['is-reasoned'];
			    }
			    if( us.isArray(jresp['provided-by']) &&
				! us.isEmpty(jresp['provided-by']) ){
				this._groups= jresp['provided-by'];
			    }
			    this._signal = jresp['signal'] || 'unknown';
			    this._packet_id = jresp['packet-id'] || 'unknown';

			    // Add any additional fields.
			    if( cdata ){ this._commentary = cdata; }
			    if( odata ){ this._data = odata; }
			}
		    }
		}
	    }
	}
    }
};
bbop.extend(response, bbop_rest_response);

/**
 * Returns the user id (uid) for a call if it was generated my a known
 * user.
 *
 * @returns {String|null} string or null
 */
response.prototype.user_id = function(){
    var ret = null;
    if( this._uid ){ ret = this._uid; }
    return ret;
};

/**
 * Returns the user intention for a call.
 *
 * @returns {String|null} string or null
 */
response.prototype.intention = function(){
    var ret = null;
    if( this._intention ){ ret = this._intention; }
    return ret;
};

/**
 * Returns whether the reasoner was used or not.
 *
 * @returns {Boolean} if none, then false
 */
response.prototype.reasoner_p = function(){
    var ret = this._reasoner_p;
    return ret;
};

/**
 * Returns whether groups were used (non-null) and what they are (list
 * of strings).
 *
 * @returns {Array|null} group(?) and what they are
 */
response.prototype.groups = function(){
    var ret = this._groups;
    return ret;
};

/**
 * Returns whether groups were used (non-null) and what they are (list
 * of strings).
 *
 * Alias of groups.
 *
 * @returns {Array|null} group(?) and what they are
 */
response.prototype.provided_by = response.prototype.groups;

/**
 * Returns the server's action signal, if there was one.
 *
 * @returns {String|null} string or null
 */
response.prototype.signal = function(){
    var ret = null;
    if( this._signal ){ ret = this._signal; }
    return ret;
};

/**
 * Returns the response's unique id. Usful to make sure you're not
 * talking to yourself in some cases.
 *
 * @returns {String|null} string or null
 */
response.prototype.packet_id = function(){
    var ret = null;
    if( this._packet_id ){ ret = this._packet_id; }
    return ret;
};

/**
 * Returns the commentary object (whatever that might be in any given
 * case).
 *
 * @returns {Object|null} copy of commentary object or null
 */
response.prototype.commentary = function(){
    var ret = null;
    if( this._commentary ){
	ret = bbop.clone(this._commentary);
    }
    return ret;
};

/**
 * Returns the data object (whatever that might be in any given
 * case). This grossly returns all response data, if any.
 *
 * @returns {Object|null} copy of data object or null
 */
response.prototype.data = function(){
    var ret = null;
    if( this._data ){
	ret = bbop.clone(this._data);
    }
    return ret;
};

///
/// From here on out, we're in non-generic barista territory.
/// Minerva from here.
/// Model.
///

/**
 * Returns the model id of the response.
 *
 * @returns {String|null} string or null
 */
response.prototype.model_id = function(){
    var ret = null;
    if( this._data && this._data['id'] ){
	ret = this._data['id'];
    }
    return ret;
};

/**
 * Returns true or false on whether or not the returned model is
 * thought to be inconsistent. Starting assumption is that it is not.
 *
 * @returns {Boolean} true or false
 */
response.prototype.inconsistent_p = function(){
    var ret = false;
    if( this._data &&
	typeof(this._data['inconsistent-p']) !== 'undefined' &&
	this._data['inconsistent-p'] === true ){
	ret = true;
    }
    return ret;
};

/**
 * Returns true or false on whether or not the returned model is
 * thought to have been modified since it's last disk save. Starting
 * assumption is that it has not.
 *
 * @returns {Boolean} true or false
 */
response.prototype.modified_p = function(){
    var ret = false;
    if( this._data &&
	typeof(this._data['modified-p']) !== 'undefined' &&
	this._data['modified-p'] === true ){
	ret = true;
    }
    return ret;
};

/**
 * Returns a true or false depending on the existence an undo list.
 *
 * @returns {Boolean} boolean
 */
response.prototype.has_undo_p = function(){
    var ret = false;
    if( this._data && this._data['undo'] &&
	us.isArray(this._data['undo']) &&
	this._data['undo'].length > 0 ){
	ret = true;
    }
    return ret;
};

/**
 * Returns a true or false depending on the existence a redo list.
 *
 * @returns {Boolean} boolean
 */
response.prototype.has_redo_p = function(){
    var ret = false;
    if( this._data && this._data['redo'] &&
	us.isArray(this._data['redo']) &&
	this._data['redo'].length > 0 ){
	ret = true;
    }
    return ret;
};

/**
 * Returns the undo list.
 *
 * @returns {Array} list of undo IDs.
 */
response.prototype.undo = function(){
    var ret = [];
    if( this._data && this._data['undo'] && us.isArray(this._data['undo']) ){
	ret = this._data['undo'];
    }
    return ret;
};

/**
 * Returns the redo list.
 *
 * @returns {Array} list of redo IDs.
 */
response.prototype.redo = function(){
    var ret = [];
    if( this._data && this._data['redo'] && us.isArray(this._data['redo']) ){
	ret = this._data['redo'];
    }
    return ret;
};

/**
 * Returns a list of the facts in the response. Empty list if none.
 *
 * @returns {Array} list
 */
response.prototype.facts = function(){
    var ret = [];
    if( this._data && this._data['facts'] &&
	us.isArray(this._data['facts']) ){
	ret = this._data['facts'];
    }
    return ret;
};

/**
 * Returns a list of owl data properties, may be used in Monarch, for
 * things like type restrictions. Empty list if none.
 *
 * @returns {Array} list
 */
response.prototype.data_properties = function(){
    var ret = [];
    if( this._data && this._data['data-properties'] &&
	us.isArray(this._data['data-properties']) ){
	ret = this._data['data-properties'];
    }
    return ret;
};

/**
 * Returns a list of relationships (represented like:{ "type":
 * "property", "id": "BFO:0000050", "label": "part of" }) found in the
 * model in the response. Empty list if none.
 *
 * @returns {Array} list
 */
response.prototype.properties = function(){
    var ret = [];
    if( this._data && this._data['properties'] &&
	us.isArray(this._data['properties']) ){
	ret = this._data['properties'];
    }
    return ret;
};

/**
 * Returns the validation object. TBD.
 *
 * @returns {Object|Null} validation - return validation object or null.
 */
response.prototype.validation = function(){
    var ret = null;
    if( this._data && this._data['validation-results'] &&
	us.isObject(this._data['validation-results']) ){
	ret = bbop.clone(this._data['validation-results']);
    }
    return ret;
};

/**
 * Returns boolean on whether the returned model is /completely/
 * valid; true if there is no logic to probe (this is a temporary
 * measure until reasoner is "always on").
 *
 * @returns {Boolean} p - bool
 */
response.prototype.valid_p = function(){
    var ret = true;
    var vres = this.validation();
    if( vres && us.isObject(vres) ){
	// Dig in farther to get conformance.
	if( us.isBoolean(vres['is-conformant']) ){
	    if( vres['is-conformant'] === true ){
		ret = true;
	    }else if( vres['is-conformant'] === false ){
		ret = false;
	    }
	}
    }
    return ret;
};

/**
 * Returns boolean on whether the returned model is valid according to
 * the owl reasoner; true if there is no logic to probe (this is a temporary
 * measure until reasoner is "always on").
 *
 * @returns {Boolean} p - bool
 */
response.prototype.valid_owl_p = function(){
    var ret = true;
    var vres = this.validation();
    if( vres && us.isObject(vres) ){
	// Dig in farther to get conformance.
	if( vres['owl-validation'] && us.isObject(vres['owl-validation']) ){
	    if( vres['owl-validation']['is-conformant'] === true ){
		ret = true;
	    }else if( vres['owl-validation']['is-conformant'] === false ){
		ret = false;
	    }
	}
    }
    return ret;
};

/**
 * Returns boolean on whether the returned model is valid according to
 * ShEx shapes in Minerva; true if there is no logic to probe (this is
 * a temporary measure until reasoner is "always on").
 *
 * @returns {Boolean} p - bool
 */
response.prototype.valid_shex_p = function(){
    var ret = true;
    var vres = this.validation();
    if( vres && us.isObject(vres) ){
	// Dig in farther to get conformance.
	if( vres['shex-validation'] && us.isObject(vres['shex-validation']) ){
	    if( vres['shex-validation']['is-conformant'] === true ){
		ret = true;
	    }else if( vres['shex-validation']['is-conformant'] === false ){
		ret = false;
	    }
	}
    }
    return ret;
};

/**
 * Returns an array of objects that describe the ShEx violations
 * found in a model.
 *
 * @returns {Array} violations or an empty list if none
 */
response.prototype.shex_violations = function(){
    var ret = [];
    var vres = this.validation();
    if( vres && us.isObject(vres) ){
	// Dig in farther to get conformance.
	if( vres['shex-validation'] && us.isObject(vres['shex-validation']) &&
	    us.isArray(vres['shex-validation']['violations']) ){
	    ret = bbop.clone(vres['shex-validation']['violations']);
	}
    }
    return ret;
};

/**
 * Returns a list of the individuals in the response. Empty list if none.
 *
 * @returns {Array} list
 */
response.prototype.individuals = function(){
    var ret = [];
    if( this._data && this._data['individuals'] &&
	us.isArray(this._data['individuals']) ){
	ret = this._data['individuals'];
    }
    return ret;
};

/**
 * Returns a list of the inferred_individuals in the response. Empty
 * list if none.
 *
 * @returns {Array} list
 */
response.prototype.inferred_individuals = function(){
    var ret = [];
    if( this._data && this._data['individuals-i'] &&
	us.isArray(this._data['individuals-i']) ){
	ret = this._data['individuals-i'];
    }
    return ret;
};

/**
 * Returns a list of the (complex) annotations found in the
 * response. Sometimes not there, so check the return.
 *
 * @returns {Array} list
 */
response.prototype.annotations = function(){
    var ret = [];
    if( this._data && this._data['annotations'] &&
	us.isArray(this._data['annotations']) ){
	ret = this._data['annotations'];
    }
    return ret;
};

/**
 * Returns the string of the export found in the return.
 *
 * @returns {String} string
 */
response.prototype.export_model = function(){
    var ret = '';
    if( this._data && this._data['export-model'] ){
	ret = this._data['export-model'];
    }
    return ret;
};

///
/// Meta.
///

/**
 * Returns a list of the relations found in the response. Sometimes not
 * there, so check the return.
 *
 * This is a function mostly for meta responses.
 *
 * @returns {Array} list
 */
response.prototype.relations = function(){
    var ret = [];
    if( this._data && this._data['meta'] && this._data['meta']['relations'] &&
	us.isArray(this._data['meta']['relations']) ){
	ret = this._data['meta']['relations'];
    }
    return ret;
};

/**
 * Returns a list of the evidence found in the response. Sometimes not
 * there, so check the return.
 *
 * This is a function mostly for meta responses.
 *
 * @returns {Array} list
 */
response.prototype.evidence = function(){
    var ret = [];
    if( this._data && this._data['meta'] && this._data['meta']['evidence'] &&
	us.isArray(this._data['meta']['evidence']) ){
	ret = this._data['meta']['evidence'];
    }
    return ret;
};

/**
 * Returns a list the model ids found in the response. Sometimes not
 * there, so check the return.
 *
 * This is a function mostly for meta responses.
 *
 * See Also: <models_meta>
 *
 * @returns {Array} list
 */
response.prototype.model_ids = function(){
    var ret = [];
    if( this._data && this._data['meta'] && this._data['meta']['models-meta'] &&
	us.isObject(this._data['meta']['models-meta']) ){
	ret = us.keys(this._data['meta']['models-meta']);
    }
    return ret;
};

/**
 * Returns a hash of the model ids to models properties found in the
 * response.
 *
 * Sometimes not there, so check the return.
 *
 * WARNNG: A work in progress, but this is intended as an eventual
 * replacement to model_ids.
 *
 * This is a function mostly for meta responses.
 *
 * See Also: <model_ids>
 *
 * @returns {Object} model ids to arrays of serialized annotation objects
 */
response.prototype.models_meta = function(){
    var ret = {};
    if( this._data && this._data['meta'] && this._data['meta']['models-meta'] &&
	us.isObject(this._data['meta']['models-meta']) ){
	ret = this._data['meta']['models-meta'];
    }
    return ret;
};

/**
 * Returns a hash of the model ids to read-only models properties
 * found in the response.
 *
 * Sometimes not there, so check the return.
 *
 * This is a function mostly for meta responses.
 *
 * See Also: {models_meta}
 *
 * @returns {Object} hash
 */
response.prototype.models_meta_read_only = function(){
    var ret = {};
    if( this._data && this._data['meta'] &&
	this._data['meta']['models-meta-read-only'] &&
	us.isObject(this._data['meta']['models-meta-read-only']) ){
	ret = this._data['meta']['models-meta-read-only'];
    }
    return ret;
};

///
/// Exportable body.
///

module.exports = response;
