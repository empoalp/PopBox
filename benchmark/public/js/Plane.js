
// Graph Class

(function (PBDV, THREE, undefined) {

    "use strict";


    /**
     * @class Plane
     * @constructor
     * @param {Object}    test     Information about the test that are going to be launched
     * @param {Object}    size     Size of the plane that is going to be created
     */

    var Plane = function( test, size ) {

        /**
         * @property test
         * @type     {Object}
         */
        this.test=test;
        /**
         * @property oldAverage
         * @type     {Number}
         */
         this.oldAverage = 0;
        /**
         * @property sizeMap
         * @type     {Object}
         */
        this.sizeMap = {};
        /**
         * @property plane
         * @type     {THREE.Object3D}
         */
        this.plane = createPlane.call(this, test, size);
        /**
         * @property points
         * @type     {Object}
         */
        this.points = [];
        /**
         * @property ratio
         * @type     {Number}
         */
        this.ratio=null;

        // We rename this.plane to this.threePlot
        this.threePlot = this.plane;        
    };


    /* Private Methods */

    /**
     * This function returns the transformed coordinate of one coordinate
     *
     * @method coord
     * @private
     * @param  {int}    i            The coordinate to transform
     * @param  {int}    start        The minimum value that i can be
     * @param  {int}    interval     The interval on i for two consecutive coordinates
     * @return {int}    the coord that has been transformated
     */

    var coord = function(i, start, interval) {
        return Math.floor((i - start) / interval);
    };


    /**
     * This function sets the transition between different colors on a Plane
     *
     * @method setColors
     * @private
     * @param  {THREE.Mesh}     plane   The plane to set colors to
     */
    var setColors = function( plane ) {
        plane.geometry.computeBoundingBox();

        var zMax   = plane.geometry.boundingBox.max.z;
        var zMin   = plane.geometry.boundingBox.min.z;
        var zRange = zMax - zMin;
        var color, point, face, numberOfSides, vertexIndex;

        // faces are indexed using characters
        var faceIndices = [ 'a', 'b', 'c', 'd' ];

        // first, assign colors to vertices as desired
        for ( var i = 0; i < plane.geometry.vertices.length; i++ ) {
            point = plane.geometry.vertices[ i ];
            color = new THREE.Color( 0x0000ff );
            color.setHSV( 0.7 * (zMax - point.z) / zRange, 1, 0.9 );
            plane.geometry.colors[i] = color; // use this array for convenience
        }

        // copy the colors as necessary to the face's vertexColors array.
        for ( i = 0; i < plane.geometry.faces.length; i++ ) {
            face = plane.geometry.faces[ i ];
            numberOfSides = ( face instanceof THREE.Face3 ) ? 3 : 4;

            for( var j = 0; j < numberOfSides; j++ ) {
                vertexIndex = face[ faceIndices[ j ] ];
                face.vertexColors[ j ] = plane.geometry.colors[ vertexIndex ];
            }
        }
    };


    /**
     * This function is used to tell the Renderer that a plane must be recalculated.
     *
     * @method setup
     * @private
     * @param   {int}   p   the index of the plane to recalculate
     */
    var setup = function(p) {

        // We rename the plane that we need to recalculate to child
        var child = this.plane.children[p];

        // We create the Material and assign it to the plane
        child.material = new THREE.MeshLambertMaterial({
            vertexColors: THREE.VertexColors
        });

        // We set the material to be DoubleSided and mark the Material for the Renderer to recalculate it
        child.material.side = THREE.DoubleSide;
        child.material.needsUpdate = true;

        // We mark all the geometry properties to be reconsidered to recaculate the plane
        var geo = child.geometry;
        geo.computeCentroids();
        geo.computeFaceNormals();
        geo.computeVertexNormals();
        geo.computeTangents();
        //geo.computeBoundingSphere();
        geo.verticesNeedUpdate     = true;
        geo.elementsNeedUpdate     = true;
        geo.morphTargetsNeedUpdate = true;
        geo.uvsNeedUpdate          = true;
        geo.normalsNeedUpdate      = true;
        geo.colorsNeedUpdate       = true;
        geo.tangentsNeedUpdate     = false;
        //child.matrixWorldNeedsUpdate= true;

        // As the plane has changed, colors must be reassigned
        setColors(child);
    };


    /**
     * this function creates a THREE.3DObject with the required size and returns it

     * @Method createPlane
     * @private
     * @param  {Object} test object that contains the characteristics of the running test
     * @param  {Object} size object that contains x and y sizes of the plane that's being created
     * @return {THREE.Object3D}  The created Plane
     */
    var createPlane = function(test, size) {
        //
        var q = test.queues;
        var p = test.payload;
        var plane;

        // We calculate the number of divisionsof the axis
        this.sizeMap.x = coord(q.end, q.start, q.interval) + 1;
        this.sizeMap.y = coord(p.end, p.start, p.interval) + 1;

        // we create the PlaneGeometry with the specified size and number of divisions
        var geometry = new THREE.PlaneGeometry(
            size.x,
            size.y,
            this.sizeMap.x-1,
            this.sizeMap.y-1
            );

        // We create the Materal that we are going to assign first to the Plane
        var mlm = new THREE.MeshLambertMaterial({
            vertexColors : THREE.VertexColors
        });

        mlm.side = THREE.DoubleSide;

        // We put Plane and Material together
        plane = new THREE.SceneUtils.createMultiMaterialObject(geometry, [mlm]);
        plane.dynamic = true;
        plane.rotation.x = -Math.PI / 2;
        plane.position.y -= size.y/2;

        // Finally we set the colors of the plane
        for (p in plane.children) {
            if (plane.children.hasOwnProperty(p)){
                setColors( plane.children[p] );
            }
        }
        return plane;

    };



    /* Public API */

    Plane.prototype = {

        /**
         * This function draws a new received point into the plane and
         *  marks it to be updated.
         *
         * @method  addPoint
         * @param   {Object}    point the point to be drawn
         */
        addPoint : function( point ) {

            for (var p in this.plane.children) {
                if (this.plane.children.hasOwnProperty(p)){
                    // We calculate the three coordinates of the point in our plane
                    var queue   = coord( point[0], this.test.queues.start, this.test.queues.interval );
                    var payload = coord( point[2], this.test.payload.start, this.test.payload.interval ) * this.sizeMap.x;
                    var time    = point[0] / (point[1]/1000);

                    // We rename the object that contains the vertices of the plane
                    var vertices = this.plane.children[p].geometry.vertices;
                    // We set the height of the desired point and include it into the array of drawn Points
                    vertices[payload + queue].z = time * this.ratio;
                    this.points.push( time );
                    // We mark the plane to be recalculated
                    setup.call(this, p);

                    // We set the unreceived vertices to the average height (By now it is disabled)
                    //stabilize();
                }
            }
        },


        // Left for future implementation
        animate : function() {

        },


        /**
         * This method rescales all the points of the plane according to a new Ratio
         *
         * @method  rescale
         * @param   {number} newRatio    the ratio that is going to be used to rescale the points
         */
        rescale : function( newRatio ) {

            // We rename the vertices of the geometry
            var vertices = this.plane.children[0].geometry.vertices;

            //For each point with value, if newRatio is 0 we reset it to 0 and if ratio is something
            //  else, we rescale it to the newRatio
            for (var i = 0; i < this.points.length; i++) {
                if ( newRatio === 0) {
                    vertices[i].z = 0;
                }
                else {
                    vertices[i].z = this.points[i] * newRatio;
                }
            }
            // We store the newRatio so that we can rescale future incoming points
            this.ratio = newRatio;
            // We mark the plane to be changed
            setup.call(this, 0);
        },


        /**
         * This method clears the array of received points and sets the height of all the points to 0
         *
         * @method restart
         */
        restart : function() {
            this.rescale(0);
            this.points = [];
            this.oldAverage = 0;
        },


        /**
         * This function is used to set the points that haven't been received
         *  yet to a height equal to the average of the points received (so that
         *  the colors are more precise from the beginning)
         *
         * @method stabilize
         */
        stabilize : function( ) {
            var average;
            for (var p in this.plane.children) {

                if(this.plane.children.hasOwnProperty(p)){
                    var vertices = this.plane.children[p].geometry.vertices;
                    var length = 0;
                    average = 0;
                    
                    for (var i = 0; i < vertices.length; i++) {
                        if (vertices[i].z !== this.oldAverage) {
                            average += vertices[i].z;
                            length++;
                        }
                    }

                    if ( length > 0 ) {
                        average = average/length;
                    }

                    for (i = 0; i < vertices.length; i++) {
                        if (vertices[i].z === this.oldAverage) {
                            vertices[i].z = average;
                        }
                    }
                }

            }

            this.oldAverage = average;

        }

    };


    // Exported to the namespace
    PBDV.Plane = Plane;


})( window.PBDV = window.PBDV || {},    // Namespace
    THREE);                             // Dependencies
