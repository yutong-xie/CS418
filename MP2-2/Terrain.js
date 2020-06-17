/**
 * @fileoverview Terrain - A simple 3D terrain using WebGL
 * @author Eric Shaffer
 */

/** Class implementing 3D terrain. */
class Terrain{
/**
 * Initialize members of a Terrain object
 * @param {number} div Number of triangles along x axis and y axis
 * @param {number} minX Minimum X coordinate value
 * @param {number} maxX Maximum X coordinate value
 * @param {number} minY Minimum Y coordinate value
 * @param {number} maxY Maximum Y coordinate value
 */
    constructor(div,minX,maxX,minY,maxY){
        this.div = div;
        this.minX=minX;
        this.minY=minY;
        this.maxX=maxX;
        this.maxY=maxY;
        this.delta = (1/200)*(this.maxX-this.minX)

        // Allocate vertex array
        this.vBuffer = [];
        // Allocate triangle array
        this.fBuffer = [];
        // Allocate normal array
        this.nBuffer = [];
        // Allocate array for edges so we can draw wireframe
        this.eBuffer = [];
        console.log("Terrain: Allocated buffers");

        this.generateTriangles();
        console.log("Terrain: Generated triangles");

        this.setHeightsByPartition(100,this.delta);
        console.log("Terrain: Set heights by partition")

        this.GenerateNormals();
        console.log("Computing per-Vertex Normals")

        this.generateLines();
        console.log("Terrain: Generated lines");

        // Get extension for 4 byte integer indices for drwElements
        var ext = gl.getExtension('OES_element_index_uint');
        if (ext ==null){
            alert("OES_element_index_uint is unsupported by your browser and terrain generation cannot proceed.");
        }
    }

    /**
    * Set the x,y,z coords of a vertex at location(i,j)
    * @param {Object} v an an array of length 3 holding x,y,z coordinates
    * @param {number} i the ith row of vertices
    * @param {number} j the jth column of vertices
    */
    setVertex(v,i,j){
      //Your code here
      var vid = 3*(i*(this.div+1)+j);
      this.vBuffer[vid] = v[0];
      this.vBuffer[vid+1] = v[1];
      this.vBuffer[vid+2] = v[2];
    }3


    /**
    * Return the x,y,z coordinates of a vertex at location (i,j)
    * @param {Object} v an an array of length 3 holding x,y,z coordinates
    * @param {number} i the ith row of vertices
    * @param {number} j the jth column of vertices
    */
    getVertex(v,i,j)
    {
        //Your code here
        var vid = 3*(i*(this.div+1)+j);
        v[0] = this.vBuffer[vid];
        v[1] = this.vBuffer[vid+1];
        v[2] = this.vBuffer[vid+2];
    }

    /**
    * Send the buffer objects to WebGL for rendering
    */
    loadBuffers()
    {
        // Specify the vertex coordinates
        this.VertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vBuffer), gl.STATIC_DRAW);
        this.VertexPositionBuffer.itemSize = 3;
        this.VertexPositionBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexPositionBuffer.numItems, " vertices");

        // Specify normals to be able to do lighting calculations
        this.VertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.nBuffer),
                  gl.STATIC_DRAW);
        this.VertexNormalBuffer.itemSize = 3;
        this.VertexNormalBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexNormalBuffer.numItems, " normals");

        // Specify faces of the terrain
        this.IndexTriBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.fBuffer),
                  gl.STATIC_DRAW);
        this.IndexTriBuffer.itemSize = 1;
        this.IndexTriBuffer.numItems = this.fBuffer.length;
        console.log("Loaded ", this.IndexTriBuffer.numItems, " triangles");

        //Setup Edges
        this.IndexEdgeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.eBuffer),
                  gl.STATIC_DRAW);
        this.IndexEdgeBuffer.itemSize = 1;
        this.IndexEdgeBuffer.numItems = this.eBuffer.length;

        console.log("triangulatedPlane: loadBuffers");

    }

    /**
    * Render the triangles
    */
    drawTriangles(){
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize,
                         gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
                           this.VertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);

        //Draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.drawElements(gl.TRIANGLES, this.IndexTriBuffer.numItems, gl.UNSIGNED_INT,0);
    }

    /**
    * Render the triangle edges wireframe style
    */
    drawEdges(){

        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize,
                         gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
                           this.VertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);

        //Draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.drawElements(gl.LINES, this.IndexEdgeBuffer.numItems, gl.UNSIGNED_INT,0);
    }
