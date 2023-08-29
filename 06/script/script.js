
// = 010 ======================================================================
// 課題（フラグメントシェーダでの照明効果）の答え合わせ用実装です。
// * シェーダを２種類用意し、画面を左右に分割し同時に描画する
// * gl.viewport を使うことで２つの空間を同時に描画している（かのように見える）
// * 画面左側に頂点シェーダ処理版を描画
// * 画面右側にフラグメントシェーダ処理版を描画
// * 描画結果の違いを強調するために反射光の実装を追加している
// * ガンマ補正の参考例としてフラグメントシェーダで変換処理を行っている
// ============================================================================

import { WebGLUtility }     from './webgl.js';
import { WebGLMath }        from './math.js';
import { WebGLGeometry }    from './geometry.js';
import { WebGLOrbitCamera } from './camera.js';
import '../../lib/tweakpane-3.1.0.min.js';

window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
  app.load()
  .then(() => {
    app.setupGeometry();
    app.setupLocation();
    app.start();
  });

  // Tweakpane を使った GUI の設定
  const pane = new Tweakpane.Pane();
  const parameter = {
    // culling: true,
    // depthTest: true,
    rotation: false,
  };

  // バックフェイスカリングの有効・無効
  // pane.addInput(parameter, 'culling')
  // .on('change', (v) => {
  //   app.setCulling(v.value);
  // });
  // // 深度テストの有効・無効
  // pane.addInput(parameter, 'depthTest')
  // .on('change', (v) => {
  //   app.setDepthTest(v.value);
  // });
  // 回転の有無
  pane.addInput(parameter, 'rotation')
  .on('change', (v) => {
    app.setRotation(v.value);
  });
}, false);

/**
 * アプリケーション管理クラス
 */
class App {
  /**
   * @constructro
   */
  constructor() {
    /**
     * WebGL で描画対象となる canvas
     * @type {HTMLCanvasElement}
     */
    this.canvas = null;
    /**
     * WebGL コンテキスト
     * @type {WebGLRenderingContext}
     */
    this.gl = null;
    /**
     * プログラムオブジェクト
     * @type {WebGLProgram}
     */
    this.program = null;
    this.programAnswer = null;
    /**
     * attribute 変数のロケーションを保持する配列
     * @type {Array.<number>}
     */
    this.attributeLocation = null;
    this.attributeLocationAnswer = null;
    /**
     * attribute 変数のストライドの配列
     * @type {Array.<number>}
     */
    this.attributeStride = null;
    /**
     * uniform 変数のロケーションを保持するオブジェクト
     * @type {object.<WebGLUniformLocation>}
     */
    this.uniformLocation = null;
    this.uniformLocationAnswer = null;
    /**
     * torus ジオメトリの情報を保持するオブジェクト
     * @type {object}
     */
    this.torusGeometry = null;
    /**
     * torus ジオメトリの VBO の配列
     * @type {Array.<WebGLBuffer>}
     */
    this.torusVBO = null;
    /**
     * torus ジオメトリの IBO
     * @type {WebGLBuffer}
     */
    this.torusIBO = null;
    /**
     * レンダリング開始時のタイムスタンプ
     * @type {number}
     */
    this.startTime = null;
    /**
     * カメラ制御用インスタンス
     * @type {WebGLOrbitCamera}
     */
    this.camera = null;
    /**
     * レンダリングを行うかどうかのフラグ
     * @type {boolean}
     */
    this.isRender = false;
    /**
     * オブジェクトを Y 軸回転させるかどうか
     * @type {boolean}
     */
    this.isRotation = false;

    // this を固定するためのバインド処理
    this.resize = this.resize.bind(this);
    this.render = this.render.bind(this);
  }

  /**
   * バックフェイスカリングを設定する
   * @param {boolean} flag - 設定する値
   */
  setCulling(flag) {
    const gl = this.gl;
    if (gl == null) {return;}
    if (flag === true) {
      gl.enable(gl.CULL_FACE);
    } else {
      gl.disable(gl.CULL_FACE);
    }
  }

  /**
   * 深度テストを設定する
   * @param {boolean} flag - 設定する値
   */
  setDepthTest(flag) {
    const gl = this.gl;
    if (gl == null) {return;}
    if (flag === true) {
      gl.enable(gl.DEPTH_TEST);
    } else {
      gl.disable(gl.DEPTH_TEST);
    }
  }

  /**
   * isRotation を設定する
   * @param {boolean} flag - 設定する値
   */
  setRotation(flag) {
    this.isRotation = flag;
  }

