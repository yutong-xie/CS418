/**
 * @file File for CS418 MP1
 * @author Yutong Xie <yutongx6@illinois.edu>
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

/** @global The WebGL buffer holding the triangle */
var vertexPositionBuffer;

/** @global The WebGL buffer holding the vertex colors */
var vertexColorBuffer;

/** @global The Modelview matrix */
var mvMatrix = mat4.create();

/** @global The Projection matrix */
var pMatrix = mat4.create();

/** @global The angle of rotation around the x axis */
var rotAngle = 0;

/** @global The angle used for non-uniform motion*/
var angleX = 0;
var angleY = 0;

/** @global Two times pi to save some multiplications...*/
var twicePi=2.0*3.14159;

/** @global The time stamp for previous frame in ms */
var lastTime = 0;

/** @global The time for one animation */
var playTime = 0;

/** @global The translate parameters in X and Y */
var translateX = 0;
var translateY = 0;

/** @global The translate parameters for mylogo function */
var transX = 0;
var transY = 0;

/** @global The scale parameters in X and Y */
var scaleX = 1;
var scaleY = 1;

/** @global translation glmatrix vector  */
var translationVec = vec3.create();

/** @global scale glmatrix vector */
var scaleVec = vec3.create();

/** @global store user input for animation mode switch */
var status = 0;

/** @global indicate university logo expands or shrinks  */
var change = 0;

/** @global number counter for animate  */
var count = 0;

/** @global indicate mylogo translate in which direction  */
var left = 0;
//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
}

/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}


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

  shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
}

/**
 * Populate vertex buffer with data
  @param {number} number of vertices to use around the circle boundary
 */
