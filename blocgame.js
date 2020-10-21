import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.121.1/build/three.module.js';
import {PointerLockControls} from 'https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/loaders/GLTFLoader.js';

var camera, scene, renderer, controls;
var raycaster;

var basketball;
var basketballHeld = false;
var basketballPrevCords = [];
var previousCameraGrabBall = [];

var cameraPrevQuat;

var collidableMeshList = [];
var basketballCollision = [];

var raycasterMouse = new THREE.Raycaster();
var mouseVector = new THREE.Vector2();
var lookAtBall = false;
var grabBall = false;

var cube2;
var distanceBallCamera;

var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;
var canJump = false;

var prevTime = performance.now();
var velocity = new THREE.Vector3();
var direction = new THREE.Vector3();
var vertex = new THREE.Vector3();
var color = new THREE.Color();

init();
animate();

function init() {

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    camera.position.y = 10;

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x999999 );
    scene.fog = new THREE.Fog( 0x999999, 0, 750 );

    var light = new THREE.AmbientLight( 0x404040, 2 ); // soft white light
    scene.add( light );

    //light
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

    controls = new PointerLockControls( camera, document.body );

    var blocker = document.getElementById( 'blocker' );
    var instructions = document.getElementById( 'instructions' );
    var crosshair = document.getElementById('cursor');

    instructions.addEventListener( 'click', function () {

        controls.lock();
        crosshair.style.display = "none";


    }, false );

    controls.addEventListener( 'lock', function () {

        instructions.style.display = 'none';
        blocker.style.display = 'none';
        crosshair.style.display = '';

    } );

    controls.addEventListener( 'unlock', function () {

        blocker.style.display = 'block';
        instructions.style.display = '';
        crosshair.style.display = "none";

    } );

    scene.add( controls.getObject() );

    var onKeyDown = function ( event ) {

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
                //if ( canJump === true ) velocity.y += 200;
                canJump = false;
                break;

        }

    };

    var onKeyUp = function ( event ) {

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
                ballShot = true;
                ballVelocityY = ballVelocity * Math.sin(Math.abs(camera.rotation.z));
                ballVelocityZ = ballVelocityY / Math.tan(camera.rotation.z);
                break;

        }

    };

    document.addEventListener( 'keydown', onKeyDown, false );
    document.addEventListener( 'keyup', onKeyUp, false );
    
    var onMouseDown = function (event){
        if(event.button == 2 && lookAtBall){
            grabBall = true;
            cameraPrevQuat = camera.quaternion.clone();
            basketballPrevCords.push(basketball.position.x);
            basketballPrevCords.push(basketball.position.y);
            basketballPrevCords.push(basketball.position.z);
            previousCameraGrabBall.push(camera.position.x);
            previousCameraGrabBall.push(camera.position.y);
            previousCameraGrabBall.push(camera.position.z);
            previousCameraGrabBall.push(camera.getWorldDirection());
            basketballHeld = true;
            distanceBallCamera = threeDistance(camera.position.x, camera.position.y, camera.position.z, basketball.position.x, basketball.position.y, basketball.position.z);
            scene.remove(basketball);
            basketball.position.set(0, 0, -1 * distanceBallCamera);
            camera.add(basketball);
        }
    }

    var onMouseUp = function (event) {
        if(event.button == 2 && lookAtBall){
            var RotationDisplacementX = distanceBallCamera * (camera.getWorldDirection().x - previousCameraGrabBall[3].x);
            var RotationDisplacementY = distanceBallCamera * (camera.getWorldDirection().y - previousCameraGrabBall[3].y);
            var RotationDisplacementZ = distanceBallCamera * (camera.getWorldDirection().z - previousCameraGrabBall[3].z);
            basketballHeld = false;
            basketball.position.set(RotationDisplacementX + basketballPrevCords[0] + camera.position.x - previousCameraGrabBall[0], RotationDisplacementY + basketballPrevCords[1] + camera.position.y - previousCameraGrabBall[1], RotationDisplacementZ + basketballPrevCords[2] + camera.position.z - previousCameraGrabBall[2],)
            camera.remove(basketball);
            scene.add(basketball);
            grabBall = false;
            basketballPrevCords = [];
            previousCameraGrabBall = [];
        }
    }

    var mouseMove = function (event) {
        event.preventDefault();
        mouseVector.x = (event.clientX / window.innerWidth ) * 2 - 1;
        mouseVector.y = - ( event.clientY / window.innerHeight ) * 2 + 0.8;
        console.log(event.clientY);
        console.log(mouseVector);
    }

    document.addEventListener( 'mousedown', onMouseDown, false);
    document.addEventListener( 'mouseup', onMouseUp, false);
    document.addEventListener( 'mousemove', mouseMove, false);

    raycaster = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, - 1, 0 ), 0, 10 );

    var geo2 = new THREE.CylinderGeometry(5, 5, 8, 12);
    var mat2 = new THREE.MeshStandardMaterial({color: 0xff0000});
    cube2 = new THREE.Mesh( geo2, mat2);
    cube2.position.set(0, 0, 0);
    cube2.scale.set (1, 2, 1);
    cube2.castShadow = true;
    camera.add(cube2);

    var loader = new GLTFLoader();