  /**
   * 初期化処理を行う
   */
  init() {
    // canvas エレメントの取得と WebGL コンテキストの初期化
    this.canvas = document.getElementById('webgl-canvas');
    this.gl = WebGLUtility.createWebGLContext(this.canvas);

    // カメラ制御用インスタンスを生成する
    const cameraOption = {
      distance: 5.0, // Z 軸上の初期位置までの距離
      min: 1.0,      // カメラが寄れる最小距離
      max: 10.0,     // カメラが離れられる最大距離
      move: 2.0,     // 右ボタンで平行移動する際の速度係数
    };
    this.camera = new WebGLOrbitCamera(this.canvas, cameraOption);

    // 最初に一度リサイズ処理を行っておく
    this.resize();

    // リサイズイベントの設定
    window.addEventListener('resize', this.resize, false);

    // バックフェイスカリングと深度テストは初期状態で有効
    this.gl.enable(this.gl.CULL_FACE);
    this.gl.enable(this.gl.DEPTH_TEST);
  }

  /**
   * リサイズ処理
   */
  resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /**
   * 各種リソースのロードを行う
   * @return {Promise}
   */
  load() {
    return new Promise(async (resolve, reject) => {
      const gl = this.gl;
      if (gl == null) {
        const error = new Error('not initialized');
        reject(error);
      } else {
        // 従来のシェーダ
        const vsSource = await WebGLUtility.loadFile('./shader/main.vert');
        const vs = WebGLUtility.createShaderObject(gl, vsSource, gl.VERTEX_SHADER);
        const fsSource = await WebGLUtility.loadFile('./shader/main.frag');
        const fs = WebGLUtility.createShaderObject(gl, fsSource, gl.FRAGMENT_SHADER);
        this.program = WebGLUtility.createProgramObject(gl, vs, fs);

        // Promise を解決
        resolve();
      }
    });
  }

  /**
   * 頂点属性（頂点ジオメトリ）のセットアップを行う
   */
  setupGeometry() {
    // トーラスのジオメトリ情報を取得
    const row = 256;
    const column = 4;
    const innerRadius = 0.4;
    const outerRadius = 0.8;
    const color = [1.0, 1.0, 1.0, 1.0];
    this.torusGeometry = WebGLGeometry.torus(
      row,
      column,
      innerRadius,
      outerRadius,
      color,
    );

    // VBO と IBO を生成する
    this.torusVBO = [
      WebGLUtility.createVBO(this.gl, this.torusGeometry.position),
      WebGLUtility.createVBO(this.gl, this.torusGeometry.normal),
      WebGLUtility.createVBO(this.gl, this.torusGeometry.color),
    ];
    this.torusIBO = WebGLUtility.createIBO(this.gl, this.torusGeometry.index);


    this.sphereGeometry = WebGLGeometry.sphere(
      10,
      10,
      .1,
      color,
    );
    this.sphereVBO = [
      WebGLUtility.createVBO(this.gl, this.sphereGeometry.position),
      WebGLUtility.createVBO(this.gl, this.sphereGeometry.normal),
      WebGLUtility.createVBO(this.gl, this.sphereGeometry.color),
    ];
    this.sphereIBO = WebGLUtility.createIBO(this.gl, this.sphereGeometry.index);
  }

  /**
   * 頂点属性のロケーションに関するセットアップを行う
   */
  setupLocation() {
    const gl = this.gl;
    // attribute location の取得
    this.attributeLocation = [
      gl.getAttribLocation(this.program, 'position'),
      gl.getAttribLocation(this.program, 'normal'),
      gl.getAttribLocation(this.program, 'color'),
    ];
    // attribute のストライド
    this.attributeStride = [
      3,
      3,
      4,
    ];
    // uniform location の取得
    this.uniformLocation = {
      mMatrix: gl.getUniformLocation(this.program, 'mMatrix'),
      mvpMatrix: gl.getUniformLocation(this.program, 'mvpMatrix'),
      normalMatrix: gl.getUniformLocation(this.program, 'normalMatrix'), // 法線変換行列
      lightRotateMatrix: gl.getUniformLocation(this.program, 'lightRotateMatrix'), // 法線変換行列
      eyePosition: gl.getUniformLocation(this.program, 'eyePosition'),
      lightPos: gl.getUniformLocation(this.program, 'lightPos'),
      isReceiveLight: gl.getUniformLocation(this.program, 'isReceiveLight'),
      lightColor: gl.getUniformLocation(this.program, 'lightColor'),
      lightColors: gl.getUniformLocation(this.program, 'lightColors'),
      time: gl.getUniformLocation(this.program, 'time'),
    };
  }