/**
 * Fill the vertex and buffer arrays
 */
  generateTriangles()
  {
      //Your code here
      var deltaX=(this.maxX-this.minX)/this.div;
      var deltaY=(this.maxY-this.minY)/this.div;

      for(var i=0;i<=this.div; i++)
        for(var j=0; j<=this.div; j++){
          this.vBuffer.push(this.minX+deltaX*j);
          this.vBuffer.push(this.minY+deltaY*i);
          this.vBuffer.push(0);

          this.nBuffer.push(0);
          this.nBuffer.push(0);
          this.nBuffer.push(0);
        }

      for(var i=0; i<this.div;i++)
        for(var j=0;j<this.div;j++){
          var vid = i*(this.div+1) + j;
          this.fBuffer.push(vid);
          this.fBuffer.push(vid+1);
          this.fBuffer.push(vid+this.div+1);

          this.fBuffer.push(vid+1);
          this.fBuffer.push(vid+1+this.div+1);
          this.fBuffer.push(vid+this.div+1);
        }
      //
      this.numVertices = this.vBuffer.length/3;
      this.numFaces = this.fBuffer.length/3;


  }

/**
 * Print vertices and triangles to console for debugging
 */
  printBuffers()
      {

      for(var i=0;i<this.numVertices;i++)
            {
             console.log("v ", this.vBuffer[i*3], " ",
                               this.vBuffer[i*3 + 1], " ",
                               this.vBuffer[i*3 + 2], " ");

            }

        for(var i=0;i<this.numFaces;i++)
            {
             console.log("f ", this.fBuffer[i*3], " ",
                               this.fBuffer[i*3 + 1], " ",
                               this.fBuffer[i*3 + 2], " ");

            }

      }

/**
 * Generates line values from faces in faceArray
 * to enable wireframe rendering
 */
  generateLines()
  {
      var numTris=this.fBuffer.length/3;
      for(var f=0;f<numTris;f++)
      {
          var fid=f*3;
          this.eBuffer.push(this.fBuffer[fid]);
          this.eBuffer.push(this.fBuffer[fid+1]);

          this.eBuffer.push(this.fBuffer[fid+1]);
          this.eBuffer.push(this.fBuffer[fid+2]);

          this.eBuffer.push(this.fBuffer[fid+2]);
          this.eBuffer.push(this.fBuffer[fid]);
      }
  }

