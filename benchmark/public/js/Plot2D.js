
(function (PBDV, Flotr, undefined) {

    "use strict";


    /**
     * @class Plot2D
     * @constructor
     * @param name {String} The name of the plot component (cpu, memory, ...)
     * @param limit {Integer} The limit of the plot (the top is 100%)
     */
    var Plot2D = function( name, limit ) {

        var widget = $( '#' + name );


        /* Attributes */
        
        /** 
         * The name which set the widget we are referring
         * @property NAME
         * @type String
         */
        this.NAME = name;
        
        /**
         * The top limit of the graphic
         * @property limit
         * @type Number
         */
        this.limit = limit;

        /**
         * List whose length determines the number of agents involved in the test
         * @property agents
         * @type array
         */
        this.agents = null;

        /**
         * List of the points that will be drawn in the graphic
         * @property data
         * @type array 
         */  
        this.data = [];

        /**
         * Graphic that will be drawn
         * @property graph
         * @type Flotr object
         */ 
        this.graph = null;

        /**
         * DOM object where the "name" graphics will be placed
         * @property dom 
         * @type DOM element
         */
        this.dom = widget.find( '#' + name + '-graph' )[0];

        /**
         * Key table
         * @property keys
         * @type DOM element
         */ 
        this.keys = widget.find('.keys').find('tbody');

        /**
         * Template for the key table
         * @property template
         */
        this.template = '<tr class="agent">                     \
                            <td class="host"></td>              \
                            <td class="usage"></td>             \
                        </tr>';

    };



    /* Private Methods */

    /**
     * Auxiliary method to set the keys in the DOM
     * @method setupKeysHTML
     * @private
     */
    var setupKeysHTML = function() {

        // Shortcut
        var Colors = PBDV.Constants.KeyColors;

        for (var i = 0; i < this.agents.length; i++) {
            var hostname = this.agents[i];
            var hostID   = this.NAME + '-' + hostname;

            // Using the template
            var html = $( this.template ).attr({ 'id' : hostID });
            html.find('.host').text( hostname );

            // If we still have a default color, add it to the style
            if ( i < Colors.length ) {
                html.addClass( Colors[i] );
            }
            
            // Adding the new key to the list
            this.keys.append( html );
        }

    };


    /**
     * Method used for the update of the data for each agent
     * @method updateAgentData
     * @private
     * @param agent {String} the name of the agent to be updated
     * @param value {Number} the performance value
     */
    var updateAgentData = function( agent, value ) {

        // Shortcut
        var Message = PBDV.Constants.Message;

        // Checking if the agent parameter is a string or not
        if ( agent && typeof agent !== 'string' ) {

            var msg = Message.AGENT_NAME_NOT_STRING + ' (' + this.NAME + ')';
            console.error( msg );
            return;
        }

        // Update points for a particular agent
        for (var i = 0; i < this.agents.length; i++) {

            if ( agent === this.agents[i] ) {
                var d = this.data[i].data;

                for (var j = d.length-1; j > 0; j--) {
                    d[j][1] = d[j-1][1];
                }

                // Introduce new data in the first position
                d[0][1] = value;
            }

        }

    };


    /**
     * Method used for the update of the keys
     * @method updateKeys
     * @private
     * @param host {String} the name of the agent to be updated
     * @param value {Number} the performance value
     */
    var updateKeys = function( host, value ) {
        
        var hostID = '#' + this.NAME + '-' + host;
        var agent  = this.keys.find(hostID);
        
        var newValue = (value) ? value.toFixed(2) : 0;

        switch ( this.NAME ) {
            case 'cpu'    : newValue += "%";    break;
            case 'memory' : newValue += "MB";   break;
        }
        
        agent.find('.usage').text( newValue );

    };



    /* Public API */

    Plot2D.prototype = {

        /**
         * Method to initialize the graphic 
         * @method config
         * @param interval {Number} The interval between points
         * @param nagents {Number} The number of agents
         * @param hostnames {array} The array with the agents names
         */
        config : function( interval, nagents, hostnames ) {

            // Time Constants (in miliseconds)
            var SECONDS = 60000,
                SECOND  = 1000;

            this.agents = hostnames;

            for (var i = 0; i < nagents; i++) {

                var aux = [];

                for (var j = 0; j <= SECONDS / interval; j++) {
                    var d = j * interval / SECOND;
                    aux.push( [d, 0] );
                }

                this.data.push({ 'data' : aux });
            }

            // If we received some list of agents names, then setup the keys
            if ( this.agents.length ) {
                setupKeysHTML.call( this );
            }

        },


        /**
         * Method to draw the graphic
         * @method draw
         */
        draw : function() {

            var Settings = PBDV.Constants.Plots.Settings;

            // Drawing the graph with the updated data
            this.graph = Flotr.draw( this.dom, this.data, {

                yaxis : {   // Y-axis size
                    max : this.limit,
                    min : 0
                },
                
                xaxis : {   // X-axis size
                    max : Settings.MAX_X,
                    min : Settings.MIN_X
                }
            });

        },


        /**
         * Method to update the value of a particular agent
         * @method update
         * @param agent {String} the name of the agent to be updated
         * @param value {Number} the performance value
         */
        update : function( agent, value ) {

            if (!value) { value = 0; } 
            updateAgentData.call( this, agent, value );

            if ( this.agents.length ) {
                updateKeys.call( this, agent, value );
            }

            this.draw();

        }

    };


    // Exported to the namespace
    PBDV.Plot2D = Plot2D;


})( window.PBDV = window.PBDV || {},    // Namespace
    Flotr);                             // Dependencies