/**
 * vrhtml.js
 * version 0.1
 *
 vrhtml.js is a library to render regular HTML pages in 3D for the Oculus Rift or other VR (Virtual Reality) glasses.
 It depends on three.js and associated libraries: TrackballControls.js and CSS3DRenderer.

 For getting orientation information from the Oculus Rift in the browser, I recommend the npvr browser plugin at
 https://github.com/benvanik/vr.js
 
 If you are just interested in rendering VR 3D with top performance, then you should probably skip this and use the existing OculusRiftEffect.js and an OpenGL renderer.
 The reason for this library is if you want to render actual HTML DOM in 3D including support for forms, etc.

 * Rev 7 - Save InterEye distance.
 * Rev 6 - Integrate with NPVR Head Tracking.
 * Rev 5 - Rendering a world that is already in 3D.
 * Rev 4 - Rendering a world twice, cleanly.
 * Rev 3 - Setting eye separation with O and P keys.
 *
 * Main problems:
 * - VR rotation tracking should be relative - so view can always start out normal, regardless of head orientation, and so that
 * - Mouse and VR head tracking can be used together.
 * - Its a shame that the eye masks make it so that some visuals on far left and right are cut off.

 *
 * @author Christopher Zimmermann <topher@dandelion.org>
 * @license Apache 2.0
 * @module vrhtml
 */

