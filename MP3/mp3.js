
/**
 * @file A simple WebGL example for viewing meshes read from OBJ files
 * @author Yutong Xie <yutongx6@illinois.edu>
 */
 
/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global Shader Program for Teapot */
var shaderProgram;
/** @global Shader Program for Skybox */
var shaderProgram1;

/** @global The Modelview matrix */
var mvMatrix = mat4.create();
var mvMatrix1 = mat4.create();

/** @global The View matrix */
var vMatrix = mat4.create();
/** @global The Reflection matrix */
var rMatrix = mat4.create();

/** @global The Projection matrix */
var pMatrix = mat4.create();
var pMatrix1 = mat4.create();

/** @global The Normal matrix */
var nMatrix = mat3.create();
var nMatrix1 = mat3.create();

/** @global The matrix stack for hierarchical modeling */
var mvMatrixStack = [];

/** @global An object holding the geometry for a 3D mesh */
var myMesh;

/** @global Variable to store a cubemap */
var cubeMap;

/** @global Vector solely used for affine transformations */
var transformVec = vec3.create();


// View parameters
/** @global Location of the camera in world coordinates */
var eyePt = vec3.fromValues(0.0,0.0,0.8);
/** @global Direction of the view in world coordinates */
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
/** @global Up vector for view matrix creation, in world coordinates */
var up = vec3.fromValues(0.0,1.0,0.0);
/** @global Location of a point along viewDir in world coordinates */
var viewPt = vec3.fromValues(0.0,0.0,0.0);

// For rotation
/** @global Direction axis in which the teapot orbits */
var xAxis = vec3.fromValues(1.0,0.0,0.0);
var yAxis = vec3.fromValues(0.0,1.0,0.0);
var zAxis = vec3.fromValues(0.0,0.0,1.0);
/** @global A quaternion variable used for rotation */
var quaternion = quat.create();
var quaternionud = quat.create();

//Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = [1,1,1];
/** @global Ambient light color/intensity for Phong reflection */
var lAmbient = [0.1,0.2,0.3];
/** @global Diffuse light color/intensity for Phong reflection */
var lDiffuse = [1,1,1];
/** @global Specular light color/intensity for Phong reflection */
var lSpecular =[0.5,0.5,0.5];

//Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [1.0,1.0,1.0];
/** @global Diffuse material color/intensity for Phong reflection */
var kDiffuse = [170.0/255.0,20.0/255.0,210.0/255.0];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [1,1,1];
/** @global Shininess exponent for Phong reflection */
var shininess = 23;
/** @global Edge color fpr wireframeish rendering */
var kEdgeBlack = [0.0,0.0,0.0];
/** @global Edge color for wireframe rendering */
var kEdgeWhite = [1.0,1.0,1.0];

//Model parameters
var eulerY=0;

/** @global Buffer for cube vertices */
var cubeVertexBuffer0;
var cubeVertexBuffer1;
var cubeVertexBuffer2;
var cubeVertexBuffer3;
var cubeVertexBuffer4;
var cubeVertexBuffer5;

/** @global Buffer for cube faces */
var cubeFaceVertex0;
var cubeFaceVertex1;
var cubeFaceVertex2;
var cubeFaceVertex3;
var cubeFaceVertex4;
var cubeFaceVertex5;

/** @global Buffer for texture coordinates */
var texCoordBuffer0;
var texCoordBuffer1;
var texCoordBuffer2;
var texCoordBuffer3;
var texCoordBuffer4;
var texCoordBuffer5;

/** @global Indicate the render model for reflection */
var reflectiveOrNot=0.0;

/** @global Indicate the render model for refraction */
var refractionOrNot=0.0;


/** @global Angle for orbit the cube  */
var LeftRight=0;
var UpDown=0;

/** @global Angle for rotating the teapot  */
var TeapotLR = 0;
var TeapotUD = 0;

/** @global Angle changing for one key press  */
const angle = 5;
//-------------------------------------------------------------------------
/**
 * Asynchronously read a server-side text file
 */
function asyncGetFile(url) {
    console.log("Getting text file");
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.responseType = "text";
        xhr.onload = () => resolve(xhr.responseText);
        xhr.onerror = () => reject(xhr.statusText);
        xhr.send();
        console.log("Made promise");
    });
}

//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

function uploadModelViewMatrixToShader2() {
    gl.uniformMatrix4fv(shaderProgram1.mvMatrixUniform, false, mvMatrix1);
}

//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
}

