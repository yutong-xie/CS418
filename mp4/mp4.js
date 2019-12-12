/**
 * @file A simple physical Engine generating particels
 * @author Yutong Xie <yutongx6@illinois.edu>
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

/** @global The Modelview matrix */
var mvMatrix = mat4.create();

/** @global The Projection matrix */
var pMatrix = mat4.create();

/** @global The Normal matrix */
var nMatrix = mat3.create();

/** @global The matrix stack for hierarchical modeling */
var mvMatrixStack = [];

/** @global Vector to be used only for affine transformations */
var transformVec = vec3.create();

// Buffer for sphere
var sphereVertexPositionBuffer;
var sphereVertexNormalBuffer;

// View parameters
/** @global Location of the camera in world coordinates */
var eyePt = vec3.fromValues(0.0,0.0,10.0);
/** @global Direction of the view in world coordinates */
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
/** @global Up vector for view matrix creation, in world coordinates */
var up = vec3.fromValues(0.0,1.0,0.0);
/** @global Location of a point along viewDir in world coordinates */
var viewPt = vec3.fromValues(0.0,0.0,0.0);

// Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = [20,20,20];
/** @global Ambient light color/intensity for Phong reflection */
var lAmbient = [0.4,0.4,0.4];
/** @global Diffuse light color/intensity for Phong reflection */
var lDiffuse = [0.8,0.8,0.8];
/** @global Specular light color/intensity for Phong reflection */
var lSpecular = [0.4,0.4,0.4];

// Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [1.0,1.0,1.0];
/** @global Diffuse material color/intensity for Phong reflection */
var kDiffuse = [255.0/255.0,102.0/255.0,178.0/255.0];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [1.0,1.0,1.0];
/** @global Shininess exponent for Phong reflection */
var shininess = 23;

// size for the cube
var cube = 2.0;

// the speed of particles
var speed = 5;

// total number of particles
var particleNum = 0;

// Particle set
var particleSet = [];

// time interval
var dt = 0.1;

// gravity set
var gravity = -0.1;

// drag force
var drag = 0.9;


//-------------------------------------------------------------------------
/**
 * Populates buffers with data for spheres
 */
function setupSphereBuffers() {
    var sphereSoup = [];
    var sphereNormals = [];
    var numT = sphereFromSubdivision(6, sphereSoup, sphereNormals);
    console.log("Generated ", numT, " triangles");

    sphereVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereSoup), gl.STATIC_DRAW);
    sphereVertexPositionBuffer.itemSize = 3;
    sphereVertexPositionBuffer.numItems = numT*3;
    console.log(sphereSoup.length/9);

    // Specify normals to be able to do lighting calculations
    sphereVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereNormals), gl.STATIC_DRAW);
    sphereVertexNormalBuffer.itemSize = 3;
    sphereVertexNormalBuffer.numItems = numT*3;

    console.log("Normals ", sphereNormals.length/3);
}

//-------------------------------------------------------------------------
/**
 * Draws a sphere from the sphere buffer
 */
function drawSphere(){
    // Bind vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,               sphereVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // Bind normal buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, sphereVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, sphereVertexPositionBuffer.numItems);
}

//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
}

//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 */
function uploadNormalMatrixToShader() {
    mat3.fromMat4(nMatrix,mvMatrix);
    mat3.transpose(nMatrix,nMatrix);
    mat3.invert(nMatrix,nMatrix);
    gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}

//----------------------------------------------------------------------------------
/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview/normal matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
    var names = ["webgl", "experimental-webgl"];
    var context = null;
    for (var i=0; i < names.length; i++) {
        try {
            context = canvas.getContext(names[i]);
        } catch(e) {}
        if (context) {
            break;
        }
    }
    if (context) {
        context.viewportWidth = canvas.width;
        context.viewportHeight = canvas.height;
    } else {
        alert("Failed to create WebGL context!");
    }
    return context;
}

//----------------------------------------------------------------------------------
/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
    var shaderScript = document.getElementById(id);

    // If we don't find an element with the specified id
    // we do an early exit
    if (!shaderScript) {
        return null;
    }

    // Loop through the children for the found DOM element and
    // build up the shader source code as a string
    var shaderSource = "";
    var currentChild = shaderScript.firstChild;
    while (currentChild) {
        if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
            shaderSource += currentChild.textContent;
        }
        currentChild = currentChild.nextSibling;
    }

    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders
 */
function setupShaders() {
    vertexShader = loadShaderFromDOM("shader-vs");
    fragmentShader = loadShaderFromDOM("shader-fs");

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Failed to setup shaders");
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
    shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");
    shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");
    shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
    shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
    shaderProgram.uniformShininessLoc = gl.getUniformLocation(shaderProgram, "uShininess");
    shaderProgram.uniformAmbientMatColorLoc = gl.getUniformLocation(shaderProgram, "uKAmbient");
    shaderProgram.uniformDiffuseMatColorLoc = gl.getUniformLocation(shaderProgram, "uKDiffuse");
    shaderProgram.uniformSpecularMatColorLoc = gl.getUniformLocation(shaderProgram, "uKSpecular");
}


//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function uploadLightsToShader(loc,a,d,s) {
    gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
    gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
    gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
    gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//-------------------------------------------------------------------------
