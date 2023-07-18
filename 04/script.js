
// = 024 ======================================================================
// 3D プログラミングをしていると、マウスカーソルでクリックしてオブジェクトを選択
// するなどの「マウスを利用した 3D 空間への干渉」を行いたくなる場面に比較的よく
// 出くわします。
// 本来、このような「三次元空間への干渉」はそこそこしっかり数学を活用しないと実
// 現が難しいものですが、three.js には Raycaster と呼ばれる仕組みがあり、これを
// 用いることで数学の知識があまりなくても、比較的容易に三次元空間への干渉処理を
// 実装することができます。
// ここでは、クリックという操作を契機に、マウスカーソルで指し示したオブジェクト
// の色を変化させてみましょう。
// ============================================================================

// 必要なモジュールを読み込み
import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';

// DOM がパースされたことを検出するイベントで App3 クラスをインスタンス化する
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
      far: 40.0,
      x: 0.0,
      y: 0.0,
      z: 20.0,
      lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
    };
  }
  /**
   * レンダラー定義のための定数
   */
  static get RENDERER_PARAM() {
    return {
      clearColor: 0xffffff,
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }
  /**
   * ディレクショナルライト定義のための定数
   */
  static get DIRECTIONAL_LIGHT_PARAM() {
    return {
      color: 0xffffff,
      intensity: 1.0,
      x: 1.0,
      y: 1.0,
      z: 1.0,
    };
  }
  /**
   * アンビエントライト定義のための定数
   */
  static get AMBIENT_LIGHT_PARAM() {
    return {
      color: 0xffffff,
      intensity: 0.2,
    };
  }
  /**
   * マテリアル定義のための定数
   */
  static get MATERIAL_PARAM() {
    return {
      color: 0xffffff,
    };
  }
  /**
   * レイが交差した際のマテリアル定義のための定数 @@@
   */
  static get INTERSECTION_MATERIAL_PARAM() {
    return {
      color: 0x00ff00,
    };
  }
  /**
   * フォグの定義のための定数
   */
  static get FOG_PARAM() {
    return {
      fogColor: 0xffffff,
      fogNear: 10.0,
      fogFar: 20.0,
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
    this.hitMaterial;      // レイが交差した場合用のマテリアル @@@
    this.torusGeometry;    // トーラスジオメトリ
    this.planeArr;       // トーラスメッシュの配列
    this.controls;         // オービットコントロール
    this.axesHelper;       // 軸ヘルパー
    this.group;            // グループ
    this.texture = [];          // テクスチャ
    this.isRotate = true;

    // Raycaster のインスタンスを生成する @@@
    this.raycaster = new THREE.Raycaster();
    // マウスのクリックイベントの定義 @@@
    window.addEventListener('pointerdown', (mouseEvent) => {
      mouseEvent.preventDefault();

      if (this.overlay.classList.contains('_visible')) {
        return
      }
      
      // スクリーン空間の座標系をレイキャスター用に正規化する（-1.0 ~ 1.0 の範囲）
      const x = mouseEvent.clientX / window.innerWidth * 2.0 - 1.0;
      const y = mouseEvent.clientY / window.innerHeight * 2.0 - 1.0;
      console.log({x,y})

      // スクリーン空間は上下が反転している点に注意（Y だけ符号を反転させる）
      const v = new THREE.Vector2(x, -y);
      // レイキャスターに正規化済みマウス座標とカメラを指定する
      this.raycaster.setFromCamera(v, this.camera);
      // scene に含まれるすべてのオブジェクトを対象にレイキャストする
      const intersects = this.raycaster.intersectObjects(this.planeArr);
      // レイが交差しなかった場合を考慮し一度マテリアルをリセットしておく
      this.planeArr.forEach((mesh, idx) => {
        mesh.material = this.mateArr[idx];
      });

      // - intersectObjects でレイキャストした結果は配列 ----------------------
      // 名前が似ているので紛らわしいのですが Raycaster には intersectObject と
      // intersectObjects があります。複数形の s がついているかどうかの違いがあ
      // り、複数形の場合は引数と戻り値のいずれも配列になります。
      // この配列の長さが 0 である場合はカーソル位置に向かって放ったレイは、どの
      // オブジェクトとも交差しなかったと判断できます。また、複数のオブジェクト
      // とレイが交差した場合も、three.js 側で並び替えてくれるので 0 番目の要素
      // を参照すれば必ず見た目上の最も手前にあるオブジェクトを参照できます。
      // 戻り値の中身は object というプロパティを経由することで対象の Mesh など
      // のオブジェクトを参照できる他、交点の座標などもわかります。
      // ----------------------------------------------------------------------
      console.log(intersects)
      if (intersects.length > 0) {
        this.isRotate = false;

        const mesh = intersects[0].object;
        if (mesh.tween) {
          mesh.tween.pause();
        }
        // this.hitMaterial.map = this.texture[mesh.pokemonId - 1];
        // mesh.material = this.hitMaterial;

        this.prevGroupPosition = new THREE.Vector3().copy(mesh.position); // 設定した座標位置（groupのrotationによってsceneから見たときは移動している）
        this.pickupTarget = mesh.removeFromParent();
        this.scene.add(this.pickupTarget); // 同じ座標位置だがgroupが回転している為、ずれるように見える
        const groupRotationAxis = new THREE.Vector3(0, 1, 0).normalize();
        const groupAngle = this.group.rotation.y;
        this.synchronizedScenePosition = new THREE.Vector3().copy(this.pickupTarget.position).applyAxisAngle(groupRotationAxis, groupAngle);
        this.pickupTarget.position.set(
          this.synchronizedScenePosition.x,
          this.synchronizedScenePosition.y,
          this.synchronizedScenePosition.z,
        )
        const cameraPos = new THREE.Vector3().copy(this.camera.position)
        const planePutPos = cameraPos.length() > 1.0
          ? cameraPos.multiplyScalar(0.9)
          : new THREE.Vector3().copy(cameraPos).multiplyScalar(-1);
        gsap.to(this.pickupTarget.position, {
          x: planePutPos.x,
          y: planePutPos.y,
          z: planePutPos.z,
          duration: .75,
          onComplete: () => {
            this.bgGroup.position.set(planePutPos.x * 0.9, planePutPos.y * 0.9, planePutPos.z * 0.9);
            this.bgGroup.visible = true;
            const scale = (() => {
              if (cameraPos.length() < 1.0) {
                return cameraPos.length() * 1.6
              } else if (cameraPos.length() < 6.0) {
                return (cameraPos.length() / 6) * 1.25
              } else {
                return 2.0;
              }
            })();
            this.bgGroup.scale.setScalar(scale);
          }
        })
            
        if (cameraPos.length() < 1.0) {
          this.pickupTarget.scale.setScalar(cameraPos.length() * 0.8);
        } else if (cameraPos.length() < 6.0) {
          this.pickupTarget.scale.setScalar((cameraPos.length() / 6) * .8);
        }


        this.overlay.classList.add('_visible')
      }


      // - Raycaster は CPU 上で動作する --------------------------------------
      // WebGL は描画処理に GPU を活用することで高速に動作します。
      // しかし JavaScript は CPU 上で動作するプログラムであり、Raycaster が内部
      // で行っている処理はあくまでも CPU 上で行われます。
      // 原理的には「メッシュを構成するポリゴンとレイが衝突するか」を JavaScript
      // でループして判定していますので、シーン内のメッシュの量やポリゴンの量が
      // 増えると、それに比例して Raycaster のコストも増加します。
      // ----------------------------------------------------------------------

    }, false);

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

    this.overlay = document.getElementById('overlay');
    this.overlay.addEventListener('pointerdown', (e) => {

      this.bgGroup.visible = false;

      gsap.to(this.pickupTarget.position, {
        x: this.synchronizedScenePosition.x,
        y: this.synchronizedScenePosition.y,
        z: this.synchronizedScenePosition.z,
        duration: .75,
        onComplete: () => {
          const returnGroupMesh = this.pickupTarget.removeFromParent();
          this.group.add(returnGroupMesh);
          const {x,y,z} =this.prevGroupPosition;
          returnGroupMesh.position.set(x,y,z);
          returnGroupMesh.scale.setScalar(1)
          this.isRotate = true;

          if (returnGroupMesh.tween) {
            returnGroupMesh.tween.play();
          }
          this.overlay.classList.remove('_visible')
        }
      })

      e.stopPropagation();
    }, false)


    const dimentionBtn = document.getElementById('dimension');
    dimentionBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      dimentionBtn.classList.add('hidden')
      alignmentBtn.classList.remove('hidden')

      const xpos = [...Array(13)].map(() => this.random.bind(this)(12)).flat();
      const ypos = [...Array(13)].map(() => this.random.bind(this)(12)).flat();
      const zpos = [...Array(13)].map(() => this.random.bind(this)(12)).flat();
      this.planeArr.forEach((plane, idx) => {
        gsap.to(plane.position, {
          x: xpos[idx] - 6,
          y: ypos[idx] - 6,
          z: zpos[idx] - 6,
          duration: .75,
          delay: Math.random()
        })
    })

      this.isRotate = true;
    })
    const alignmentBtn = document.getElementById('alignment');
    alignmentBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      dimentionBtn.classList.remove('hidden')
      alignmentBtn.classList.add('hidden')

      this.group.rotation.y = 0;
      this.isRotate = false;
      clearTimeout(this.frameId)
      this.frameId = false

      this.alignmentPosArr.forEach((pos, idx) => {
        if (this.planeArr[idx]) {
          if (this.planeArr[idx].tween) {
            this.planeArr[idx].tween.kill()
          }
          gsap.to(this.planeArr[idx].position, {
            x: pos[0],
            y: pos[1],
            z: 0.0,
            duration: .75,
            delay: Math.random()
          })
        }
      })
    })
  }

  /**
   * アセット（素材）のロードを行う Promise
   */
  load() {
    return new Promise(resolve => {
      const loadImagePromises = [...Array(151)].map((_, idx) => idx + 1)
        .map((id, idx) => {
          return new Promise((resolve) => {
            // 読み込む画像のパス
            const imagePath = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
            const loader = new THREE.TextureLoader();
            loader.load(imagePath, (texture) => {
              this.texture[idx] = texture;
              resolve();
            });
          });
        })
      Promise.all(loadImagePromises)
        .then(() => {
          resolve()
        })
    })
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

    // シーンとフォグ
    this.scene = new THREE.Scene();
    // this.scene.fog = new THREE.Fog(
    //   App3.FOG_PARAM.fogColor,
    //   App3.FOG_PARAM.fogNear,
    //   App3.FOG_PARAM.fogFar
    // );

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
    this.material = new THREE.MeshBasicMaterial(App3.MATERIAL_PARAM);
    this.material.transparent = true;
    // this.material.map = this.texture;
    // 交差時に表示するためのマテリアルを定義 @@@
    this.hitMaterial = new THREE.MeshBasicMaterial(App3.INTERSECTION_MATERIAL_PARAM);
    this.hitMaterial.transparent = true;
    // this.hitMaterial.map = this.texture;

    // グループ
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // charBgMesh
    this.bgGroup = new THREE.Group();
    const planeBgGeo = new THREE.PlaneGeometry(1.4, 1.5);
    const bgMaterial = this.material.clone();
    bgMaterial.color.set(new THREE.Color( 0xeeeeee ))
    bgMaterial.transparent = false;
    const planeBg = new THREE.Mesh(planeBgGeo, bgMaterial);
    this.bgGroup.add(planeBg);
    this.bgGroup.visible = false;
    this.scene.add(this.bgGroup);

    // charactorMesh
    const pokemons = 151;
    const planeGeo = new THREE.PlaneGeometry(1.0, 1.0);
    this.planeArr = [];
    this.mateArr = [];
    this.BoxZPositions = [...Array(13)].map(() => this.random.bind(this)());

    for (let i = 0; i < 13; i++) {
      for (let j = 0; j < 13; j++) {
        const index = j + (i * 13);
        if (index >= 151) {
          break;
        }
        const material = this.material.clone();
        material.map = this.texture[index];
        const mesh = new THREE.Mesh(planeGeo, material);
        mesh.position.x = i - 6;
        mesh.position.y = j - 6;
        mesh.position.z = this.BoxZPositions[i][j] - 6
        
        this.group.add(mesh);
        this.planeArr.push(mesh);
        this.mateArr.push(material);
        mesh.pokemonId = (index) + 1;
        // console.log(mesh.pokemonId)
      }
    }

    this.alignmentPosArr = [];
    for (let index = 0; index < pokemons; index++) {
      this.alignmentPosArr.push([index % 12 - 5.5, 5.5 - (index / 12 | 0)]);
    }
    // console.log(this.planeArr)

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // ヘルパー
    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    this.scene.add(this.axesHelper);
  }

  
  random(num = 12) {
    return [...Array(num)].map((_, idx) => idx + 1).sort(() => 0.5 - Math.random())
  }

  /**
   * 描画処理
   */
  render() {
    requestAnimationFrame(this.render);
    this.controls.update();


    this.bgGroup.lookAt(this.camera.position)
    this.planeArr.forEach(mesh => {
      mesh.lookAt(this.camera.position)
    })
    // console.log(this.camera.position)
    if (this.isRotate) {
      this.group.rotation.y += 0.0005;
      if (!this.frameId) {
        this.frameId = setTimeout(() => {
          const xpos = [...Array(13)].map(() => this.random.bind(this)(12)).flat();
          const ypos = [...Array(13)].map(() => this.random.bind(this)(12)).flat();
          const zpos = [...Array(13)].map(() => this.random.bind(this)(12)).flat();
          this.planeArr.forEach((mesh, idx) => {
            const delay = (xpos[idx] + ypos[idx] + zpos[idx]) / 3
            if (idx % xpos[0] == ypos[0] && !mesh.tween) {
              const tween = gsap.to(mesh.position, {
                x: xpos[idx] - 6,
                y: ypos[idx] - 6,
                z: zpos[idx] - 6,
                duration: 10,
                delay,
                onComplete: () => {
                  delete mesh.tween;
                }
              })
              mesh.tween = tween;
            }
          })
  
          clearTimeout(this.frameId)
          this.frameId = false
        }, 1000)
      }
    }


    this.renderer.render(this.scene, this.camera);
  }
}