function loadVertices() {
//Generate the vertex positions
  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);

  const fm = 40

  var triangleVertices = [
    // top orange bar
      -8.0/fm,12.0/fm,0.0,
      -8.0/fm,7.0/fm,0.0,
      8.0/fm,12.0/fm,0.0,
      -8.0/fm,7.0/fm,0.0,
      8.0/fm,12.0/fm,0.0,
      8.0/fm,7.0/fm,0.0,
    // body
      -4.5/fm,7.0/fm,0.0,
      -4.5/fm,-7.0/fm,0.0,
      4.5/fm,7.0/fm,0.0,
      -4.5/fm,-7.0/fm,0.0,
      4.5/fm,7.0/fm,0.0,
      4.5/fm,-7.0/fm,0.0,
    // bottom orange bar
      -8.0/fm,-7.0/fm,0.0,
      -8.0/fm,-12.0/fm,0.0,
      8.0/fm,-7.0/fm,0.0,
      -8.0/fm,-12.0/fm,0.0,
      8.0/fm,-7.0/fm,0.0,
      8.0/fm,-12.0/fm,0.0,

    // top blue
      -8.5/fm,12.5/fm,0.0,
      -8.5/fm,12.0/fm,0.0,
      8.5/fm,12.5/fm,0.0,
      -8.5/fm,12.0/fm,0.0,
      8.5/fm,12.5/fm,0.0,
      8.5/fm,12.0/fm,0.0,
    // low blue
      -8.5/fm,-12.5/fm,0.0,
      -8.5/fm,-12/fm,0.0,
      8.5/fm,-12.5/fm,0.0,
      -8.5/fm,-12.0/fm,0.0,
      8.5/fm,-12.5/fm,0.0,
      8.5/fm,-12.0/fm,0.0,
    // top left blue
      -8.5/fm,12.0/fm,0.0,
      -8.0/fm,12.0/fm,0.0,
      -8.5/fm,7.0/fm,0.0,
      -8.0/fm,12.0/fm,0.0,
      -8.5/fm,7.0/fm,0.0,
      -8.0/fm,7.0/fm,0.0,
    // top right blue
      8.5/fm,12.0/fm,0.0,
      8.0/fm,12.0/fm,0.0,
      8.5/fm,7.0/fm,0.0,
      8.0/fm,12.0/fm,0.0,
      8.5/fm,7.0/fm,0.0,
      8.0/fm,7.0/fm,0.0,
    // top low left blue
      -8.5/fm,7.0/fm,0.0,
      -8.5/fm,6.5/fm,0.0,
      -4.5/fm,7.0/fm,0.0,
      -8.5/fm,6.5/fm,0.0,
      -4.5/fm,7.0/fm,0.0,
      -4.5/fm,6.5/fm,0.0,
    // top low right blue
      8.5/fm,7.0/fm,0.0,
      8.5/fm,6.5/fm,0.0,
      4.5/fm,7.0/fm,0.0,
      8.5/fm,6.5/fm,0.0,
      4.5/fm,7.0/fm,0.0,
      4.5/fm,6.5/fm,0.0,
    // middle left blue
      -5.0/fm,6.5/fm,0.0,
      -4.5/fm,6.5/fm,0.0,
      -5.0/fm,-6.5/fm,0.0,
      -4.5/fm,6.5/fm,0.0,
      -5.0/fm,-6.5/fm,0.0,
      -4.5/fm,-6.5/fm,0.0,
    // middle right blue
      5.0/fm,6.5/fm,0.0,
      4.5/fm,6.5/fm,0.0,
      5.0/fm,-6.5/fm,0.0,
      4.5/fm,6.5/fm,0.0,
      5.0/fm,-6.5/fm,0.0,
      4.5/fm,-6.5/fm,0.0,
    // bottom high left blue
      -8.5/fm,-7.0/fm,0.0,
      -8.5/fm,-6.5/fm,0.0,
      -4.5/fm,-7.0/fm,0.0,
      -8.5/fm,-6.5/fm,0.0,
      -4.5/fm,-7.0/fm,0.0,
      -4.5/fm,-6.5/fm,0.0,
    // bottom high left blue
      8.5/fm,-7.0/fm,0.0,
      8.5/fm,-6.5/fm,0.0,
      4.5/fm,-7.0/fm,0.0,
      8.5/fm,-6.5/fm,0.0,
      4.5/fm,-7.0/fm,0.0,
      4.5/fm,-6.5/fm,0.0,
    // bottom left blue
      -8.5/fm,-12.0/fm,0.0,
      -8.0/fm,-12.0/fm,0.0,
      -8.5/fm,-7.0/fm,0.0,
      -8.0/fm,-12.0/fm,0.0,
      -8.5/fm,-7.0/fm,0.0,
      -8.0/fm,-7.0/fm,0.0,
    // bottom right blue
      8.5/fm,-12.0/fm,0.0,
      8.0/fm,-12.0/fm,0.0,
      8.5/fm,-7.0/fm,0.0,
      8.0/fm,-12.0/fm,0.0,
      8.5/fm,-7.0/fm,0.0,
      8.0/fm,-7.0/fm,0.0

  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.DYNAMIC_DRAW);
  vertexPositionBuffer.itemSize = 3;
  vertexPositionBuffer.numberOfItems = 90;
}

/**
 * Populate color buffer with data
  @param {number} number of vertices to use around the circle boundary
 */