function uploadProjectionMatrixToShader2() {
    gl.uniformMatrix4fv(shaderProgram1.pMatrixUniform, false, pMatrix1);
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

function uploadNormalMatrixToShader2() {
    mat3.fromMat4(nMatrix1,mvMatrix1);
    mat3.transpose(nMatrix1,nMatrix1);
    mat3.invert(nMatrix1,nMatrix1);
    gl.uniformMatrix3fv(shaderProgram1.nMatrixUniform, false, nMatrix1);
}

//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 */
function uploadReflectionMatrixToShader() {
    gl.uniformMatrix4fv(shaderProgram.rMatrixUniform, false, rMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}

function mvPushMatrix1() {
    var copy = mat4.clone(mvMatrix1);
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

function mvPopMatrix1() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix1 = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
    uploadReflectionMatrixToShader();
}

function setMatrixUniforms2() {
    uploadModelViewMatrixToShader2();
    uploadNormalMatrixToShader2();
    uploadProjectionMatrixToShader2();
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
 * Setup the fragment and vertex shaders for shaded TEAPOT
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
    shaderProgram.rMatrixUniform = gl.getUniformLocation(shaderProgram, "uRMatrix");
    shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");
    shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");
    shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
    shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
    shaderProgram.uniformShininessLoc = gl.getUniformLocation(shaderProgram, "uShininess");
    shaderProgram.uniformAmbientMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKAmbient");
    shaderProgram.uniformDiffuseMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKDiffuse");
    shaderProgram.uniformSpecularMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKSpecular");
    shaderProgram.uniformReflectionLoc = gl.getUniformLocation(shaderProgram, "uReflect");
    shaderProgram.uniformRefractionLoc = gl.getUniformLocation(shaderProgram, "uRefract");
    shaderProgram.cubeSampler = gl.getUniformLocation(shaderProgram, "uCubeSampler");
}

//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders for skybox
 */
function setupShaders1() {
    vertexShader = loadShaderFromDOM("shader-vs-sky");
    fragmentShader = loadShaderFromDOM("shader-fs-sky");

    shaderProgram1 = gl.createProgram();
    gl.attachShader(shaderProgram1, vertexShader);
    gl.attachShader(shaderProgram1, fragmentShader);
    gl.linkProgram(shaderProgram1);

    if (!gl.getProgramParameter(shaderProgram1, gl.LINK_STATUS)) {
        alert("Failed to setup shaders");
    }

    gl.useProgram(shaderProgram1);

    shaderProgram1.vertexPositionAttribute = gl.getAttribLocation(shaderProgram1, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram1.vertexPositionAttribute);

    shaderProgram1.vertexTexCoordAttribute = gl.getAttribLocation(shaderProgram1, "aTextureCoordinate");
    gl.enableVertexAttribArray(shaderProgram1.vertexTexCoordAttribute);

    shaderProgram1.mvMatrixUniform = gl.getUniformLocation(shaderProgram1, "uMVMatrix");
    shaderProgram1.pMatrixUniform = gl.getUniformLocation(shaderProgram1, "uPMatrix");
    shaderProgram1.nMatrixUniform = gl.getUniformLocation(shaderProgram1, "uNMatrix");
}


//-------------------------------------------------------------------------
/**
 * Sends material information to the shader
 * @param {Float32} alpha shininess coefficient
 * @param {Float32Array} a Ambient material color
 * @param {Float32Array} d Diffuse material color
 * @param {Float32Array} s Specular material color
 */
function setMaterialUniforms(alpha,a,d,s) {
    gl.uniform1f(shaderProgram.uniformShininessLoc, alpha);
    gl.uniform3fv(shaderProgram.uniformAmbientMaterialColorLoc, a);
    gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColorLoc, d);
    gl.uniform3fv(shaderProgram.uniformSpecularMaterialColorLoc, s);
}

//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function setLightUniforms(loc,a,d,s) {
    gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
    gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
    gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
    gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//----------------------------------------------------------------------------------
/**
 * Set the reflective mode
 */

function setReflectionUniforms(toggle) {
    gl.uniform1f(shaderProgram.uniformReflectionLoc, toggle);
}

//----------------------------------------------------------------------------------
/**
 * Set the refractive mode
 */

function setRefractionUniforms(toggle) {
    gl.uniform1f(shaderProgram.uniformRefractionLoc, toggle);
}
//----------------------------------------------------------------------------------
/**
 * Populate buffers with data of the TEAPOT image
 * @param {file} name of the file that contains data of the mesh
 */
function setupMesh(filename) {
    myMesh = new TriMesh();
    myPromise = asyncGetFile(filename);
    myPromise.then((retrievedText) => {
        myMesh.loadFromOBJ(retrievedText);
        console.log("Yay! got the file");
    })
    .catch(
        // Log the rejection reason
        (reason) => {
            console.log('Handle rejected promise ('+reason+') here.');
        });
}

//----------------------------------------------------------------------------------
/**
 * Creates textures for application to cube.
 */
function setupTextures() {
    texture0 = gl.createTexture();
    texture0.image = new Image();
    texture0.image.onload = function() { handleTextureLoaded(texture0); }
    texture0.image.src = "negx.jpg";

    texture1 = gl.createTexture();
    texture1.image = new Image();
    texture1.image.onload = function() { handleTextureLoaded(texture1); }
    texture1.image.src = "posx.jpg";
    texture2 = gl.createTexture();

    texture2.image = new Image();
    texture2.image.onload = function() { handleTextureLoaded(texture2); }
    texture2.image.src = "negy.jpg";

    texture3 = gl.createTexture();
    texture3.image = new Image();
    texture3.image.onload = function() { handleTextureLoaded(texture3); }
    texture3.image.src = "posy.jpg";

    texture4 = gl.createTexture();
    texture4.image = new Image();
    texture4.image.onload = function() { handleTextureLoaded(texture4); }
    texture4.image.src = "negz.jpg";

    texture5 = gl.createTexture();
    texture5.image = new Image();
    texture5.image.onload = function() { handleTextureLoaded(texture5); }
    texture5.image.src = "posz.jpg";
}


//----------------------------------------------------------------------------------
/**
 * Texture handling. Generates mipmap and sets texture parameters.
 * @param {Object} image Image for cube application
 * @param {Number} face Which face of the cubeMap to add texture to
 */
function handleTextureLoaded(texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

//----------------------------------------------------------------------------------
/**
 * Creates textures in cubemap for reflective teapot
 */
function setupCubemap() {
  cubeMap = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	handleCubeMap(gl.TEXTURE_CUBE_MAP_POSITIVE_X, cubeMap, "posx.jpg");
	handleCubeMap(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, cubeMap, "negx.jpg");
	handleCubeMap(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, cubeMap, "posy.jpg");
	handleCubeMap(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, cubeMap, "negy.jpg");
	handleCubeMap(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, cubeMap, "posz.jpg");
	handleCubeMap(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, cubeMap, "negz.jpg");
}

//----------------------------------------------------------------------------------
/**
 * handle the texture for each face
 * @param {Object} target Position of cubemap
 * @param {texture} texture texture for cube face
 * @param {image} url the image for cube face
 */
function handleCubeMap(target, texture, url){
	var image = new Image();
	image.onload = function()
	{
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
		gl.texImage2D(target,0,gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
   }
   image.src = url;
}


//----------------------------------------------------------------------------------
/**
 * load the vertex position buffer
 */
function loadVertices() {
  cubeVertexBuffer0 = gl.createBuffer();
  cubeVertexBuffer1 = gl.createBuffer();
  cubeVertexBuffer2 = gl.createBuffer();
  cubeVertexBuffer3 = gl.createBuffer();
  cubeVertexBuffer4 = gl.createBuffer();
  cubeVertexBuffer5 = gl.createBuffer();
  var vright = [
     0.5, -0.5, -0.5,
     0.5,  0.5, -0.5,
     0.5,  0.5,  0.5,
     0.5, -0.5,  0.5
  ];
  var vleft = [
    -0.5, -0.5, -0.5,
    -0.5, -0.5,  0.5,
    -0.5,  0.5,  0.5,
    -0.5,  0.5, -0.5
  ];

  var vfront = [
    -0.5, -0.5,  0.5,
     0.5, -0.5,  0.5,
     0.5,  0.5,  0.5,
    -0.5,  0.5,  0.5
  ];

  var vback = [
    -0.5, -0.5, -0.5,
    -0.5,  0.5, -0.5,
     0.5,  0.5, -0.5,
     0.5, -0.5, -0.5
];
  var vbottom = [
    -0.5, -0.5, -0.5,
     0.5, -0.5, -0.5,
     0.5, -0.5,  0.5,
    -0.5, -0.5,  0.5,
  ];
  var vtop = [
    -0.5,  0.5, -0.5,
    -0.5,  0.5,  0.5,
     0.5,  0.5,  0.5,
     0.5,  0.5, -0.5
];

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer0);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vleft), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer1);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vright), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer2);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vbottom), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer3);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vtop), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer4);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vback), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer5);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vfront), gl.STATIC_DRAW);

}

