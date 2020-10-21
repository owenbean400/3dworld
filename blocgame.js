import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.121.1/build/three.module.js';
import {PointerLockControls} from 'https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/loaders/GLTFLoader.js';

var camera, scene, renderer, controls;

var objects = [];

var raycaster;

var basketball;

var dribble = false;
var dribbleDown = false;
var ballShot = false;

var shootReady = false;

var ballVelocity = 1;
var ballVelocityZ, ballVelocityY;

var collidableMeshList = [];

var cube2;

var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;
var canJump = false;

var scope = false;
var shot = false;

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
    console.log(camera);

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x999999 );
    scene.fog = new THREE.Fog( 0x999999, 0, 750 );

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

    console.log(directionalLight);
    var helper = new THREE.CameraHelper( directionalLight.shadow.camera );
    scene.add( helper );
    scene.add( directionalLight );  

    controls = new PointerLockControls( camera, document.body );

    var blocker = document.getElementById( 'blocker' );
    var instructions = document.getElementById( 'instructions' );
    var crosshair = document.getElementById('cursor');

    instructions.addEventListener( 'click', function () {

        controls.lock();

    }, false );

    controls.addEventListener( 'lock', function () {

        instructions.style.display = 'none';
        blocker.style.display = 'none';

    } );

    controls.addEventListener( 'unlock', function () {

        blocker.style.display = 'block';
        instructions.style.display = '';

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
                if ( canJump === true ) velocity.y += 350;
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
        if(event.button == 2){
            shootReady = true;
        }
    }

    var onMouseUp = function (event) {
        if(event.button == 2){
            shootReady = false;
        }
    }

    var mouseClick = function (event) {
        if(event.button == 0){
            if(!dribble){
                dribbleDown = true;
                dribble = true;
            }
        }
    }

    document.addEventListener( 'mousedown', onMouseDown, false);
    document.addEventListener( 'mouseup', onMouseUp, false);
    document.addEventListener( 'click', mouseClick, false);

    raycaster = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, - 1, 0 ), 0, 10 );

    var planeGeometry = new THREE.PlaneBufferGeometry( 200, 200, 32, 32 );
    var planeMaterial = new THREE.MeshStandardMaterial( { color: 0x00ff00 } )
    var plane = new THREE.Mesh( planeGeometry, planeMaterial );
    plane.rotation.x = -1 * Math.PI / 2;
    plane.receiveShadow = true;
    scene.add( plane );


    // objects

    var geo = new THREE.BoxGeometry(10,30,10);
    var mat = new THREE.MeshStandardMaterial({color: 0xff0000});
    var cube = new THREE.Mesh( geo, mat);
    var wireframe = new THREE.WireframeGeometry(geo);
    var line = new THREE.LineSegments(wireframe);
    line.material.depthTest = false;
    line.material.opacity = 0.25;
    line.material.transparent = true;
    line.position.set(-10, 20, -10);
    scene.add( line );
    cube.position.set(-10, 20, -10);
    cube.castShadow = true;
    scene.add(cube);
    console.log(cube);
    collidableMeshList.push(cube);

    var geo2 = new THREE.BoxGeometry(5,5,5);
    var mat2 = new THREE.MeshStandardMaterial({color: 0xff0000});
    cube2 = new THREE.Mesh( geo2, mat2);
    cube2.position.set(0, 0, 0);
    cube2.castShadow = true;
    //camera.add(cube2);

    var geometryq = new THREE.SphereGeometry( 20, 8, 8 );
    var materialq = new THREE.MeshStandardMaterial( {color: 0xffff00} );
    var sphere = new THREE.Mesh( geometryq, materialq );
    sphere.position.set(20, 5, 20);
    sphere.castShadow = true;
    scene.add( sphere );
    collidableMeshList.push(sphere);

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild( renderer.domElement );

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
                //console.log(" Hit ");
                //console.log("old X:" + prevCameraInfoPositionX + "   new X:"+ camera.position.x);
                camera.position.x = prevCameraInfoPositionX;
                camera.position.z = prevCameraInfoPositionZ;
                camera.position.y = prevCameraInfoPositionY;
                velocity.y = 0;
            }
        }

        
        //console.log(camera.position);

    }
    prevTime = time;

    

    renderer.render( scene, camera );

    
    //console.log("old X:" + prevCameraInfoPositionX + "   new X:"+ camera.position.x);
}