loader.load( './court.glb', function ( gltf ) {

    var model = gltf.scene;
    model.rotation.set ( 0, 0, 0);
    model.scale.set(12, 12, 12);
    model.position.set(0, -2, 0);
    model.castShadow = true;
    model.receiveShadow = true;
    for(let i = 0; i < model.children.length; i++){
        model.children[i].castShadow = true;
        model.children[i].receiveShadow = true;
        collidableMeshList.push(model.children[i]);
        if(model.children[i].type == "Mesh")
        basketballCollision.push(model.children[i]);
    }
    scene.add( model );

}, undefined, function ( error ) {

	console.error( error );

} );
    var geos = new THREE.SphereGeometry( 5, 12, 12 );
    var mats = new THREE.MeshStandardMaterial( {color: 0xffa500} );
    basketball = new THREE.Mesh( geos, mats );
    var wireframe = new THREE.WireframeGeometry( geos );
    var sline = new THREE.LineSegments( wireframe );
    sline.material.depthTest = false;
    sline.material.opacity = 0.02;
    sline.material.transparent = true;
    basketball.position.set(5, 6, -20);
    basketball.castShadow = true;
    basketball.receiveShadow = true;
    scene.add( basketball );
    basketball.add( sline );

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild( renderer.domElement );
    document.getElementsByTagName("canvas")[0].style.top = 0;
    document.getElementsByTagName("canvas")[0].style.left = 0;

    //

    window.addEventListener( 'resize', onWindowResize, false );

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

function animate() {
    var prevCameraInfoPositionX = camera.position.x;
    var prevCameraInfoPositionZ = camera.position.z;
    var prevCameraInfoPositionY = camera.position.y;

    requestAnimationFrame( animate );

    var time = performance.now();

    if ( controls.isLocked === true ) {

        var delta = ( time - prevTime ) / 1000;

        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

        direction.z = Number( moveForward ) - Number( moveBackward );
        direction.x = Number( moveRight ) - Number( moveLeft );
        direction.normalize(); // this ensures consistent movements in all directions

        if ( moveForward || moveBackward ) velocity.z -= direction.z * 400.0 * delta;
        if ( moveLeft || moveRight ) velocity.x -= direction.x * 400.0 * delta;

        controls.moveRight( - velocity.x * delta );
        controls.moveForward( - velocity.z * delta );

        controls.getObject().position.y += ( velocity.y * delta ); // new behavior

        if ( controls.getObject().position.y < 10 ) {

            velocity.y = 0;
            controls.getObject().position.y = 10;

            canJump = true;

        }
        var originPoint = camera.position.clone();
        for (var vertexIndex = 0; vertexIndex < cube2.geometry.vertices.length; vertexIndex++)
        {		
            var localVertex = cube2.geometry.vertices[vertexIndex].clone();
            var globalVertex = localVertex.applyMatrix4( cube2.matrix );
            var directionVector = globalVertex.sub( cube2.position );
            
            var ray = new THREE.Raycaster( originPoint, directionVector.clone().normalize() );
            var collisionResults = ray.intersectObjects( collidableMeshList );
            if ( collisionResults.length > 0 && collisionResults[0].distance < directionVector.length() ) {
                var errorMargin = 0.5;
                if(collisionResults[0].face.normal.y > Math.abs(collisionResults[0].face.normal.x) && collisionResults[0].face.normal.y > Math.abs(collisionResults[0].face.normal.z)){
                    camera.position.y = prevCameraInfoPositionY;
                    canJump = true;
                    velocity.y = Math.max(0, velocity.y);
                    if(Math.abs(collisionResults[0].face.normal.x) == Math.max(Math.abs(collisionResults[0].face.normal.x),Math.abs(collisionResults[0].face.normal.z) + errorMargin * 2)){
                        camera.position.x = prevCameraInfoPositionX;
                    }
                    else if(Math.abs(collisionResults[0].face.normal.z) == Math.max(Math.abs(collisionResults[0].face.normal.x) + errorMargin * 2,Math.abs(collisionResults[0].face.normal.z))){
                        camera.position.z = prevCameraInfoPositionZ;
                    }
                    if(collisionResults[0].face.normal.x > 0){
                        camera.position.x += (collisionResults[0].face.normal.x * 2);
                    }
                    if(collisionResults[0].face.normal.z > 0){
                        camera.position.z += (collisionResults[0].face.normal.z * 2);
                    }
                }
                else if(Math.abs(collisionResults[0].face.normal.x) == Math.max(Math.abs(collisionResults[0].face.normal.x),Math.abs(collisionResults[0].face.normal.z) + errorMargin)){
                    camera.position.x = prevCameraInfoPositionX;
                    camera.position.z = prevCameraInfoPositionZ;
                }
                else if(Math.abs(collisionResults[0].face.normal.z) == Math.max(Math.abs(collisionResults[0].face.normal.x) + errorMargin,Math.abs(collisionResults[0].face.normal.z))){
                    camera.position.z = prevCameraInfoPositionZ;
                }
                else{
                    camera.position.x = prevCameraInfoPositionX;
                    camera.position.z = prevCameraInfoPositionZ;
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
    }
    else{
        lookAtBall = false;
        basketball.material.color.set( 0xffa500);
    }
}


function threeDistance(x1, y1, z1, x2, y2, z2){
    var distance = Math.sqrt(Math.pow((x2 - x1),2) + Math.pow((y2 - y1),2) + Math.pow((z2 - z1),2));
    return distance;
}