//----------------------------------------------------------------------------------
/**
 * load the textcoord buffers
 */
function loadTexCoords(){

  texCoordBuffer0 = gl.createBuffer();
  texCoordBuffer1 = gl.createBuffer();
  texCoordBuffer2 = gl.createBuffer();
  texCoordBuffer3 = gl.createBuffer();
  texCoordBuffer4 = gl.createBuffer();
  texCoordBuffer5 = gl.createBuffer();

  var textcoord = [

    0.0, 0.0,
    0.0, 1.0,
    1.0, 1.0,
    1.0, 0.0
  ];

  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer0);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textcoord), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer1);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textcoord), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer2);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textcoord), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer3);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textcoord), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer4);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textcoord), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer5);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textcoord), gl.STATIC_DRAW);
}


//----------------------------------------------------------------------------------
/**
 * Load the face vertex buffer
 */

function loadFaces(){
  cubeFaceVertex0 = gl.createBuffer();
  cubeFaceVertex1 = gl.createBuffer();
  cubeFaceVertex2 = gl.createBuffer();
  cubeFaceVertex3 = gl.createBuffer();
  cubeFaceVertex4 = gl.createBuffer();
  cubeFaceVertex5 = gl.createBuffer();

  var facevertex = [
    0,  1,  2,
    0,  2,  3
 ];


  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeFaceVertex0);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(facevertex), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeFaceVertex1);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(facevertex), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeFaceVertex2);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(facevertex), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeFaceVertex3);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(facevertex), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeFaceVertex4);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(facevertex), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeFaceVertex5);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(facevertex), gl.STATIC_DRAW);

}


