
// = 009 ======================================================================
// これまでのサンプルでは、メッシュは「１つのジオメトリから１つ」ずつ生成してい
// ましたが、実際の案件では、同じジオメトリを再利用しながら「複数のメッシュ」を
// 生成する場面のほうが多いかもしれません。
// このとき、3D シーンに複数のオブジェクトを追加する際にやってしまいがちな間違い
// として「ジオメトリやマテリアルも複数回生成してしまう」というものがあります。
// メモリ効率よく複数のオブジェクトをシーンに追加する方法をしっかりおさえておき
// ましょう。
// ============================================================================

// 必要なモジュールを読み込み
import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';

// DOM がパースされたことを検出するイベントを設定
window.addEventListener('DOMContentLoaded', () => {
  // 制御クラスのインスタンスを生成
  const app = new App3();
  // 初期化
  app.init();
  // 描画
  app.render();

}, false);


class App3 {
  /**
   * カメラ定義のための定数
   */
  static get CAMERA_PARAM() {
    return {
      // fovy は Field of View Y のことで、縦方向の視野角を意味する
      fovy: 90,
      // 描画する空間のアスペクト比（縦横比）
      aspect: 4 / 3,
      // 描画する空間のニアクリップ面（最近面）
      near: 0.1,
      // 描画する空間のファークリップ面（最遠面）
      far: 100.0,
      // カメラの位置
      x: 18.0,
      y: 18.0,
      z: 24.0,
      // カメラの中止点
      lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
    };
  }
  /**
   * レンダラー定義のための定数
   */
  static get RENDERER_PARAM() {
    return {
      // レンダラーが背景をリセットする際に使われる背景色
      clearColor: 0x666666,
      // // レンダラーが描画する領域の横幅
      width: window.innerWidth,
      // レンダラーが描画する領域の縦幅
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
      intensity: 0.3,  // 光の強度
    };
  }
  /**
   * マテリアル定義のための定数
   */
  static get MATERIAL_PARAM() {
    return {
      color: 0x3399ff, // マテリアルの基本色
      // wireframe: true
      side: THREE.DoubleSide,
    };
  }
  static get MOVE_MATERIAL_PARAM() {
    return {
      color: 0xff0000, // マテリアルの基本色
    };
  }