function loadColors() {
  vertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  const r1 = 230/255
  const g1 =90/255
  const b1 = 50/255
  const r2 = 25/225
  const g2 = 25/225
  const b2 = 112/225
  const a = 1.0
  var colors = [
      r1,g1,b1,a,
      r1,g1,b1,a,
      r1,g1,b1,a,
      r1,g1,b1,a,
      r1,g1,b1,a,
      r1,g1,b1,a,

      r1,g1,b1,a,
      r1,g1,b1,a,
      r1,g1,b1,a,
      r1,g1,b1,a,
      r1,g1,b1,a,
      r1,g1,b1,a,

      r1,g1,b1,a,
      r1,g1,b1,a,
      r1,g1,b1,a,
      r1,g1,b1,a,
      r1,g1,b1,a,
      r1,g1,b1,a,

      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,

      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,

      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,

      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,

      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,

      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,

      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,

      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,

      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,

      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,

      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,

      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a,
      r2,g2,b2,a




  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  vertexColorBuffer.itemSize = 4;
  vertexColorBuffer.numItems = 90;
}


/**
 * Populate buffers with data
   @param {number} number of vertices to use around the circle boundary
 */
function setupBuffers() {

  //Generate the vertex positions
  loadVertices();

  //Generate the vertex colors
  loadColors();
}

/**
  * Make the logo extend in Y or X&Y direction.
  */
function dance(angleX, angleY){
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  const fm = 40;
  var triangleVertices = [
    // top orange bar
      -8.0/fm,12.0/fm,0.0,
      -8.0/fm,7.0/fm,0.0,
      8.0/fm,12.0/fm,0.0,
      -8.0/fm,7.0/fm,0.0,
      8.0/fm,12.0/fm,0.0,
      8.0/fm,7.0/fm,0.0,
    // body
      -4.5/fm,7.0/fm,0.0,
      -4.5/fm,-7.0/fm,0.0,
      4.5/fm,7.0/fm,0.0,
      -4.5/fm,-7.0/fm,0.0,
      4.5/fm,7.0/fm,0.0,
      4.5/fm,-7.0/fm,0.0,
    // bottom orange bar
      -8.0/fm,-7.0/fm,0.0,
      -8.0/fm,-12.0/fm,0.0,
      8.0/fm,-7.0/fm,0.0,
      -8.0/fm,-12.0/fm,0.0,
      8.0/fm,-7.0/fm,0.0,
      8.0/fm,-12.0/fm,0.0,

    // top blue
      -8.5/fm,12.5/fm,0.0,
      -8.5/fm,12.0/fm,0.0,
      8.5/fm,12.5/fm,0.0,
      -8.5/fm,12.0/fm,0.0,
      8.5/fm,12.5/fm,0.0,
      8.5/fm,12.0/fm,0.0,
    // low blue
      -8.5/fm,-12.5/fm,0.0,
      -8.5/fm,-12/fm,0.0,
      8.5/fm,-12.5/fm,0.0,
      -8.5/fm,-12.0/fm,0.0,
      8.5/fm,-12.5/fm,0.0,
      8.5/fm,-12.0/fm,0.0,
    // top left blue
      -8.5/fm,12.0/fm,0.0,
      -8.0/fm,12.0/fm,0.0,
      -8.5/fm,7.0/fm,0.0,
      -8.0/fm,12.0/fm,0.0,
      -8.5/fm,7.0/fm,0.0,
      -8.0/fm,7.0/fm,0.0,
    // top right blue
      8.5/fm,12.0/fm,0.0,
      8.0/fm,12.0/fm,0.0,
      8.5/fm,7.0/fm,0.0,
      8.0/fm,12.0/fm,0.0,
      8.5/fm,7.0/fm,0.0,
      8.0/fm,7.0/fm,0.0,
    // top low left blue
      -8.5/fm,7.0/fm,0.0,
      -8.5/fm,6.5/fm,0.0,
      -4.5/fm,7.0/fm,0.0,
      -8.5/fm,6.5/fm,0.0,
      -4.5/fm,7.0/fm,0.0,
      -4.5/fm,6.5/fm,0.0,
    // top low right blue
      8.5/fm,7.0/fm,0.0,
      8.5/fm,6.5/fm,0.0,
      4.5/fm,7.0/fm,0.0,
      8.5/fm,6.5/fm,0.0,
      4.5/fm,7.0/fm,0.0,
      4.5/fm,6.5/fm,0.0,
    // middle left blue
      -5.0/fm,6.5/fm,0.0,
      -4.5/fm,6.5/fm,0.0,
      -5.0/fm,-6.5/fm,0.0,
      -4.5/fm,6.5/fm,0.0,
      -5.0/fm,-6.5/fm,0.0,
      -4.5/fm,-6.5/fm,0.0,
    // middle right blue
      5.0/fm,6.5/fm,0.0,
      4.5/fm,6.5/fm,0.0,
      5.0/fm,-6.5/fm,0.0,
      4.5/fm,6.5/fm,0.0,
      5.0/fm,-6.5/fm,0.0,
      4.5/fm,-6.5/fm,0.0,
    // bottom high left blue
      -8.5/fm,-7.0/fm,0.0,
      -8.5/fm,-6.5/fm,0.0,
      -4.5/fm,-7.0/fm,0.0,
      -8.5/fm,-6.5/fm,0.0,
      -4.5/fm,-7.0/fm,0.0,
      -4.5/fm,-6.5/fm,0.0,
    // bottom high left blue
      8.5/fm,-7.0/fm,0.0,
      8.5/fm,-6.5/fm,0.0,
      4.5/fm,-7.0/fm,0.0,
      8.5/fm,-6.5/fm,0.0,
      4.5/fm,-7.0/fm,0.0,
      4.5/fm,-6.5/fm,0.0,
    // bottom left blue
      -8.5/fm,-12.0/fm,0.0,
      -8.0/fm,-12.0/fm,0.0,
      -8.5/fm,-7.0/fm,0.0,
      -8.0/fm,-12.0/fm,0.0,
      -8.5/fm,-7.0/fm,0.0,
      -8.0/fm,-7.0/fm,0.0,
    // bottom right blue
      8.5/fm,-12.0/fm,0.0,
      8.0/fm,-12.0/fm,0.0,
      8.5/fm,-7.0/fm,0.0,
      8.0/fm,-12.0/fm,0.0,
      8.5/fm,-7.0/fm,0.0,
      8.0/fm,-7.0/fm,0.0

  ];
  for (i=0;i<270;i=i+3){
    // triangleVertices[i] = triangleVertices[i]+0.01;
    triangleVertices[i] = triangleVertices[i]*(0.5+Math.cos(degToRad(angleX)));
    triangleVertices[i+1] = triangleVertices[i+1]*(0.5+Math.sin(degToRad(angleY)));

  }
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.DYNAMIC_DRAW);
}