(function (global) {


    /**
     * @namespace vr
     * @alias module vrhtml
     */
    var vrhtml = {};

    this.cameraLeft = {};
    this.cameraRight = {};
//, scene, renderer;
    this.sceneleft = {};
    this.sceneRight = {};
    this.rendererLeft = {};
    this.rendererRight = {};
    this.controlsLeftTrackBall = {};
    this.controlsRightTrackBall;
    this.sceneWidth = 0;
    this.time = Date.now();

    this.camEyeDistance = 0;
    this.camX = 0;
    this.camY = 0;
    this.camZ = 0;

    this.vrstate = {};

// Handle inter-ocular separation
    this.eyeSeparationPx = 0;
    this.AMOUNT_TO_CHANGE = 2;
    this.DEFAULT_EYE_SEPARATION = 44; //Decent default for standard 1200x800 resolution.


    /*********************************************************************************************/
    /**
     * This could eventually work as a plugin.
     */
    vrhtml.buildSceneFromDiv = function (elDiv, scene) {
        var elNew = elDiv.cloneNode(true);
        var object = new THREE.CSS3DObject(elNew);
        scene.add(object);
        return object;
    }
    vrhtml.buildScenesFromHTML = function (idOfHtml) {
        var elDiv = document.getElementById(idOfHtml);
        var objectLeft = vrhtml.buildSceneFromDiv(elDiv, sceneLeft);
        var objectRight = vrhtml.buildSceneFromDiv(elDiv, sceneRight);
        return [objectLeft, objectRight];
    }




    vrhtml.initControl = function (control) {
        control.rotateSpeed = 1.0;
        control.zoomSpeed = 1.2;
        control.panSpeed = 0.8;
        control.noZoom = false;
        control.noPan = false;
        control.staticMoving = false;
        control.dynamicDampingFactor = 0.3;
        control.keys = [ 65, 83, 68 ];
    }
    /**
     * Both eye renderers will move in sync as both camera controls are responding to the same mouse events.
     */
    vrhtml.initControlsTrackball = function () {
        controlsLeftTrackBall = new THREE.TrackballControls(cameraLeft, document.getElementById("meta-panel"));
        vrhtml.initControl(controlsLeftTrackBall);
        controlsRightTrackBall = new THREE.TrackballControls(cameraRight, document.getElementById("meta-panel"));
        vrhtml.initControl(controlsRightTrackBall);
    }

    vrhtml.initCams = function () {
        camEyeDistance = 5;
        camX = 0;
        camY = 0;
        camZ = 350;

        sceneWidth = window.innerWidth / 2;
        cameraLeft = new THREE.PerspectiveCamera(75, sceneWidth / window.innerHeight, 1, 1000);
        cameraLeft.position.set(camX - camEyeDistance, camY, camZ);
        cameraRight = new THREE.PerspectiveCamera(75, sceneWidth / window.innerHeight, 1, 1000);
        cameraRight.position.set(camX + camEyeDistance, camY, camZ);
    }
    /*
     // Would enable interactive changing perspective.
     function updateCams(){
     cameraLeft.position.set( x - eyeDistance, y, z );
     cameraRight.position.set( x + eyeDistance, y, z );
     }
     */

    vrhtml.initRenderer = function (renderer) {
        renderer.setSize(sceneWidth, window.innerHeight);
        renderer.domElement.className = 'renderer';
    }

    vrhtml.initRenderers = function () {
        rendererLeft = new THREE.CSS3DRenderer();
        vrhtml.initRenderer(rendererLeft);
        rendererLeft.domElement.style.left = 0;
        rendererLeft.domElement.id = "renderer-left";
        document.getElementById("eye-mask-left").appendChild(rendererLeft.domElement);

        rendererRight = new THREE.CSS3DRenderer();
        vrhtml.initRenderer(rendererRight);
        rendererRight.domElement.style.right = 0;
        rendererRight.domElement.id = "renderer-right";
        document.getElementById("eye-mask-right").appendChild(rendererRight.domElement);
    }


    /**
     * Set left and right values. Works but bad for overlap.
     * Right item cannot have left set to 50%. Must be unset.
     * @param amount
     */

    vrhtml.changeEyeSeparation = function (amount) {
        eyeSeparationPx += amount;
        helpersVR.setCookie("eyeSeparation", eyeSeparationPx, 365);
        rendererLeft.domElement.style.left = eyeSeparationPx + "px";
        rendererRight.domElement.style.right = eyeSeparationPx + "px";
        helpersVR.trace("EyeSeparation:" + eyeSeparationPx);
    }

    vrhtml.keydown = function (event) {

        var key = event.keyCode || event.which;
        var keychar = String.fromCharCode(key);
        //window.removeEventListener( 'keydown', keydown );
        if (keychar === "O") {

            vrhtml.changeEyeSeparation(AMOUNT_TO_CHANGE);

        } else if (keychar === "P") {

            vrhtml.changeEyeSeparation(-AMOUNT_TO_CHANGE);
        }
    }


    vrhtml.initKeyboardShortcuts = function () {
        window.addEventListener('keydown', vrhtml.keydown, false);
    }


    vrhtml.initEyeSeparation = function () {
        cookieSep = helpersVR.getCookie("eyeSeparation");
        if (cookieSep == "") {
            eyeSeparationPx = DEFAULT_EYE_SEPARATION;
        } else {
            eyeSeparationPx = cookieSep;
        }
        vrhtml.changeEyeSeparation(0);
    }


    vrhtml.init = function (idOfHtml) {

        // Head tracking.
        vrstate = new vr.State();

        sceneLeft = new THREE.Scene();
        sceneRight = new THREE.Scene();

        vrhtml.initCams();

        vrhtml.initControlsTrackball();

        var scene = "html";
        if (scene == "randomRects") {
            vrSceneRandomRects.initScenesRandomRects();
        } else if (scene == "html") {
            vrhtml.buildScenesFromHTML(idOfHtml);
            document.getElementById("htmlModelPrototype").style.display = "none";
        }

        vrhtml.initRenderers();

        vrhtml.initKeyboardShortcuts();

        vrhtml.initEyeSeparation();

        helpersVR.trace("Trace Panel: Init complete.");
    }

    vrhtml.animateDisable = function () {

        requestAnimationFrame(animate);

        controlsLeftTrackBall.update();
        controlsRightTrackBall.update();

        //renderer.render( scene, camera );
        rendererLeft.render(sceneLeft, cameraLeft);
        rendererRight.render(sceneRight, cameraRight);

    }


    vrhtml.animate = function () {
        //Loop!
        vr.requestAnimationFrame(vrhtml.animate);

        // Poll VR, if it's ready.
        var polled = vr.pollState(vrstate);

        // Rotate by Oculus data.
        if (vrstate) {
            cameraLeft.quaternion.x = vrstate.hmd.rotation[0];
            cameraLeft.quaternion.y = vrstate.hmd.rotation[1];
            cameraLeft.quaternion.z = vrstate.hmd.rotation[2];
            cameraLeft.quaternion.w = vrstate.hmd.rotation[3];

            cameraRight.quaternion.x = vrstate.hmd.rotation[0];
            cameraRight.quaternion.y = vrstate.hmd.rotation[1];
            cameraRight.quaternion.z = vrstate.hmd.rotation[2];
            cameraRight.quaternion.w = vrstate.hmd.rotation[3];

        }
        if (document.getElementById("controlModeMouse").checked) {
            controlsLeftTrackBall.update();
            controlsRightTrackBall.update();
        }

        rendererLeft.render(sceneLeft, cameraLeft);
        rendererRight.render(sceneRight, cameraRight);

        time = Date.now();
    }


    vrhtml.startWithoutNPVR = function (idOfHtml) {
        this.state = new vr.State();
        vrhtml.init(idOfHtml);
        vrhtml.animate();
    }

    vrhtml.start = function (idOfHtml) {
        vr.load(function (error) {
            if (error) {
                helpersVR.trace('Did you install the required NPVR browser extension? NPVR Plugin error:\n' + error.toString());
                alert('Did you install the required NPVR browser extension? NPVR Plugin error:\n' + error.toString());
            }
            vrhtml.startWithoutNPVR(idOfHtml);
        });
    }


    /**
     * @global
     * @alias module vrhtml
     */
    global.vrhtml = vrhtml;

})(window);


