
// = 023 ======================================================================
// 注意：これはオマケのサンプルです！
// クォータニオンや、ベクトルの内積・外積などが登場しますので、かなり数学的に難
// しい内容となっています。このサンプルはあくまでもオマケです。
// 一見して意味がわからなくても気に病む必要はまったくありませんので、あまり過度
// に落ち込んだり心配したりしないようにしてください。
// このサンプルでは、人工衛星を三角錐で作られたロケットに置き換え、進行方向にき
// ちんと頭を向けるようにしています。
// 内積や外積といったベクトル演算は、実際にどのような使いみちがあるのかわかりに
// くかったりもするので、このサンプルを通じて雰囲気だけでも掴んでおくと、いつか
// 自分でなにか特殊な挙動を実現したい、となったときにヒントになるかもしれません。
// 内積・外積だけでもかなりいろんなことが実現できますので、絶対に損はしません。
// ============================================================================

// 必要なモジュールを読み込み
import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';

// DOM がパースされたことを検出するイベントで App3 クラスを初期化
window.addEventListener('DOMContentLoaded', () => {
  const app = new App3();
  app.load()
  .then(() => {
    app.init();
    app.render();
  });
}, false);

/**
 * three.js を効率よく扱うために自家製の制御クラスを定義
 */
class App3 {
  /**
   * カメラ定義のための定数
   */
  static get CAMERA_PARAM() {
    return {
      fovy: 60,
      aspect: window.innerWidth / window.innerHeight,
      near: 0.1,
      far: 200.0,
      x: 15.0,
      y: 10.0,
      z: 0.0,
      lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
    };
  }
  /**
   * レンダラー定義のための定数
   */
  static get RENDERER_PARAM() {
    return {
      clearColor: 0x000000,
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }
  /**
   * ディレクショナルライト定義のための定数
   */
  static get DIRECTIONAL_LIGHT_PARAM() {
    return {
      color: 0xffffff, // 光の色
      intensity: 1.0,  // 光の強度
      x: 1.0,          // 光の向きを表すベクトルの X 要素
      y: 1.0,          // 光の向きを表すベクトルの Y 要素
      z: 1.0           // 光の向きを表すベクトルの Z 要素
    };
  }
  /**
   * アンビエントライト定義のための定数
   */
  static get AMBIENT_LIGHT_PARAM() {
    return {
      color: 0xffffff, // 光の色
      intensity: 0.2,  // 光の強度
    };
  }
  static get MATERIAL_PARAM() {
    return {
      earth: {
        color: 0x0077ff, // マテリアルの基本色
      },
      earthGround: {
        color: 0xffffff, // マテリアルの基本色
        alphaTest:0.2,
      },
      moon: {
        color: 0xcccccc,
      },
      plane: {
        color: 0xffffff,
      }
    };
  }
  /**
   * フォグの定義のための定数
   */
  static get FOG_PARAM() {
    return {
      fogColor: 0x000000, // フォグの色
      fogNear: 20.0,      // フォグの掛かり始めるカメラからの距離
      fogFar: 100.0        // フォグが完全に掛かるカメラからの距離
    };
  }
  /**
   * 月と地球の間の距離
   */
  static get MOON_DISTANCE() {return 10.0;}


  static get PLANE_DISTANCE() {return 5.3;}
  static get MIN_PLANE_DISTANCE() {return 5.08;}
  static get PLANE_SPEED() {return 0.025;}


  /**
   * コンストラクタ
   * @constructor
   */
  constructor() {
    this.renderer;           // レンダラ
    this.scene;              // シーン
    this.camera;             // カメラ
    this.fpsCamera;             // カメラ
    this.directionalLight;   // ディレクショナルライト
    this.ambientLight;       // アンビエントライト
    this.controls;           // オービットコントロール
    this.axesHelper;         // 軸ヘルパー

    this.sphereGeometry;     // スフィアジオメトリ
    this.coneGeometry;       // コーンジオメトリ
    this.earth;              // 地球
    this.earthMaterial;      // 地球用マテリアル
    this.earthTexture;       // 地球用テクスチャ
    this.moon;               // 月
    this.moonMaterial;       // 月用マテリアル
    this.moonTexture;        // 月用テクスチャ
    this.satellite;          // 人工衛星
    this.satelliteMaterial;  // 人工衛星用マテリアル
    this.satelliteDirection; // 人工衛星の進行方向

    this.isStop = false;

    this.planeGroup;
    this.planeDirection;
    this.planeDistance = App3.PLANE_DISTANCE;

    this.dir = 1;
    this.operate = null;

    this.isDown = false;     // キーの押下状態を保持するフラグ

    // Clock オブジェクトの生成
    this.clock = new THREE.Clock();

    // 再帰呼び出しのための this 固定
    this.render = this.render.bind(this);

    const viewChangeCheckbox = document.getElementById('viewChange');
    viewChangeCheckbox.addEventListener('change', () => {
      this.fps = viewChangeCheckbox.checked
    })

    // キーの押下や離す操作を検出できるようにする
    window.addEventListener('keydown', (keyEvent) => {
      this.isDown = true;
      switch (keyEvent.key) {
        case 'ArrowLeft':
          this.dir = -1;
          this.operate = 'horisontal'
          break;
        case 'ArrowRight':
          this.dir = 1;
          this.operate = 'horisontal'
          break;
        case 'ArrowDown':
          this.dir = -1;
          this.operate = 'vartical'
          break;
        case 'ArrowUp':
          this.dir = 1;
          this.operate = 'vartical'
          break;
        default:
      }
    }, false);
    window.addEventListener('keyup', (keyEvent) => {
      this.isDown = false;
      this.operate = null
    }, false);

    // リサイズイベント
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }, false);
  }

  /**
   * アセット（素材）のロードを行う Promise
   */
  load() {
    return new Promise((resolve) => {
      // テクスチャ用のローダーのインスタンスを生成
      const loader = new THREE.TextureLoader();

      // 地球用画像の読み込みとテクスチャ生成
      const earthPath = './earth.png';
      const moonPath = './moon.jpg';
      loader.load(earthPath, (earthTexture) => {
        // 地球用
        this.earthTexture = earthTexture;
        
        loader.load(moonPath, (moonTexture) => {
          // 月用
          this.moonTexture = moonTexture;
          resolve();
        });
      });
    });
  }

  /**
   * 初期化処理
   */
  init() {
    this.clock = new THREE.Clock();

    // レンダラー
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(new THREE.Color(App3.RENDERER_PARAM.clearColor));
    this.renderer.setSize(App3.RENDERER_PARAM.width, App3.RENDERER_PARAM.height);
    const wrapper = document.querySelector('#webgl');
    wrapper.appendChild(this.renderer.domElement);

    // シーンとフォグ
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(
      App3.FOG_PARAM.fogColor,
      App3.FOG_PARAM.fogNear,
      App3.FOG_PARAM.fogFar
    );

    // カメラ
    this.camera = new THREE.PerspectiveCamera(
      App3.CAMERA_PARAM.fovy,
      App3.CAMERA_PARAM.aspect,
      App3.CAMERA_PARAM.near,
      App3.CAMERA_PARAM.far,
    );
    this.camera.position.set(
      App3.CAMERA_PARAM.x,
      App3.CAMERA_PARAM.y,
      App3.CAMERA_PARAM.z,
    );
    this.camera.lookAt(App3.CAMERA_PARAM.lookAt);

    this.fpsCamera = this.camera.clone();

    // ディレクショナルライト（平行光源）
    this.directionalLight = new THREE.DirectionalLight(
      App3.DIRECTIONAL_LIGHT_PARAM.color,
      App3.DIRECTIONAL_LIGHT_PARAM.intensity
    );
    this.directionalLight.position.set(
      App3.DIRECTIONAL_LIGHT_PARAM.x,
      App3.DIRECTIONAL_LIGHT_PARAM.y,
      App3.DIRECTIONAL_LIGHT_PARAM.z,
    );
    this.scene.add(this.directionalLight);

    // アンビエントライト（環境光）
    this.ambientLight = new THREE.AmbientLight(
      App3.AMBIENT_LIGHT_PARAM.color,
      App3.AMBIENT_LIGHT_PARAM.intensity,
    );
    this.scene.add(this.ambientLight);


    this.createPlanets();
    this.createPlane();



    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // ヘルパー
    // const axesBarLength = 15.0;
    // this.axesHelper = new THREE.AxesHelper(axesBarLength);
    // this.scene.add(this.axesHelper);
  }

  createPlanets() {
    // 球体のジオメトリを生成
    this.sphereGeometry = new THREE.SphereGeometry(5, 18, 18);

    // 地球のマテリアルとメッシュ
    this.earthMaterial = new THREE.MeshPhongMaterial(App3.MATERIAL_PARAM.earth);
    this.earth = new THREE.Mesh(this.sphereGeometry, this.earthMaterial);
    this.scene.add(this.earth);

    this.earthGroundMaterial = new THREE.MeshPhongMaterial(App3.MATERIAL_PARAM.earthGround);
    this.earthGroundMaterial.transparent = true;
    this.earthGroundMaterial.map = this.earthTexture;
    this.earthGround = new THREE.Mesh(this.sphereGeometry, this.earthGroundMaterial);
    this.earthGround.scale.setScalar(1.015);
    this.scene.add(this.earthGround);

    // 月のマテリアルとメッシュ
    this.moonMaterial = new THREE.MeshPhongMaterial(App3.MATERIAL_PARAM.moon);
    this.moonMaterial.map = this.moonTexture;
    this.moon = new THREE.Mesh(this.sphereGeometry, this.moonMaterial);
    this.scene.add(this.moon);
    this.moon.scale.setScalar(0.4);
    this.moon.position.set(App3.MOON_DISTANCE, 0.0, 0.0);
  }
  createPlane() {
    this.planeGroup = new THREE.Group();
    const planeGroup = this.planeGroup;
    
    const material = new THREE.MeshPhongMaterial(App3.MATERIAL_PARAM.plane)

    // 羽
    const wingGeo = new THREE.CylinderGeometry( 5, 5, .1, 3 ); 
    const wing = new THREE.Mesh( wingGeo, material );
    wing.scale.set(.6, 1.0, 1.0)
    wing.rotation.x = Math.PI / 2 * -.02;
    planeGroup.add( wing );

    const wingBackGeo = new THREE.CylinderGeometry( 5, 5, .1, 3 ); 
    const wingBack = new THREE.Mesh( wingBackGeo, material );
    wingBack.scale.set(.2, 1, .1)
    wingBack.rotation.z = Math.PI / 2;
    wingBack.position.y = .7;
    wingBack.position.z = -2.25;
    planeGroup.add( wingBack );    

    // 胴体
    const bodyGeo = new THREE.CylinderGeometry( .4, .5, 7, 15 ); 
    const body = new THREE.Mesh( bodyGeo, material );
    body.rotation.x = Math.PI / 2 * .99;
    body.position.z = 1;
    body.position.y = .25;
    planeGroup.add( body );

    const bodyFrontGeo = new THREE.CylinderGeometry( .0, .4, 1.5, 15 ); 
    const bodyFront = new THREE.Mesh( bodyFrontGeo, material );
    bodyFront.rotation.x = Math.PI / 2 * 1.2;
    bodyFront.position.y = .075;
    bodyFront.position.z = 5.12;
    this.bodyFront = bodyFront;
    planeGroup.add( bodyFront );
    planeGroup.scale.setScalar(.1)

    this.planeDirection = new THREE.Vector3(0.0, 0.0, 1.0).normalize();

    this.plane = new THREE.Group();
    this.plane.add(this.planeGroup)
    this.plane.position.y = App3.PLANE_DISTANCE

    this.scene.add(this.plane);
  }

  /**
   * 描画処理
   */
  render() {
    // 恒常ループ
    requestAnimationFrame(this.render);

    // コントロールを更新
    this.controls.update();

    const elapsedTime = this.clock.getElapsedTime();
    this.updatePlanets(elapsedTime);
    this.updatePlane(elapsedTime);

    // レンダラーで描画
    if (this.fps) {
      this.fpsCamera.position.copy(this.plane.position)
      const lookAtPosition = new THREE.Vector3()
        .copy(this.plane.position)
        .add(this.planeDirection)
      this.fpsCamera.up.copy(this.plane.position)
      this.fpsCamera.lookAt(lookAtPosition)
      this.renderer.render(this.scene, this.fpsCamera)
    } else {
      this.renderer.render(this.scene, this.camera);
    }

  }

  updatePlanets(elapsedTime) {
    if (this.isStop) {
      return
    }

    // 地球の自転
    this.earth.rotation.y += 0.00375;
    this.earthGround.rotation.y += 0.005;

    const delayCount = elapsedTime / 5;
    // 月の公転
    this.moon.position.x = Math.sin(delayCount) * App3.MOON_DISTANCE;
    this.moon.position.z = Math.cos(delayCount) * App3.MOON_DISTANCE;
    // 月の自転
    this.moon.rotation.y = THREE.MathUtils.degToRad(360 * (delayCount % (2 * Math.PI)) / (2 * Math.PI)) + Math.PI / 2;
  }
  updatePlane() {
    this.bodyFront.visible = !this.fps;

    const prevDirection = this.planeDirection.clone()

    const prevPlanePos = this.plane.position.clone();
    if ( this.isDown ) {

      if (this.operate == 'horisontal' && App3.MIN_PLANE_DISTANCE < this.planeDistance) {
        const turnAxis = new THREE.Vector3().crossVectors(
          this.planeDirection,
          prevPlanePos
        )
        turnAxis.normalize();
        this.planeDirection.add(turnAxis.multiplyScalar(.01 * this.dir))
      } else if (this.operate == 'vartical') {
        this.planeDistance = Math.max(App3.MIN_PLANE_DISTANCE, Math.min((this.planeDistance + App3.PLANE_DISTANCE * .0005 * this.dir), App3.PLANE_DISTANCE))
        this.isStop = this.planeDistance == App3.MIN_PLANE_DISTANCE
      }

    }

    if (this.isStop) {
      return
    }

    const newPos = prevPlanePos.add(this.planeDirection.multiplyScalar(App3.PLANE_SPEED)).normalize().multiplyScalar(this.planeDistance);

    this.planeDirection = new THREE.Vector3().subVectors(newPos, this.plane.position)
    this.planeDirection.normalize()

    this.plane.position.set(newPos.x, newPos.y, newPos.z)

    const normalAxis = new THREE.Vector3().crossVectors(
      prevDirection,
      this.planeDirection
    )
    normalAxis.normalize()

    const cos = prevDirection.dot(this.planeDirection)
    const radians = Math.acos(cos)

    const qtn = new THREE.Quaternion().setFromAxisAngle(normalAxis, radians)

    this.plane.quaternion.premultiply(qtn)
  }
}

  