/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  mat4.identity(mvMatrix);
  mat4.identity(pMatrix);

  vec3.set(scaleVec, scaleX, scaleY, 0);
  vec3.set(translationVec, translateX, translateY, 0);
  mat4.translate(mvMatrix,mvMatrix,translationVec);
  mat4.scale(mvMatrix,mvMatrix,scaleVec);
  mat4.rotateY(mvMatrix, mvMatrix, degToRad(rotAngle));

  // mat4.ortho(pMatrix,-1,1,-1,1,1,-1);


  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,
                         vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute,
                            vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLES, 0, vertexPositionBuffer.numberOfItems);
}

/**
 * Animation to be called from tick. Updates globals and performs animation for each tick.
 */
function animate() {
  var timeNow = new Date().getTime();
  if(lastTime != 0){
    var elapsed = timeNow - lastTime;
    setupBuffers();
    if (status == 1){
        transX = 0;
        transY = 0;
      // make the logo rotate
      if (count<70){
        scaleX = 1;
        scaleY = 1;
        rotAngle= (rotAngle+30) % 360;
        count++;
      }
      // enlarge or shrink the logo
      else if (count>=70 && count<72){
        if (scaleX > 0.1 && change == 0){
          rotAngle= (rotAngle+15) % 360;
          scaleX = scaleX - 0.005;
          scaleY = scaleY - 0.005;
        }
        else if(scaleX <= 0.1){
          rotAngle= (rotAngle+15) % 360;
          scaleX = 0.1;
          scaleY = 0.1;
          change = 1;
          count++;
        }
        if (scaleX < 1 && change == 1){
          rotAngle= (rotAngle+15) % 360;
          scaleX = scaleX + 0.005;
          scaleY = scaleY + 0.005;
        }
        else if(scaleX >= 1){
          rotAngle= (rotAngle+15) % 360;
          scaleX = 1;
          scaleY = 1;
          change = 0;
          count++;
        }
      }
      else if (count==72){
        rotAngle = 0;
        count++;
      }
      // make the logo do non-affine change
      else if (count>72 && count<=75){
        dance(0,angleY);
        angleY = (angleY+8) % 360;
        if (angleY == 0){
          count++;
        }
        if (count==75){
          angleX = 0;
          angleY = 0;
          count++;
        }
      }
      else if (count>75&&count<=230){
        dance(angleX,angleY);
        angleX = (angleX+8) % 360;
        angleY = (angleY+8) % 360;
        count++;
        if (count == 230){
          angleX = 0;
          angleY = 90;
        }
      }
      else if (count>230){
        count = 0;
      }
    }
    // load my own logo
    else if (status == 2){
      rotAngle = 0;
      angleX = 0;
      angleY = 0;
      count = 0;

      transY = transY - 0.02;
      if (transY <= -2){
        transY = -2;
      }

      if (left == 0 && transX>= 0){
        transX = transX + 0.01;
      }
      else if (transX <=0){
        transX = 0;1
        left = 0;
      }
      if (left == 1 && transX<=1.5){
        transX = transX - 0.01;
      }
      else if (transX>=1.5){
        transX = 1.5;
        left = 1;
      }

      mylogo(transX,transY);
    }
  }
  lastTime = timeNow;
}

