import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.121.1/build/three.module.js';
import {PointerLockControls} from 'https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/loaders/GLTFLoader.js';

var camera, scene, renderer, controls;
var raycaster;

var basketball;
var ballVelocityX = 0, ballVelocityY = 0, ballVelocityZ = 0 ;
var launchVelocity = 0;
var acceleration = -0.1;

var collidableMeshList = [];
var basketballCollision = [];

var previousInfoGrabbing;
var shotsMade = 0;
var shotAlreadyMadeDown = false;
var shotsInRow = 0;
var shotsMax = 0;

var raycasterMouse = new THREE.Raycaster();
var mouseVector = new THREE.Vector2(0, 0);
var lookAtBall = false;
var grabBall = false;
var ballHitGround = true;

var personTriggerCame;

var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;

var mouseClickLast;

var prevTime = performance.now();
var velocity = new THREE.Vector3();
var direction = new THREE.Vector3();

init();
animate();

function init() {
    //Camera
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    camera.position.y = 10;

    //Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xffffff );
    scene.fog = new THREE.Fog( 0x999999, 0, 250 );

    //Light Global
    var light = new THREE.AmbientLight( 0xdddddd, 0.75 ); // soft white light
    scene.add( light );

    //Direct Light Global Shadow
    var directionalLight = new THREE.DirectionalLight( 0xffffff, 1);
    directionalLight.position.set( 100, 400, 200 );
    directionalLight.scale.set(100, 100, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048; 
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0;
    directionalLight.shadow.camera.far = 5000;
    directionalLight.shadow.radius = 10;
    directionalLight.target.position.set( 0, 0, 0 );
    directionalLight.shadow.camera.zoom = 1;
    const d = 100;
    directionalLight.shadow.camera.left = - d;
    directionalLight.shadow.camera.right = d;
    directionalLight.shadow.camera.top = d;
    directionalLight.shadow.camera.bottom = - d;
    var helper = new THREE.CameraHelper( directionalLight.shadow.camera );
    scene.add( helper );
    scene.add( directionalLight );  

    //Pointer Lock
    controls = new PointerLockControls( camera, document.body );

    //HTML ID 
    var blocker = document.getElementById( 'blocker' );
    var instructions = document.getElementById( 'instructions' );
    var crosshair = document.getElementById('cursor');

    //event listeners
    instructions.addEventListener( 'click', (event) => {
        controls.lock();
        crosshair.style.display = "none";
        mouseClickLast = {
            x: event.clientX,
            y: event.clientY
        }
    }, false );

    controls.addEventListener( 'lock', () => {
        instructions.style.display = 'none';
        blocker.style.display = 'none';
        crosshair.style.display = '';
    } );

    controls.addEventListener( 'unlock', () => {
        blocker.style.display = 'block';
        instructions.style.display = '';
        crosshair.style.display = "none";
    } );

    scene.add( controls.getObject() );

    var onKeyDown = (event) => {
        switch ( event.keyCode ) {
            case 38: // up
            case 87: // w
                moveForward = true;
                break;
            case 37: // left
            case 65: // a
                moveLeft = true;
                break;
            case 40: // down
            case 83: // s
                moveBackward = true;
                break;
            case 39: // right
            case 68: // d
                moveRight = true;
                break;
            case 32: // space
                break;
        }
    };
    var onKeyUp = (event) => {
        switch ( event.keyCode ) {
            case 38: // up
            case 87: // w
                moveForward = false;
                break;
            case 37: // left
            case 65: // a
                moveLeft = false;
                break;
            case 40: // down
            case 83: // s
                moveBackward = false;
                break;
            case 39: // right
            case 68: // d
                moveRight = false;
                break;
            case 90: //z
                console.log(basketball);
                break;
        }
    };

    //event listeners
    document.addEventListener( 'keydown', onKeyDown, false );
    document.addEventListener( 'keyup', onKeyUp, false );
    
    var onMouseDown = (event) => {
        if(event.button == 0 && lookAtBall){
            grabBall = true;
            previousInfoGrabbing = {
                basketballPrevious: {
                    position: {
                        x: basketball.position.x,
                        y: basketball.position.y,
                        z: basketball.position.z,
                    },
                    distance: threeDistance(camera.position.x, camera.position.y, camera.position.z, basketball.position.x, basketball.position.y, basketball.position.z),
                },
                cameraPrevious: {
                    position: {
                        x: camera.position.x,
                        y: camera.position.y,
                        z: camera.position.z,
                    },
                    direction: {
                        looking: camera.getWorldDirection(),
                    }
                }
            }
            scene.remove(basketball);
            basketball.position.set(0, 0, -1 * previousInfoGrabbing.basketballPrevious.distance);
            camera.add(basketball);
        }
    }
    var onMouseUp = (event) => {
        if(event.button == 0 && lookAtBall){
            basketball.position.set(
                grabDisplacementCoord( rotationDisplacementAxis(previousInfoGrabbing.basketballPrevious.distance, camera.getWorldDirection().x, previousInfoGrabbing.cameraPrevious.direction.looking.x), previousInfoGrabbing.basketballPrevious.position.x, camera.position.x, previousInfoGrabbing.cameraPrevious.position.x),
                grabDisplacementCoord( rotationDisplacementAxis(previousInfoGrabbing.basketballPrevious.distance, camera.getWorldDirection().y, previousInfoGrabbing.cameraPrevious.direction.looking.y), previousInfoGrabbing.basketballPrevious.position.y, camera.position.y, previousInfoGrabbing.cameraPrevious.position.y),
                grabDisplacementCoord( rotationDisplacementAxis(previousInfoGrabbing.basketballPrevious.distance, camera.getWorldDirection().z, previousInfoGrabbing.cameraPrevious.direction.looking.z), previousInfoGrabbing.basketballPrevious.position.z, camera.position.z, previousInfoGrabbing.cameraPrevious.position.z),
                );
            camera.remove(basketball);
            scene.add(basketball);
            grabBall = false;
            launchVelocity = ((-1 * (Math.pow((previousInfoGrabbing.basketballPrevious.distance / 50), 2))) + 3 > 0) ? (-1 * (Math.pow((previousInfoGrabbing.basketballPrevious.distance / 50), 2))) + 3 : 0;
            ballVelocityY = launchVelocity * Math.sin(camera.getWorldDirection().y * (Math.PI / 2));
            ballVelocityX = (launchVelocity * Math.cos(camera.getWorldDirection().y * (Math.PI / 2))) * camera.getWorldDirection().x;
            ballVelocityZ = (launchVelocity * Math.cos(camera.getWorldDirection().y * (Math.PI / 2))) * camera.getWorldDirection().z;
        }
    }
    var mouseMove = (event) => {
        event.preventDefault();
    }

    //event listener mouse
    document.addEventListener( 'mousedown', onMouseDown, false);
    document.addEventListener( 'mouseup', onMouseUp, false);
    document.addEventListener( 'mousemove', mouseMove, false);

    raycaster = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, - 1, 0 ), 0, 10 );

    var personTriggerCamGeometry = new THREE.CylinderGeometry(5, 5, 8, 12);
    var personTriggerCamMaterial = new THREE.MeshStandardMaterial({color: 0xff0000});
    personTriggerCame = new THREE.Mesh( personTriggerCamGeometry, personTriggerCamMaterial);
    personTriggerCame.position.set(0, 0, 0);
    personTriggerCame.scale.set (1, 2, 1);
    personTriggerCame.castShadow = true;
    camera.add(personTriggerCame);

    var loader = new GLTFLoader();

    loader.load( './court.glb', function ( gltf ) {

        var basketballCourt = gltf.scene;
        basketballCourt.rotation.set ( 0, 0, 0);
        basketballCourt.scale.set(12, 12, 12);
        basketballCourt.position.set(0, -2, 0);
        basketballCourt.castShadow = true;
        basketballCourt.receiveShadow = true;
        for(let i = 0; i < basketballCourt.children.length; i++){
            basketballCourt.children[i].castShadow = true;
            basketballCourt.children[i].receiveShadow = true;
            collidableMeshList.push(basketballCourt.children[i]);
            if(basketballCourt.children[i].type == "Mesh")
            basketballCollision.push(basketballCourt.children[i]);
        }
        scene.add( basketballCourt );

    }, undefined, function ( error ) {

        console.error( error );

    } );

    var basketballGeography = new THREE.SphereGeometry( 3, 12, 12 );
    var basketballMaterial = new THREE.MeshStandardMaterial( {color: 0xffa500} );
    basketball = new THREE.Mesh( basketballGeography, basketballMaterial );
    var basketballWireframe = new THREE.WireframeGeometry( basketballGeography );
    var basketballOutlines = new THREE.LineSegments( basketballWireframe );
    basketballOutlines.material.depthTest = false;
    basketballOutlines.material.opacity = 0.02;
    basketballOutlines.material.transparent = true;
    basketball.position.set(5, 2, -20);
    basketball.castShadow = true;
    basketball.receiveShadow = true;
    scene.add( basketball );
    basketball.add( basketballOutlines );

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild( renderer.domElement );

    window.addEventListener( 'resize', onWindowResize, false );
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
    var prevCameraInfoPosition = {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
    }

    requestAnimationFrame( animate );

    var time = performance.now();

    if ( controls.isLocked === true ) {

        var delta = ( time - prevTime ) / 1000;

        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

        direction.z = Number( moveForward ) - Number( moveBackward );
        direction.x = Number( moveRight ) - Number( moveLeft );
        direction.normalize();

        if ( moveForward || moveBackward ) velocity.z -= direction.z * 400.0 * delta;
        if ( moveLeft || moveRight ) velocity.x -= direction.x * 400.0 * delta;

        controls.moveRight( - velocity.x * delta );
        controls.moveForward( - velocity.z * delta );
        var originPoint = camera.position.clone();
        for (var vertexIndex = 0; vertexIndex < personTriggerCame.geometry.vertices.length; vertexIndex++)
        {		
            var localVertex = personTriggerCame.geometry.vertices[vertexIndex].clone();
            var globalVertex = localVertex.applyMatrix4( personTriggerCame.matrix );
            var directionVector = globalVertex.sub( personTriggerCame.position );
            var ray = new THREE.Raycaster( originPoint, directionVector.clone().normalize() );
            var collisionResults = ray.intersectObjects( collidableMeshList );
            if ( collisionResults.length > 0 && collisionResults[0].distance < directionVector.length() ) {
                var errorMargin = 0.5;
                if(collisionResults[0].face.normal.y > Math.abs(collisionResults[0].face.normal.x) && collisionResults[0].face.normal.y > Math.abs(collisionResults[0].face.normal.z)){
                    camera.position.y = prevCameraInfoPosition.y;
                    canJump = true;
                    velocity.y = Math.max(0, velocity.y);
                    if(faceGreaterThanItself(collisionResults[0].face.normal.x, collisionResults[0].face.normal.z, errorMargin)){
                        camera.position.x = prevCameraInfoPosition.x;
                    }
                    else if(faceGreaterThanItself(collisionResults[0].face.normal.z, collisionResults[0].face.normal.x, errorMargin)){
                        camera.position.z = prevCameraInfoPosition.z;
                    }
                    if(collisionResults[0].face.normal.x > 0){
                        camera.position.x += (collisionResults[0].face.normal.x * 2);
                    }
                    if(collisionResults[0].face.normal.z > 0){
                        camera.position.z += (collisionResults[0].face.normal.z * 2);
                    }
                }
                else if(faceGreaterThanItself(collisionResults[0].face.normal.x, collisionResults[0].face.normal.z, errorMargin)){
                    camera.position.x = prevCameraInfoPosition.x;
                    camera.position.z = prevCameraInfoPosition.z;
                }
                else if(faceGreaterThanItself(collisionResults[0].face.normal.z, collisionResults[0].face.normal.x, errorMargin)){
                    camera.position.z = prevCameraInfoPosition.z;
                }
                else{
                    camera.position.x = prevCameraInfoPosition.x;
                    camera.position.z = prevCameraInfoPosition.z;
                }
            }
        }
    }
    prevTime = time;
    renderer.render( scene, camera );

    raycasterMouse.setFromCamera( mouseVector, camera);

    var intersects = raycasterMouse.intersectObjects( basketball.children );
    if(intersects.length > 0 || grabBall){
        lookAtBall = true;
        basketball.material.color.set( 0xffff00);
        document.getElementById('cursor-top').style.backgroundColor = "#00ff00";
        document.getElementById('cursor-bottom').style.backgroundColor = "#00ff00";
        document.getElementById('cursor-left').style.backgroundColor = "#00ff00";
        document.getElementById('cursor-right').style.backgroundColor = "#00ff00";
    }
    else{
        lookAtBall = false;
        basketball.material.color.set( 0xffa500);
        document.getElementById('cursor-top').style.backgroundColor = "#00cc00";
        document.getElementById('cursor-bottom').style.backgroundColor = "#00cc00";
        document.getElementById('cursor-left').style.backgroundColor = "#00cc00";
        document.getElementById('cursor-right').style.backgroundColor = "#00cc00";
    }

    if(!grabBall){
        if(basketball.position.y > 2){
            basketball.position.x += ballVelocityX;
            basketball.position.y += ballVelocityY;
            basketball.position.z += ballVelocityZ;
            ballVelocityY += acceleration;
            ballHitGround = false;
        }
        else{
            basketball.position.y = 2;
            ballVelocityX = 0;
            ballVelocityY = 0;
            ballVelocityZ = 0;
            if(!shotAlreadyMadeDown && !ballHitGround){
                shotsMax = Math.max(shotsMax, shotsInRow);
                shotsInRow = 0;
            }
            ballHitGround = true;
            shotAlreadyMadeDown = false;
        }
        if(withinTriggerPoint(basketball.position.x, basketball.position.y, basketball.position.z, -2, 25, -47, 2, 30, -43) || withinTriggerPoint(basketball.position.x, basketball.position.y, basketball.position.z, -2, 25, 43, 2, 30, 47)){
            if(!shotAlreadyMadeDown){
                shotsMade += 1;
                shotAlreadyMadeDown = true;
                shotsInRow += 1;
                if(shotsInRow > shotsMax){
                    shotsMax = shotsInRow;
                }
                document.getElementById('buckets-made').innerHTML = shotsMade;
                document.getElementById('shots-row').innerHTML = shotsInRow;
                document.getElementById('shots-max').innerHTML = shotsMax;        
                ballVelocityX = 0;
                ballVelocityZ = 0;
                ballVelocityY = 0;
            }

        }
    }
    else{
        ballVelocityX = 0;
        ballVelocityY = 0;
        ballVelocityZ = 0;
        shotAlreadyMadeDown = false;
    }
    if(outsideBoundingWalls(basketball.position.x, 38, -38)){
        ballVelocityX *= -1;
        if(outsideBoundingWalls(basketball.position.x, 42, -42)){
        ballVelocityX = 0;
        ballVelocityZ = 0;
        basketball.position.x = 0;
        }
    }
    if(outsideBoundingWalls(basketball.position.z, 57, -57)){
        ballVelocityZ *= -1;
        if(outsideBoundingWalls(basketball.position.z, 61, -61)){
        ballVelocityX = 0;
        ballVelocityZ = 0;
        basketball.position.z = 0;
        }
    }
    if((withinTriggerPoint(basketball.position.x, basketball.position.y, basketball.position.z, -10, 22, -50, 10, 36, -46) || withinTriggerPoint(basketball.position.x, basketball.position.y, basketball.position.z, -10, 22, 48, 10, 36, 52))){
        ballVelocityZ *= -1;
    }
}


function threeDistance(x1, y1, z1, x2, y2, z2){
    var distance = Math.sqrt(Math.pow((x2 - x1),2) + Math.pow((y2 - y1),2) + Math.pow((z2 - z1),2));
    return distance;
}

function faceGreaterThanItself(pos1, pos2, error){
    return Math.abs(pos1) == Math.max(Math.abs(pos1),Math.abs(pos2) + error);
}

function rotationDisplacementAxis(radius, direction, orginDirection){
    return radius * (direction - orginDirection);
}

function grabDisplacementCoord(rotationDisplacement, prevCoordObject, nowCoordCam, prevCoordCam){
    return rotationDisplacement + prevCoordObject + nowCoordCam - prevCoordCam;
}

function withinTriggerPoint(px, py, pz, testx1, testy1, testz1, testx2, testy2, testz2){
    return ((px > testx1 && px < testx2) && (py > testy1 && py < testy2) && (pz > testz1 && pz < testz2));
}

function outsideBoundingWalls(point, test1, test2){
    return (point > test1 || point < test2);
}