/**
* Set the vertex heights according to a slow but simple noise generation algorithm. We repeatedly partition the terrain
* using a random cutting plane. On one side of the plane. We raise the terrain, and on the other we lower it.
* @param {number} N the bumber of times to partition the terrain grad and adjust the heights on each side
* @param {number} delta th amount to raise (and lower) the partitioned vertices
*/

  setHeightsByPartition(N,delta){


    for (var i = 0; i<N; i++){
      var px = Math.random() * (this.maxX - this.minX) + this.minX;
      var py = Math.random() * (this.maxY - this.minY) + this.minY;

      var theta = Math.random() * 2 * Math.PI;
      var nx = Math.cos(theta);
      var ny = Math.sin(theta);

      for (var j = 0; j < this.numVertices; j++){
        var x = this.vBuffer[j*3]
        var y = this.vBuffer[j*3+1]

        var sign = (x - px) * nx + (y - py) * ny;
        if (sign > 0){

          this.vBuffer[j*3+2] += delta;
        }
        else{
          this.vBuffer[j*3+2] -= delta;
        }
      }
    }
  }

  /**
   * Calculate the subtraction of two vector.
   * @param {vec3} v the result of subtraction
   * @param {vec3} v1 the first vector
   * @param {vec3} v2 the second vector
   */
  vsub(v, v1, v2) {
      v[0] = v1[0] - v2[0];
      v[1] = v1[1] - v2[1];
      v[2] = v1[2] - v2[2];
  }

  /**
   * Calculate the addition of two vector.
   * @param {vec3} v the result of addition
   * @param {vec3} v1 the first vector
   * @param {vec3} v2 the second vector
   */
  vadd(v, v1, v2) {
      v[0] = v1[0] + v2[0];
      v[1] = v1[1] + v2[1];
      v[2] = v1[2] + v2[2];
  }
  /**
   * Calculate the cross product of two vector.
   * @param {vec3} v the result of cross product
   * @param {vec3} v1 the first vector
   * @param {vec3} v2 the second vector
   */
  crossproduct(v,v1,v2){
    v[0] = v1[1] * v2[2] - v1[2] * v2[1];
    v[1] = v1[2] * v2[0] - v1[0] * v2[2];
    v[2] = v1[0] * v2[1] - v1[1] * v2[0];
  }

  /**
   * Normalize a vector.
   * @param {vec3} v the normalized vector
   * @param {vec3} v1 raw vector
   */
  vnorm(v,v1){
    var normal = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1] + v1[2] * v1[2]);
        v[0] = v1[0] / normal;
        v[1] = v1[1] / normal;
        v[2] = v1[2] / normal;
  }

  /**
   * Compute the normal vectors of each vertex
   */

  GenerateNormals(){
    var narray = new Array(this.numVertices);
    for (var i = 0; i < this.numVertices; i++){
      narray[i] = [0,0,0];
    }

    var v1 = vec3.create();
    var v2 = vec3.create();
    var v3 = vec3.create();
    var v4 = vec3.create();
    var v5 = vec3.create();
    var v6 = vec3.create();

    for (var i = 0; i < this.div; i++)
      for (var j = 0; j < this.div; j++){
        var vid = i*(this.div+1) + j;

        this.getVertex(v1,i,j);
        this.getVertex(v2,i,j+1);
        this.getVertex(v3,i+1,j);
        var a1 = vec3.create();
        var a2 = vec3.create();
        this.vsub(a1,v2,v1);
        this.vsub(a2,v3,v1);

        var n = vec3.create();
        this.crossproduct(n,a1,a2);

        var s1 = vec3.create();
        this.vadd(s1,narray[vid],n);
        this.vadd(narray[vid],narray[vid],s1);

        var s2 = vec3.create();
        this.vadd(s2,narray[vid+1],n);
        this.vadd(narray[vid+1],narray[vid+1],s2);

        var s3 = vec3.create();
        this.vadd(s3,narray[vid+this.div+1],n);
        this.vadd(narray[vid+this.div+1],narray[vid+this.div+1],s3);

        this.getVertex(v4,i,j+1);
        this.getVertex(v5,i+1,j+1);
        this.getVertex(v6,i+1,j);

        var b1 = vec3.create();
        var b2 = vec3.create();
        this.vsub(b1,v5,v4);
        this.vsub(b2,v6,v4);

        var m = vec3.create();
        this.crossproduct(m,b1,b2);

        var q1 = vec3.create();
        this.vadd(q1,narray[vid+1],m);
        this.vadd(narray[vid+1],narray[vid+1],q1);

        var q2 = vec3.create();
        this.vadd(q2,narray[vid+1+this.div+1],m);
        this.vadd(narray[vid+1+this.div+1],narray[vid+1+this.div+1],q2);

        var q3 = vec3.create();
        this.vadd(q3,narray[vid+this.div+1],m);
        this.vadd(narray[vid+this.div+1],narray[vid+this.div+1],q3);

      }
    for (var i = 0; i<this.numVertices; i++){
      var st = vec3.create();
      st = narray[i];
      // vec3.normalize(narray[i],st);
      this.vnorm(narray[i],st);

    }
    for (var i = 0; i <= this.div; i++)
      for (var j = 0; j <= this.div; j++){
        var vid = i*(this.div+1) + j;
        var bufferid = 3 * (i*(this.div+1) + j);
        this.nBuffer[bufferid] = narray[vid][0];
        this.nBuffer[bufferid+1] = narray[vid][1];
        this.nBuffer[bufferid+2] = narray[vid][2];
      }
  }
}