// Module to build a VR Scene.
(function (global) {
    var vrSceneRandomRects = {};
    this.SCENE_OBJECT_MAX_COORD = 400;
    ;

    vrSceneRandomRects.populateSpecs = function (sceneObjects) {

        for (var i = 0; i < 10; i++) {
            var specs = {};
            specs.color = Math.random() * 0xffffff;
            specs.x = Math.random() * SCENE_OBJECT_MAX_COORD - 100;
            specs.y = Math.random() * SCENE_OBJECT_MAX_COORD - 100;
            specs.z = Math.random() * SCENE_OBJECT_MAX_COORD - 100;
            specs.scalex = Math.random() + 0.5;
            specs.scaley = Math.random() + 0.5;
            sceneObjects[i] = specs;
        }
    }

    vrSceneRandomRects.buildSceneFromArray = function (sceneObjects, scene) {
        for (var i = 0; i < sceneObjects.length; i++) {
            var specs = sceneObjects[i];
            var element = document.createElement('div');
            element.style.width = '100px';
            element.style.height = '100px';
            element.style.background = new THREE.Color(specs.color).getStyle();
            element.innerHTML = "Yo dawg!";

            var object = new THREE.CSS3DObject(element);
            object.position.x = specs.x;
            object.position.y = specs.y;
            object.position.z = specs.z;
            object.scale.x = specs.scalex;
            object.scale.y = specs.scaley;
            scene.add(object);
        }
    }

    vrSceneRandomRects.initScenesRandomRects = function () {
        var specs = new Array();
        vrSceneRandomRects.populateSpecs(specs);
        // Just working here to get same scene built twice.
        vrSceneRandomRects.buildSceneFromArray(specs, sceneLeft);
        vrSceneRandomRects.buildSceneFromArray(specs, sceneRight);
    }
    /**
     * @global
     * @alias module vrhtml
     */
    global.vrSceneRandomRects = vrSceneRandomRects;

})(window);


// HELPERS
(function (global) {
    var helpersVR = {};

    /* Note that cookies are not saved on locally run files in Chrome. */
    helpersVR.setCookie = function (cname, cvalue, exdays) {
        var d = new Date();
        d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
        var expires = "expires=" + d.toGMTString();
        document.cookie = cname + "=" + cvalue + "; " + expires;
    }

    helpersVR.getCookie = function (cname) {
        var name = cname + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i].trim();
            if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
        }
        return "";
    }

    helpersVR.checkCookie = function () {
        var user = getCookie("username");
        if (user != "") {
            alert("Welcome again " + user);
        } else {
            user = prompt("Please enter your name:", "");
            if (user != "" && user != null) {
                setCookie("username", user, 365);
            }
        }
    }

    helpersVR.parseCssValue = function (css) {
        if (css == "") {
            return 0;
        } else {
            return parseInt(css);
        }
    }

    this.traceCount = 1;
    helpersVR.trace = function (msg) {
        var traceEl = document.getElementById("trace");
        traceEl.innerHTML = traceCount + ". " + msg + "<br>\n" + traceEl.innerHTML;
        traceCount++;
    }

    /**
     * @global
     * @alias module vrhtml
     */
    global.helpersVR = helpersVR;

})(window);