  /**
   * レンダリングのためのセットアップを行う
   */
  setupRendering() {
    const gl = this.gl;
    // クリアする色と深度を設定する
    gl.clearColor(0.3, 0.3, 0.3, 1.0);
    gl.clearDepth(1.0);
    // 色と深度をクリアする
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  /**
   * 描画を開始する
   */
  start() {
    // レンダリング開始時のタイムスタンプを取得しておく
    this.startTime = Date.now();
    // レンダリングを行っているフラグを立てておく
    this.isRender = true;
    // レンダリングの開始
    this.render();
  }

  /**
   * 描画を停止する
   */
  stop() {
    this.isRender = false;
  }

  /**
   * レンダリングを行う
   */
  render() {
    const gl = this.gl;
    const m4 = WebGLMath.Mat4;
    const v3 = WebGLMath.Vec3;

    // レンダリングのフラグの状態を見て、requestAnimationFrame を呼ぶか決める
    if (this.isRender === true) {
      requestAnimationFrame(this.render);
    }

    // 現在までの経過時間
    const nowTime = (Date.now() - this.startTime) * 0.001;

    // レンダリングのセットアップ
    this.setupRendering();

    // 幅と高さ
    const width = this.canvas.width;
    const height = this.canvas.height;

    // モデル座標変換行列（フラグが立っている場合だけ回転させる）
    const rotateAxis = v3.create(0.0, 1.0, 0.0);
    const m = this.isRotation === true ?
      m4.rotate(m4.identity(), nowTime, rotateAxis) :
      m4.identity();

    // ビュー・プロジェクション座標変換行列
    const v = this.camera.update();
    const fovy   = 45;
    const aspect = width / height;
    const near   = 0.1
    const far    = 10.0;
    const p = m4.perspective(fovy, aspect, near, far);

    // 行列を乗算して MVP 行列を生成する（掛ける順序に注意）
    const vp = m4.multiply(p, v);
    const mvp = m4.multiply(vp, m);

    // モデル座標変換行列の、逆転置行列を生成する
    const normalMatrix = m4.transpose(m4.inverse(m));

    // ビューポートを設定する
    gl.viewport(0, 0, width, height);
    // 従来のほうの描画を左側半分に描画
    gl.useProgram(this.program);

    // 光源の位置
    const lightPos = [
      [1.0, 1.0, 1.0],
      [-1.0, -1.0, -1.0],

      // [-1.0, 1.0, -1.0],
      // [1.0, -1.0, 1.0],

      // [1.0, 1.0, -1.0],
      // [-1.0, -1.0, 1.0],

      // [1.0, -1.0, -1.0],
      // [-1.0, 1.0, 1.0],
    ];
    // 光源の色
    const lightColors = [
      [1.0, .0, .0], // red
      [.0, 1.0, .0], // green
      // [.0, .0, 1.0], // blue
      // [1.0, 1.0, .0], // syan
      // [.0, 1.0, 1.0], // yellow
      // [1.0, .0, 1.0], // マゼンダ
      // [1.0, 1.0, 1.0], // white
      // [.5, .5, .0], // black
    ]

    gl.uniform1fv(this.uniformLocation.lightPos, lightPos.flat());
    gl.uniform1fv(this.uniformLocation.lightColors, lightColors.flat());
    gl.uniform1f(this.uniformLocation.time, nowTime);

    // トーラスの描画
    gl.uniformMatrix4fv(this.uniformLocation.mMatrix, false, m);
    gl.uniformMatrix4fv(this.uniformLocation.mvpMatrix, false, mvp);
    gl.uniformMatrix4fv(this.uniformLocation.normalMatrix, false, normalMatrix);
    gl.uniform3fv(this.uniformLocation.eyePosition, this.camera.position);
    gl.uniform1i(this.uniformLocation.isReceiveLight, true);

    // 光源位置の回転行列
    let lm = m4.identity();
    if (this.isRotation !== true) {
      lm = m4.rotate(lm, nowTime, rotateAxis)
    }
    gl.uniformMatrix4fv(this.uniformLocation.lightRotateMatrix, false, lm);

    WebGLUtility.enableBuffer(gl, this.torusVBO, this.attributeLocation, this.attributeStride, this.torusIBO);
    gl.drawElements(gl.TRIANGLES, this.torusGeometry.index.length, gl.UNSIGNED_SHORT, 0);

    // 光源の位置にsphereを配置
    for (let index = 0; index < lightPos.length; index++) {  
      let lm = m4.identity();
      if (this.isRotation !== true) {
        lm = m4.rotate(lm, nowTime, rotateAxis)
      }
      lm = m4.translate(lm, v3.create(...lightPos[index]))
      const lmvp = m4.multiply(vp, lm);
      const lnm = m4.transpose(m4.inverse(lm));
      gl.uniformMatrix4fv(this.uniformLocation.mMatrix, false, lm);
      gl.uniformMatrix4fv(this.uniformLocation.mvpMatrix, false, lmvp);
      gl.uniformMatrix4fv(this.uniformLocation.normalMatrix, false, lnm);
      gl.uniform3fv(this.uniformLocation.lightColor, lightColors[index]);
      gl.uniform1i(this.uniformLocation.isReceiveLight, false);
      WebGLUtility.enableBuffer(gl, this.sphereVBO, this.attributeLocation, this.attributeStride, this.sphereIBO);
      gl.drawElements(gl.TRIANGLES, this.sphereGeometry.index.length, gl.UNSIGNED_SHORT, 0);
    }
  }
}

