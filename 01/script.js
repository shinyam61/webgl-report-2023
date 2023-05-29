
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
      x: 0.0,
      y: 2.0,
      z: 13.0,
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

    // マテリアル
    this.material = new THREE.MeshPhongMaterial(App3.MATERIAL_PARAM);
    this.material2 = new THREE.MeshPhongMaterial(App3.MOVE_MATERIAL_PARAM);

    const LOOP_COUNT = 10;
    this.group = new THREE.Group();
    this.boxGeometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    this.boxArray = [];
    this.BoxZPositions = [...Array(LOOP_COUNT)].map(() => this.random.bind(this)());
    for (let i = 0; i < LOOP_COUNT; i++) {
      for (let j = 0; j < LOOP_COUNT; j++) {
        const box = new THREE.Mesh(this.boxGeometry, this.material);
        box.position.x = Number((i - 4.5).toFixed(1));    
        box.position.y = Number((j - 4.5).toFixed(1));    
        box.position.z = Number((this.BoxZPositions[i][j] - 4.5).toFixed(1));    
    
        this.group.add(box);
        this.boxArray.push(box);
      }
    }
    this.scene.add(this.group);

    // this.boxArray.forEach(box => console.log(box.position))

    this.isAnimation = false;
    this.animationBoxs = [];
    this.stayAnimationBoxs = [];
    this.first = true;

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // ヘルパー
    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    this.scene.add(this.axesHelper);
  }

  random() {
    return [...Array(10)].map((_, idx) => idx + 1).sort(() => 0.5 - Math.random())
  }

  /**
   * 描画処理
   */
  render() {
    // 恒常ループの設定
    requestAnimationFrame(this.render.bind(this));

    // コントロールを更新
    this.controls.update();

    // フラグに応じてオブジェクトの状態を変化させる
    if (this.isDown === true) {
      // Y 軸回転 @@@
      this.group.rotation.y -= 0.005
    } else {
      this.group.rotation.y += 0.001
    }

    if (this.isAnimation) {
      this.animationBoxs.forEach((box, idx) => {
        box.mesh.position[box.translate.axis]   += (0.05 * box.dir);
        box.mesh.material = this.material2
        if (
          box.mesh.position[box.translate.axis] <= -4.5 
          || 5.5 <= box.mesh.position[box.translate.axis] 
          || Math.abs(box.pos[box.translate.axis] - box.mesh.position[box.translate.axis] | 0) >= Math.abs(box.translate.quantity)
        ) {
          box.mesh.material = this.material
          box.mesh.position[box.translate.axis] = Number(box.mesh.position[box.translate.axis].toFixed(1))
          this.stayAnimationBoxs.push(this.animationBoxs.splice(idx, 1)[0])
        }
      })
      if (this.animationBoxs.length == 0) {
        this.isAnimation = false;
      }
    } else {
      if (this.first) {
        const box = this.boxArray[Math.random() * 100 | 0];
        const {quantity, pos, axis, dir} = this.getParams(box)
        this.animationBoxs.push({
          mesh: box,
          pos,
          translate: {
            axis,
            quantity
          },
          dir
        })
        this.first = false;
      } else {
        this.animationBoxs = this.boxArray.filter(({position}) => {
          return this.stayAnimationBoxs.map(({pos}) => {
            const {x, y, z} = pos;
            return (x == position.x || y == position.y || z == position.z) && !(x == position.x && y == position.y && z == position.z)
          });
        })

        this.stayAnimationBoxs = [];
        if (this.animationBoxs.length == 0) {
          this.animationBoxs.push(this.boxArray[Math.random() * 100 | 0]);
        }
        this.animationBoxs = this.animationBoxs.map(box => {
          const {quantity, pos, axis, dir} = this.getParams(box);
          return {
            mesh: box,
            pos,
            translate: {
              axis,
              quantity
            },
            dir
          }
        }).splice(0,3)
      }
      this.isAnimation = true;
    }

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }

  getParams(box) {
    const {x, y, z} = box.position;
    const axis = ['x', 'y', 'z'][[0,1,2].sort(() => 0.5 - Math.random()).shift()];
    const dir = [-4.5, 5.5].includes(box.position[axis])
      ? (box.position[axis] == -4.5 ? 1 : -1)
      : [1, -1][[0,1].sort(() => 0.5 - Math.random()).shift()];
    const crossAxisBoxs = this.boxArray.filter(({position}) => {
      let state = false;
      switch (axis) {
        case 'x':
          state = position.y == y && position.z == z
          break;
        case 'y':
          state = position.x == x && position.z == z
          break;
        case 'z':
          state = position.x == x && position.y == y
          break;
        default:
          break;
      }
      return state;
    }).filter(({position}) => {
      if (dir > 0) {
        return position[axis] > box.position[axis]
      } else {
        return position[axis] < box.position[axis]
      }
    })
    const limitPosBoxs = crossAxisBoxs.map(b => b)
      .filter(({position}) => {
        if (dir > 0) {
          return position[axis] + 1 != box.position[axis]
        } else {
          return position[axis] - 1 != box.position[axis]
        }
      })
    const limitPosBox = (() => {
      if (limitPosBoxs.length == 0) {
        return null
      }
      return limitPosBoxs.sort((a, b) => {
        if (dir > 0) {
          return a.position[axis] - b.position[axis]
        } else {
          return b.position[axis] - a.position[axis]
        }
      }).shift()
    })();
    const quantity = dir > 0
      ? (
        limitPosBox
          ? (limitPosBox.position[axis] - 1) - box.position[axis]
          : box.position[axis] == 5.5 ? -1 : 5.5 - box.position[axis]
      )
      : (
        limitPosBox
          ? box.position[axis] - (limitPosBox.position[axis] + 1)
          : box.position[axis] == -4.5 ? 1 : box.position[axis] - 4.5
      ) * dir
    return {
      quantity,
      pos: {x, y, z},
      axis,
      dir
    }
  }
}