//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() {
    //console.log("function draw()")
    if(myMesh.loaded()) {
      gl.useProgram(shaderProgram);

      gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // We'll use perspective
      mat4.perspective(pMatrix,degToRad(45),
                       gl.viewportWidth / gl.viewportHeight,
                       0.1, 200.0);
      mat4.identity(rMatrix);

      // We want to look down -z, so create a lookat point in that direction
      vec3.add(viewPt, eyePt, viewDir);

      // Then generate the lookat matrix and initialize the view matrix to that view
      mat4.lookAt(mvMatrix,eyePt,viewPt,up);

      if (document.getElementById("reflection").checked){
        reflectiveOrNot = 1.0;
        refractionOrNot = 0.0;
        setReflectionUniforms(reflectiveOrNot);
        setRefractionUniforms(refractionOrNot);

        console.log("Reflection is displayed.");
      }
      if (document.getElementById("refraction").checked){
        reflectiveOrNot = 0.0;
        refractionOrNot = 1.0;
        setReflectionUniforms(reflectiveOrNot);
        setRefractionUniforms(refractionOrNot);
        console.log("Refraction is displayed.");
      }
      if (document.getElementById("shaded").checked){
        reflectiveOrNot = 0.0;
        refractionOrNot = 0.0;
        setReflectionUniforms(reflectiveOrNot);
        setRefractionUniforms(refractionOrNot);
        console.log("Blinn-Phong shading is displayed");
      }
      mvPushMatrix();
      mat4.rotateY(rMatrix, rMatrix, degToRad(LeftRight));
      mat4.rotateX(rMatrix, rMatrix, degToRad(UpDown));


      mat4.rotateY(mvMatrix,mvMatrix, degToRad(TeapotLR));
      mat4.rotateX(mvMatrix,mvMatrix, degToRad(TeapotUD));


      vec3.set(transformVec, 0.0, -0.1, 0.0);
      mat4.translate(mvMatrix, mvMatrix, transformVec);
      vec3.set(transformVec, 0.08, 0.08, 0.08);
      mat4.scale(mvMatrix, mvMatrix, transformVec);

      setMatrixUniforms();

      setLightUniforms(lightPosition,lAmbient,lDiffuse,lSpecular);
      setMaterialUniforms(shininess,kAmbient,kDiffuse,kSpecular);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
      gl.uniform1i(shaderProgram.cubeSampler, 1);
      myMesh.drawTriangles();
      mvPopMatrix();
    }
}

//----------------------------------------------------------------------------------
/**
 * Draw call that renders environment using skybox
 */