/**
 * Sends material information to the shader
 * @param {Float32} alpha shininess coefficient
 * @param {Float32Array} a diffuse material color
 * @param {Float32Array} a ambient material color
 * @param {Float32Array} a specular material color
 */
function uploadMaterialToShader(alpha,a,d,s) {
    gl.uniform1f(shaderProgram.uniformShininessLoc, alpha);
    gl.uniform3fv(shaderProgram.uniformAmbientMatColorLoc, a);
    gl.uniform3fv(shaderProgram.uniformDiffuseMatColorLoc, d);
    gl.uniform3fv(shaderProgram.uniformSpecularMatColorLoc, s);
}

//----------------------------------------------------------------------------------
/**
 * Populate buffers with data
 */
function setupBuffers() {
    setupSphereBuffers();
}

//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // We'll use perspective
  mat4.perspective(pMatrix, degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);
  // We want to look down -z, so create a lookat point in that direction
  vec3.add(viewPt, eyePt, viewDir);
  // Then generate the lookat matrix and initialize the MV matrix to that view
  mat4.lookAt(mvMatrix, eyePt, viewPt, up);
  for(var i=0; i < particleNum; i++){
      mvPushMatrix();
      drawParticle(i);
      mvPopMatrix();
  }
}

//----------------------------------------------------------------------------------
/**
 * Draw particles inside the cube box
 * @param {Integer} index is the number of particles
 */
function drawParticle(index){
  // set the position of particles
  vec3.set(transformVec, particleSet[index].position[0], particleSet[index].position[1], particleSet[index].position[2]);
  mat4.translate(mvMatrix, mvMatrix, transformVec);

  // set the size of particles
  vec3.set(transformVec, particleSet[index].radius, particleSet[index].radius, particleSet[index].radius);
  mat4.scale(mvMatrix, mvMatrix, transformVec);

  // set the color of particles
  kDiffuse = [particleSet[index].color[0], particleSet[index].color[1], particleSet[index].color[2]];
  uploadLightsToShader(lightPosition,lAmbient,lDiffuse,lSpecular);
  uploadMaterialToShader(shininess,kAmbient,kDiffuse,kSpecular);
  setMatrixUniforms();
  drawSphere();
}

//----------------------------------------------------------------------------------
/**
 * Build the particles object with position, speed, radius, and color
 */
function particle(){
    this.position = vec3.create();
    this.position[0] = cube - 2*cube*Math.random();
    this.position[1] = cube - 2*cube*Math.random();
    this.position[2] = cube - 2*cube*Math.random();

    this.velocity = vec3.create();
    this.velocity[0] = speed - speed*Math.random();
    this.velocity[1] = speed - speed*Math.random();
    this.velocity[2] = speed - speed*Math.random();

    this.radius = 1/3*Math.random();

    this.color = vec3.create();
    this.color[0] = Math.random();
    this.color[1] = Math.random();
    this.color[2] = Math.random();

    return this;
}

//----------------------------------------------------------------------------------
/**
 * Animation to be called from tick. Based on the gravity and drag, update the position of each particle
 */
function animate(){
    for (let i=0; i < particleNum; i++){
      particleSet[i].position[0] += particleSet[i].velocity[0]*dt;
      particleSet[i].position[1] += particleSet[i].velocity[1]*dt;
      particleSet[i].position[2] += particleSet[i].velocity[2]*dt;
      // // velocity change due to drag and gravity
      var acceleration = gravity;

      particleSet[i].velocity[0] *= drag**dt;
      particleSet[i].velocity[1] = particleSet[i].velocity[1]*(drag**dt) + acceleration*dt;
      particleSet[i].velocity[2] *= drag**dt;
      for(let j=0; j < 3; j++){

          if(particleSet[i].position[j] >= cube || particleSet[i].position[j] <= -cube){
              particleSet[i].velocity[j] *= -0.8;
              if (particleSet[i].position[j] >=cube ){
                particleSet[i].position[j] = 2*cube - particleSet[i].position[j];
              }
              if (particleSet[i].position[j] <= -cube){
                particleSet[i].position[j] = -2*cube - particleSet[i].position[j];
              }
              // make the particle stop
              if(Math.abs(particleSet[i].velocity[j]) < 0.18){
                  particleSet[i].velocity[j] = 0;
              }
          }
       }
    }
}

//----------------------------------------------------------------------------------
/**
 * Key presses and its functions
 * @param {event} press the key to take corresponding action
 */

function handleKeyDown(event) {
    // S key to generate a new particle
    if(event.keyCode == "83"){
      particleSet.push(new particle());
      particleSet.push(new particle());
      particleNum = particleNum + 2;
    }
    // R key for removing all the particles
    if(event.keyCode == "82"){
      particleNum = 0;
      particleSet = [];
    }
}

//----------------------------------------------------------------------------------
/**
 * Startup function called from html code to start program.
 */
 function startup() {
    canvas = document.getElementById("myGLCanvas");
    window.addEventListener("keydown", handleKeyDown, false);
    gl = createGLContext(canvas);
    setupShaders();
    setupBuffers();
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    tick();
}

//----------------------------------------------------------------------------------
/**
 * Tick called for every animation frame.
 */
function tick() {
    draw();
    requestAnimFrame(tick);
    animate();
}