/**
 * The fuction is to load my own logo animation.
*/

function mylogo(transX,transY){
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  const fm = 100;
  var num = 72;     // number of vertex
  var logo = [
    // logo
    // top orange bar
      -8.0/fm,12.0/fm,0.0,
      -8.0/fm,7.0/fm,0.0,
      8.0/fm,12.0/fm,0.0,
      -8.0/fm,7.0/fm,0.0,
      8.0/fm,12.0/fm,0.0,
      8.0/fm,7.0/fm,0.0,
      // body
      -4.5/fm,7.0/fm,0.0,
      -4.5/fm,-7.0/fm,0.0,
      4.5/fm,7.0/fm,0.0,
      -4.5/fm,-7.0/fm,0.0,
      4.5/fm,7.0/fm,0.0,
      4.5/fm,-7.0/fm,0.0,
      // bottom orange bar
      -8.0/fm,-7.0/fm,0.0,
      -8.0/fm,-12.0/fm,0.0,
      8.0/fm,-7.0/fm,0.0,
      -8.0/fm,-12.0/fm,0.0,
      8.0/fm,-7.0/fm,0.0,
      8.0/fm,-12.0/fm,0.0,

    //  board
      -0.55,2.4,0.0,
      0.55,2.4,0.0,
      0.55,3.0,0.0,
      0.55,3,0.0,
      -0.55,2.4,0.0,
      -0.55,3.0,0.0,

    // head
      -0.1,0.1,0.0,
      0.1,0.1,0.0,
      0.1,0.3,0.0,
      -0.1,0.1,0.0,
      0.1,0.3,0.0,
      -0.1,0.3,0.3,

    // body
      -0.05,0.1,0.0,
      0.05,0.1,0.0,
      0.05,-0.6,0.0,
      -0.05,0.1,0.0,
      0.05,-0.6,0.0,
      -0.05,-0.6,0.0,

    // left arm
      -0.05, -0.1,0.0,
      -0.05,-0.19,0.0,
      -0.3,-0.19,0.0,
      -0.05,-0.1,0.0,
      -0.3,-0.19,0.0,
      -0.3,-0.1,0.0,

      -0.3,-0.19,0.0,
      -0.39,-0.19,0.0,
      -0.39,0.4,0.0,
      -0.3,-0.19,0.0,
      -0.39,0.4,0.0,
      -0.3,0.4,0.0,
    // right arm
      0.05, -0.1,0.0,
      0.05,-0.19,0.0,
      0.3,-0.19,0.0,
      0.05,-0.1,0.0,
      0.3,-0.19,0.0,
      0.3,-0.1,0.0,

      0.3,-0.19,0.0,
      0.39,-0.19,0.0,
      0.39,0.4,0.0,
      0.3,-0.19,0.0,
      0.39,0.4,0.0,
      0.3,0.4,0.0,

    // left leg
      -0.05,-0.45,0.0,
      -0.05,-0.6,0.0,
      -0.25,-0.9,0.0,
      -0.05,-0.6,0.0,
      -0.25,-0.9,0.0,
      -0.15,-0.9,0.0,

    // right leg
      0.05,-0.45,0.0,
      0.05,-0.6,0.0,
      0.25,-0.9,0.0,
      0.05,-0.6,0.0,
      0.25,-0.9,0.0,
      0.15,-0.9,0.0

  ];
  // move the I logo to the center of board
  for (var k=0; k<18*3; k=k+3){
    logo[k+1] = logo[k+1]+2.7;
  }
  // move whole person to lower left corner
  for (var j=0; j<num*3; j=j+3){
    logo[j] = logo[j]-1.9;
    logo[j+1] = logo[j+1]-0.8;
  }
  // drop off the board
  for (var x=0; x<24*3; x=x+3){
    logo[x+1] = logo[x+1]+transY;
  }
  // let the person walk
  for (var i=0;i<num*3;i=i+3){
    logo[i] = 2/5*logo[i];
    logo[i+1] = 2/5*logo[i+1];
    logo[i] = logo[i]+transX;
  }
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(logo), gl.DYNAMIC_DRAW);
  vertexPositionBuffer.itemSize = 3;
  vertexPositionBuffer.numberOfItems = num;


  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  const r1 = 150/255;
  const g1 = 10/255;
  const b1 = 150/255;
  const r2 = 230/255;
  const g2 = 90/255;
  const b2 = 50/255;
  const r3 = 230/255;
  const g3 = 150/255;
  const b3 = 250/255;
  const rb = 48/255;
  const gb = 68/255;
  const bb = 109/255;
  const a = 1.0;
  var logocolor = [
  // logo
    r2,g2,b2,a,
    r2,g2,b2,a,
    r2,g2,b2,a,
    r2,g2,b2,a,
    r2,g2,b2,a,
    r2,g2,b2,a,

    r2,g2,b2,a,
    r2,g2,b2,a,
    r2,g2,b2,a,
    r2,g2,b2,a,
    r2,g2,b2,a,
    r2,g2,b2,a,

    r2,g2,b2,a,
    r2,g2,b2,a,
    r2,g2,b2,a,
    r2,g2,b2,a,
    r2,g2,b2,a,
    r2,g2,b2,a,

  //board
    rb,gb,bb,a,
    rb,gb,bb,a,
    rb,gb,bb,a,
    rb,gb,bb,a,
    rb,gb,bb,a,
    rb,gb,bb,a,

  // head
    r2,g2,b2,a,
    r2,g2,b2,a,
    r2,g2,b2,a,
    r2,g2,b2,a,
    r2,g2,b2,a,
    r2,g2,b2,a,

  //body
    r3,g3,b3,a,
    r3,g3,b3,a,
    r3,g3,b3,a,
    r3,g3,b3,a,
    r3,g3,b3,a,
    r3,g3,b3,a,

  //left arm
    r1,g1,b1,a,
    r1,g1,b1,a,
    r1,g1,b1,a,
    r1,g1,b1,a,
    r1,g1,b1,a,
    r1,g1,b1,a,

    r1,g1,b1,a,
    r1,g1,b1,a,
    r1,g1,b1,a,
    r1,g1,b1,a,
    r1,g1,b1,a,
    r1,g1,b1,a,

  // right arm
    r1,g1,b1,a,
    r1,g1,b1,a,
    r1,g1,b1,a,
    r1,g1,b1,a,
    r1,g1,b1,a,
    r1,g1,b1,a,

    r1,g1,b1,a,
    r1,g1,b1,a,
    r1,g1,b1,a,
    r1,g1,b1,a,
    r1,g1,b1,a,
    r1,g1,b1,a,

  // left leg
    r2,g2,b2,a,
    r2,g2,b2,a,
    r2,g2,b2,a,
    r2,g2,b2,a,
    r2,g2,b2,a,
    r2,g2,b2,a,
  // right leg
    r2,g2,b2,a,
    r2,g2,b2,a,
    r2,g2,b2,a,
    r2,g2,b2,a,
    r2,g2,b2,a,
    r2,g2,b2,a
  ];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(logocolor), gl.STATIC_DRAW);
  vertexColorBuffer.itemSize = 4;
  vertexColorBuffer.numItems = num;
}


/**
 * Get the value of radio button.
*/

function getvalue(){
  var obj = document.getElementsByName("logo")
  for (var i = 0; i < obj.length; i++){
    if (obj[i].checked){
      status = obj[i].value;
      console.log(status);
    }
  }
}


/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  tick();

}

/**
 * Tick called for every animation frame.
 */
function tick() {
    requestAnimFrame(tick);
    getvalue();
    draw();
    animate();

}
