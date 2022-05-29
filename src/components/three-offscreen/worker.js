import * as THREE from "three"

self.onmessage = function ( message ) {
	const { drawingSurface: canvas, width, height, pixelRatio } = message.data

	const scene = new THREE.Scene();

	const camera = new THREE.PerspectiveCamera( 75, width / height, 0.1, 1000 );
	camera.position.z = 5;
	
	const renderer = new THREE.WebGLRenderer( {
		antialias: true,
		canvas,
	});
	renderer.setPixelRatio( pixelRatio );
	renderer.setSize( width, height, false );
	renderer.setClearColor( 0xffffff, 1 );

	const geometry = new THREE.BoxGeometry( 1, 1, 1 );
	const material = new THREE.MeshStandardMaterial( { color: 'orange' } );
	const cube = new THREE.Mesh( geometry, material );
	cube.position.set( 0, 0, 0 )
	scene.add( cube );

	const ambientLight = new THREE.AmbientLight();
	scene.add( ambientLight );

	const pointLight = new THREE.PointLight();
	pointLight.position.set( 10, 10, 10 );
	scene.add( pointLight );

	function animate() {
		requestAnimationFrame( animate );

		cube.rotation.x += 0.01;
		cube.rotation.y += 0.01;

		renderer.render( scene, camera );
	};

	animate();
};