  /**
   * コンストラクタ
   * @constructor
   */
  constructor() {
    this.renderer;         // レンダラ
    this.scene;            // シーン
    this.camera;           // カメラ
    this.directionalLight; // ディレクショナルライト
    this.ambientLight;     // アンビエントライト
    this.material;         // マテリアル
    this.torusGeometry;    // トーラスジオメトリ
    this.torusArray;       // トーラスメッシュの配列 @@@
    this.controls;         // オービットコントロール
    this.axesHelper;       // 軸ヘルパー

    this.mode
    this.swing

    this.neckGroup
    this.funGroup
    this.pedestalGroup


    this.isDown = false; // キーの押下状態を保持するフラグ

    // 再帰呼び出しのための this 固定
    this.render = this.render.bind(this);

    // キーの押下や離す操作を検出できるようにする
    window.addEventListener('keydown', (keyEvent) => {
      switch (keyEvent.key) {
        case ' ':
          this.isDown = true;
          break;
        default:
      }
    }, false);
    window.addEventListener('keyup', (keyEvent) => {
      this.isDown = false;
    }, false);

    // リサイズイベント
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }, false);
  }

  /**
   * 初期化処理
   */
  init() {

    // レンダラー
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(new THREE.Color(App3.RENDERER_PARAM.clearColor));
    this.renderer.setSize(App3.RENDERER_PARAM.width, App3.RENDERER_PARAM.height);
    const wrapper = document.querySelector('#webgl');
    wrapper.appendChild(this.renderer.domElement);

    // シーン
    this.scene = new THREE.Scene();

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

    this.count = 0;
    this.createMesh();

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // ヘルパー
    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    this.scene.add(this.axesHelper);

    this.bindChangeModeAction();
    this.bindTurnUpDownNeckAction();
    this.bindSwingNeckAction();
    this.bindClickWheelAction();
  }

  bindClickWheelAction () {

    this.pad = document.getElementById('pad');
    this.gauge = document.getElementById('gauge');
    this.unleash = document.getElementById('unleash');

    this.pad.controle = {
      hasTouchEvent: 'ontouchstart' in window,
      isTouch: false,
      current: null,
      value: 0
    };
    const displayPushAction = () => {
      if (this.mode != 'auto') {
        this.pad.controle.isTouch = true;
        this.pad.classList.add('_touch')
      }
    }
    const displayMoveAction = (evt) => {
      if (this.pad.controle.isTouch && (this.mode == 'handle' || this.pad.controle.value < 100) ) {

        if (this.mode == 'charge' && !this.unleash.classList.contains('_visible')) {
          this.unleash.classList.remove('_visible')
        }
        
        const {srcElement, target} = evt
        const touchedElement = (srcElement || target);
        
        if (touchedElement.tagName == 'path') {
          const oldPos = this.pad.controle.current;
          const current = Number(touchedElement.id.replace('_', ''));
    
          if (this.pad.controle.hasTouchEvent) {
            this.pad.dataset.pos = current;
          }
    
          if (oldPos != current) {
            const sortTouchOrder = (() => {
              const defaultOrder = [1,2,3,4,5,6,7,8];
              const front = defaultOrder.slice(oldPos);
              const back = defaultOrder.slice(0, oldPos);
              return front.concat(back);
            })();
      
            const rotateCwPos = sortTouchOrder.slice(0, 3)
            const rotateCcwPos = sortTouchOrder.slice(-3)
            if (rotateCwPos.includes(current) && (this.mode == 'handle' || this.pad.controle.value < 100)) {
              this.pad.controle.value += 1;
            } else if (rotateCcwPos.includes(current) && (this.mode == 'handle' || this.pad.controle.value > 0)) {
              this.pad.controle.value -= 1;
            }
            this.pad.controle.current = current;

            if (this.mode == 'handle') {
              this.handleGroup.rotation.z = this.pad.controle.value * -.1;
              gsap.to(this.funGroup.rotation, {
                z: THREE.MathUtils.degToRad(-30 * this.pad.controle.value),
                duration: 0.5
              })
            }
          }
        }
        touchedElement.releasePointerCapture(evt.pointerId)
      } else {
        this.pad.classList.remove('_touch')
        this.pad.controle.isTouch = false;
        delete this.pad.dataset.pos;
      }

      if (this.mode == 'charge' && this.pad.controle.value >= 100) {
        this.unleash.classList.add('_visible')
      }
    }
    const displayLeaveAction = () => {
      this.pad.classList.remove('_touch')
      this.pad.controle.isTouch = false;
      delete this.pad.dataset.pos;
    }
    const stoppropagationEvents = {
      'pointerdown': displayPushAction,
      'pointermove': displayMoveAction,
      'pointerup': displayLeaveAction,
      'touchstart': displayPushAction,
      'touchemove': displayMoveAction,
      'touchend': displayLeaveAction,
    };
    Object.entries(stoppropagationEvents).forEach(kv => {
      this.pad.addEventListener(kv[0], (evt) => {
        evt.stopPropagation();
        kv[1](evt);
        this.gauge.innerHTML = this.pad.controle.value + '%';
        this.gauge.value = this.pad.controle.value;
      }, false);
    })

    this.unleash.addEventListener('click', () => {
      gsap.to(this.gauge, {
        value: 0,
        duration: 1,
        onComplete: () => {
          this.pad.controle.value = 0;
          this.unleash.classList.remove('_visible')
        }
      })
      gsap.to(this.funGroup.rotation, {
        z: THREE.MathUtils.degToRad(-14.4 * this.pad.controle.value),
        duration: 5,
        ease: "power3.out",
        onComplete: () => {
          this.funGroup.rotation.z = 0;
        }
      })
    })
  }

  bindChangeModeAction () {

    const modeRadios = document.querySelectorAll('[name="mode"]');

    this.mode = [].filter.call(modeRadios, radio => radio.checked)[0].value;

    modeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.mode = radio.value;

        if (this.mode != 'auto') {
          this.pad.classList.add('_active')
          this.pad.controle.value = 0;
          this.gauge.value = this.pad.controle.value;
          this.gauge.innerHTML = this.pad.controle.value + '%';
          this.funGroup.rotation.z = 0;
        } else {
          this.pad.classList.remove('_active')
        }
        if (this.mode == 'charge') {
          this.gauge.classList.remove('_hidden')
        } else {
          this.gauge.classList.add('_hidden')
        }
      })
    })
  }
  bindTurnUpDownNeckAction () {
    const stateMap = {
      'up': -15,
      'normal': 0,
      'down': 15,
    }
    const turnRadios = document.querySelectorAll('[name="turn"]');
    turnRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.turnUpDown(stateMap[radio.value])
      })
    })
  }
  bindSwingNeckAction () {
    const swingRadios = document.querySelectorAll('[name="swing"]');

    this.swing = [].filter.call(swingRadios, radio => radio.checked)[0].value;

    swingRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.swing = radio.value
      })
    })
  }

  createMesh () {
    // マテリアル
    this.material = new THREE.MeshPhongMaterial(App3.MATERIAL_PARAM);

    this.createFanMesh();
    this.createPedestalMesh();
    this.createHandleMesh();
  }
  createFanMesh() {

    this.neckGroup = new THREE.Group();
    const capsuleGeometry = new THREE.CapsuleGeometry( 2.5, 8, 5, 10 ); 
    const capsule = new THREE.Mesh( capsuleGeometry, this.material );
    capsule.rotation.x = Math.PI / 2;

    this.neckGroup.position.y = 8.5;
    this.neckGroup.position.z = -2
    this.neckGroup.add( capsule );

    this.funGroup = new THREE.Group();

    for (let i = 0; i< 4; i++) {
      const circleGeometry = new THREE.CircleGeometry( 2.5, 32 ); 
      const circle = new THREE.Mesh( circleGeometry, this.material ); 
      circle.position.x = Math.sin(Math.PI / 2 * i) * 4;
      circle.position.y = Math.cos(Math.PI / 2 * i) * 4;
      circle.rotation.y = Math.PI / 2 * Math.cos(Math.PI / 2 * i) * .1
      circle.rotation.x = Math.PI / 2 * Math.sin(Math.PI / 2 * i) * .1
      this.funGroup.add( circle );
    }

    const cylinderGeometry = new THREE.CylinderGeometry( 2, 2, 0.5, 20 ); 
    const cylinder = new THREE.Mesh( cylinderGeometry, this.material ); 
    cylinder.rotation.x = Math.PI / 2;
    this.funGroup.add( cylinder );

    this.funGroup.position.z = 6.5;

    this.neckGroup.add(this.funGroup);
    
    this.scene.add(this.neckGroup);

  }
  createPedestalMesh() {
    this.pedestalGroup = new THREE.Group();

    const points = [];
    for ( let i = 0; i < 20; i ++ ) {
      if (i < 10) {
        points.push( new THREE.Vector2( i * .2, Math.cos( i * .2 ) / 2 ) );
      } else if (i < 15) {
        points.push( new THREE.Vector2( i * .25, Math.cos( i * .2 ) / 2.5 - 1.0 * (i - 9)) );
      } else {
        points.push( new THREE.Vector2( i * .25 + Math.sqrt( i - 14 ) / 2, Math.cos( i * .2 ) / 2 - 2.0 * 3 - (.2 * (i - 15))) );
      }
    }
    const latheGeometry = new THREE.LatheGeometry(points);
    const lathe = new THREE.Mesh( latheGeometry, this.material );
    lathe.position.z = -2.5
    lathe.position.y = 7.7
    this.pedestalGroup.add( lathe );

    const cylinderGeometry = new THREE.CylinderGeometry( 8.5, 8.5, 1, 32 ); 
    const cylinder = new THREE.Mesh( cylinderGeometry, this.material );
    this.pedestalGroup.add( cylinder );

    this.scene.add(this.pedestalGroup);
  }
  createHandleMesh() {
    this.handleGroup = new THREE.Group();

    const bar = new THREE.CylinderGeometry( .5, .5, 3, 10 ); 
    const barMesh = new THREE.Mesh( bar, this.material );
    barMesh.rotation.x = THREE.MathUtils.degToRad(90)
    this.handleGroup.add( barMesh );

    const arm = new THREE.CylinderGeometry( .5, .5, 4, 10 ); 
    const armMesh = new THREE.Mesh( arm, this.material );
    armMesh.position.z = -1.5;
    armMesh.position.y = -1.5;
    this.handleGroup.add( armMesh );

    const handle = new THREE.CylinderGeometry( .5, .5, 4, 10 ); 
    const handleMesh = new THREE.Mesh( handle, this.material );
    handleMesh.position.z = -3.5;
    handleMesh.position.y = -3;
    handleMesh.rotation.x = THREE.MathUtils.degToRad(90)
    this.handleGroup.add( handleMesh );

    this.handleGroup.position.z = -8

    this.handleGroup.visible = false;
    this.neckGroup.add(this.handleGroup);
  }

  turnUpDown (degree) {
    gsap.to(this.neckGroup.rotation, {
      x: THREE.MathUtils.degToRad(degree),
      duration: 0.5
    })
  }

  /**
   * 描画処理
   */
  render() {
    // 恒常ループの設定
    requestAnimationFrame(this.render.bind(this));

    // コントロールを更新
    this.controls.update();

    if (this.mode == 'auto') {
      this.funGroup.rotation.z -= 0.05;
    }

    if (this.mode == 'handle') {
      this.handleGroup.visible = true;
    } else {
      this.handleGroup.visible = false;
    }

    if (this.swing == 'stop') {

    } else {
      const degree = this.swing == 'narrow' ? 15 : 45;
      this.neckGroup.rotation.y = THREE.MathUtils.degToRad(degree * Math.sin(this.count * 0.015));
      this.count++
    }


    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}