function drawSkybox() {
    //console.log("function drawSkybox()")
    gl.useProgram(shaderProgram1);

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

    // set cube's perspective
    mat4.perspective(pMatrix1,degToRad(90),
                     gl.viewportWidth / gl.viewportHeight,
                     0.1, 200.0);

    // We want to look down -z, so create a lookat point in that direction
    vec3.add(viewPt, eyePt, viewDir);

    // Then generate the lookat matrix and initialize the view matrix to that view
    mat4.lookAt(mvMatrix1,eyePt,viewPt,up);


    mat4.rotateY(mvMatrix1,mvMatrix1, degToRad(-LeftRight));
    mat4.rotateX(mvMatrix1,mvMatrix1, degToRad(-UpDown));

    vec3.set(transformVec, 10.0, 10.0, 10.0);
    mat4.scale(mvMatrix1, mvMatrix1, transformVec);


    mvPushMatrix1();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer0);
    gl.vertexAttribPointer(shaderProgram1.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer0);
    gl.vertexAttribPointer(shaderProgram1.vertexTexCoordAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture0);
    gl.uniform1i(gl.getUniformLocation(shaderProgram1, "texsample"), 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeFaceVertex0);
    mat4.rotateX(mvMatrix1, mvMatrix1, degToRad(90));
    setMatrixUniforms2();
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix1();

    mvPushMatrix1();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer1);
    gl.vertexAttribPointer(shaderProgram1.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer1);
    gl.vertexAttribPointer(shaderProgram1.vertexTexCoordAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture1);
    gl.uniform1i(gl.getUniformLocation(shaderProgram1, "texsample"), 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeFaceVertex1);
    mat4.rotateX(mvMatrix1, mvMatrix1, degToRad(180));
    setMatrixUniforms2();
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix1();

    mvPushMatrix1();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer2);
    gl.vertexAttribPointer(shaderProgram1.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer2);
    gl.vertexAttribPointer(shaderProgram1.vertexTexCoordAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture2);
    gl.uniform1i(gl.getUniformLocation(shaderProgram1, "texsample"), 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeFaceVertex2);
    mat4.rotateY(mvMatrix1, mvMatrix1, degToRad(90));
    setMatrixUniforms2();
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix1();

    mvPushMatrix1();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture3);
    gl.uniform1i(gl.getUniformLocation(shaderProgram1, "texsample"), 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer3);
    gl.vertexAttribPointer(shaderProgram1.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer3);
    gl.vertexAttribPointer(shaderProgram1.vertexTexCoordAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeFaceVertex3);
    setMatrixUniforms2();
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix1();

    mvPushMatrix1();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer4);
    gl.vertexAttribPointer(shaderProgram1.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer4);
    gl.vertexAttribPointer(shaderProgram1.vertexTexCoordAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture4);
    gl.uniform1i(gl.getUniformLocation(shaderProgram1, "texsample"), 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeFaceVertex4);
    mat4.rotateZ(mvMatrix1, mvMatrix1, degToRad(180));
    setMatrixUniforms2();
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix1();

    mvPushMatrix1();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer5);
    gl.vertexAttribPointer(shaderProgram1.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer5);
    gl.vertexAttribPointer(shaderProgram1.vertexTexCoordAttribute, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture5);
    gl.uniform1i(gl.getUniformLocation(shaderProgram1, "texsample"), 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeFaceVertex5);
    mat4.rotateZ(mvMatrix1, mvMatrix1, degToRad(-90));
    setMatrixUniforms2();
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix1();
}

/**
 * Press arrow keys or WASD keys to rotate the cube or teapot
 */
function handleKeyDown(event)
{

    // left arrow to rotate teapot
    if(event.keyCode =="37"){
        TeapotLR+=angle;
    }
    // right arrow to rotate teapot
    if(event.keyCode =="39"){
        TeapotLR-=angle;
    }
    // up arrow to rotate teapot
    if(event.keyCode =="38"){
        TeapotUD-=angle;
    }
    // down arrow to rotate teapot
    if(event.keyCode =="40"){
        TeapotUD+=angle;
    }
    // a key to orbit the cube
    if(event.keyCode =="65"){
        LeftRight+=angle;
    }
    // d key to orbit the cube
    if(event.keyCode =="68"){
        LeftRight-=angle;
    }
    // w key to orbit the cube
    if(event.keyCode =="87"){
        UpDown+=angle;
    }
    // s key to orbit the cube
    if(event.keyCode =="83"){
        UpDown-=angle;
    }
}

//----------------------------------------------------------------------------------
/**
 * Startup function called from html code to start program.
 */
 function startup() {
     canvas = document.getElementById("myGLCanvas");
     window.addEventListener('keydown', handleKeyDown, false);
     gl = createGLContext(canvas);
     setupShaders();
     setupShaders1();
     setupTextures();
     setupCubemap();
     loadVertices();
     loadFaces();
     loadTexCoords();
     setupMesh("teapot_0.obj");
     gl.clearColor(0.0, 0.0, 0.0, 0.0);
     gl.enable(gl.DEPTH_TEST);
     tick();
}

//----------------------------------------------------------------------------------
/**
 * Keep drawing frames...
 */
function tick() {
    requestAnimFrame(tick);
    draw();
    drawSkybox();
}
