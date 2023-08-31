
// = 022 ======================================================================
// フレームバッファを活用すると、一度レンダリングしたシーンに対してブラー（つま
// りボカシ）を掛けることができます。
// 一般に、ボカシは非常にコストの高いポストエフェクトなので、様々な軽量化の手法
// が研究されていますが、ここでは「縦と横を別々にぼかすことで軽量化する」という
// テクニックを使っています。
// フレームバッファが２つ必要になることや、頻繁に行われるバインド・アンバインド
// がどうしても難しく感じるかと思いますが、落ち着いて手順を確認していきましょう。
// 順番としては、１．オフスクリーンレンダリング → ２．横方向ブラー → ３．縦方
// 向ブラー（この描画結果が画面に出る）、となります。
// ============================================================================

import { WebGLUtility }     from './webgl.js';
import { WebGLMath }        from './math.js';
import { WebGLGeometry }    from './geometry.js';
import { WebGLOrbitCamera } from './camera.js';
// import '../../lib/tweakpane-3.1.0.min.js';

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
  // const pane = new Tweakpane.Pane();
  // // ブラーの強さ @@@
  // pane.addBlade({
  //   view: 'slider',
  //   label: 'strength',
  //   min: 1.0,
  //   max: 200.0,
  //   value: 100.0,
  // })
  // .on('change', (v) => {
  //   app.calcGaussWeight(v.value);
  // });
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
    this.renderProgram = null;
    this.offscreenProgram = null;
    /**
     * attribute 変数のロケーションを保持する配列
     * @type {Array.<number>}
     */
    this.renderAttLocation = null;
    this.offscreenAttLocation = null;
    /**
     * attribute 変数のストライドの配列
     * @type {Array.<number>}
     */
    this.renderAttStride = null;
    this.offscreenAttStride = null;
    /**
     * uniform 変数のロケーションを保持するオブジェクト
     * @type {object.<WebGLUniformLocation>}
     */
    this.renderUniLocation = null;
    this.offscreenUniLocation = null;
    /**
     * plane ジオメトリの情報を保持するオブジェクト
     * @type {object}
     */
    this.planeGeometry = null;
    this.panelGeometry = null;
    /**
     * plane ジオメトリの VBO の配列
     * @type {Array.<WebGLBuffer>}
     */
    this.planeVBO = null;
    this.panelVBO = null;
    /**
     * plane ジオメトリの IBO
     * @type {WebGLBuffer}
     */
    this.planeIBO = null;
    this.panelIBO = null;
    /**
     * sphere ジオメトリの情報を保持するオブジェクト
     * @type {object}
     */
    this.sphereGeometry = null;
    /**
     * sphere ジオメトリの VBO の配列
     * @type {Array.<WebGLBuffer>}
     */
    this.sphereVBO = null;
    /**
     * sphere ジオメトリの IBO
     * @type {WebGLBuffer}
     */
    this.sphereIBO = null;
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
     * フレームバッファ関連オブジェクトの格納用（配列） @@@
     * @type {Array.<object>}
     */
    this.framebufferArray = [];
    /**
     * レンダリングを行うかどうかのフラグ
     * @type {boolean}
     */
    this.isRender = false;
    /**
     * スフィアに貼るテクスチャ格納用
     * @type {WebGLTexture}
     */
    this.texture1 = null;
    this.texture2 = null;
    /**
     * ガウシアンブラーの強さ @@@
     * @type {number}
     */
    this.gaussStrength = 100.0;
    /**
     * ガウス係数の配列 @@@
     * @type {Array.<number>}
     */
    this.gaussWeight = [];

    // this を固定するためのバインド処理
    this.resize = this.resize.bind(this);
    this.render = this.render.bind(this);

    this.offscreenMousepos = {
      x: 0, y: 0
    }
    this.mousepos = [.0, .0];
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

    // 最初に一度リサイズ処理を行っておく（ここで結果的にフレームバッファが生成される）
    this.resize();

    // リサイズイベントの設定
    window.addEventListener('resize', this.resize, false);

    // バックフェイスカリングと深度テストは初期状態で有効
    this.gl.enable(this.gl.CULL_FACE);
    this.gl.enable(this.gl.DEPTH_TEST);

    window.addEventListener('mousemove', (evt) => {
      const isOuter = evt.clientX < (window.innerWidth / 8)
      || evt.clientX > (window.innerWidth / 8) * 7
      || evt.clientY < (window.innerHeight / 8)
      || evt.clientY > (window.innerHeight / 8) * 7
      
      gsap.to(this.offscreenMousepos, {
        x: isOuter ? 0 : evt.clientX - (window.innerWidth / 2),
        y: isOuter ? 0 : (window.innerHeight / 2) - evt.clientY,
        duration: isOuter ? 1 : 3
      })

      this.mousepos = [
        (evt.clientX - (window.innerWidth / 2)) / (window.innerWidth / 2),
        ((window.innerHeight / 2) - evt.clientY) / (window.innerHeight / 2)
      ]
    })
  }

  /**
   * リサイズ処理
   */
  resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.hypotenuseLenght = Math.sqrt(Math.pow(window.innerWidth, 2) + Math.pow(window.innerHeight, 2))

    // フレームバッファもサイズをキャンバスに合わせる
    if (this.framebufferArray != null) {
      this.framebufferArray.forEach((buffer) => {
        WebGLUtility.deleteFramebuffer(
          this.gl,
          buffer.framebuffer,
          buffer.renderbuffer,
          buffer.texture,
        );
      });
    }

    // 削除したあとに新しくフレームバッファを生成する
    this.framebufferArray = [
      WebGLUtility.createFramebuffer(this.gl, this.canvas.width, this.canvas.height),
      WebGLUtility.createFramebuffer(this.gl, this.canvas.width, this.canvas.height),
    ];
  }

  /**
   * 各種リソースのロードを行う
   * @return {Promise}
   */
  load() {
    return new Promise((resolve, reject) => {
      const gl = this.gl;
      if (gl == null) {
        const error = new Error('not initialized');
        reject(error);
      } else {
        let vs = null;
        let fs = null;
        WebGLUtility.loadFile('./shader/offscreen.vert')
        .then((vertexShaderSource) => {
          vs = WebGLUtility.createShaderObject(gl, vertexShaderSource, gl.VERTEX_SHADER);
          return WebGLUtility.loadFile('./shader/offscreen.frag');
        })
        .then((fragmentShaderSource) => {
          fs = WebGLUtility.createShaderObject(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
          this.offscreenProgram = WebGLUtility.createProgramObject(gl, vs, fs);
          return WebGLUtility.loadFile('./shader/main.vert')
        })
        .then((vertexShaderSource) => {
          vs = WebGLUtility.createShaderObject(gl, vertexShaderSource, gl.VERTEX_SHADER);
          return WebGLUtility.loadFile('./shader/main.frag');
        })
        .then((fragmentShaderSource) => {
          fs = WebGLUtility.createShaderObject(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
          this.renderProgram = WebGLUtility.createProgramObject(gl, vs, fs);
          return WebGLUtility.loadImage('./images/1007.png');
        })
        .then((image) => {
          this.texture1 = WebGLUtility.createTexture(gl, image);
          return WebGLUtility.loadImage('./images/1008.png');
        })
        .then((image) => {
          this.texture2 = WebGLUtility.createTexture(gl, image);
          // Promise を解決
          resolve();
        });
      }
    });
  }


  /**
   * 頂点属性（頂点ジオメトリ）のセットアップを行う
   */
  setupGeometry() {
    const color = [1.0, 1.0, 1.0, 1.0];

    // plane は this.renderProgram と一緒に使う
    const size = 2.0;
    this.planeGeometry = WebGLGeometry.plane(size, size, color);
    this.planeVBO = [
      WebGLUtility.createVBO(this.gl, this.planeGeometry.position),
      WebGLUtility.createVBO(this.gl, this.planeGeometry.texCoord),
    ];
    this.planeIBO = WebGLUtility.createIBO(this.gl, this.planeGeometry.index);

    this.panelGeometry = WebGLGeometry.plane(size, size, [1.0, 1.0, 1.0, .0]);
    this.panelVBO = [
      WebGLUtility.createVBO(this.gl, this.panelGeometry.position),
      WebGLUtility.createVBO(this.gl, this.panelGeometry.texCoord),
    ];
    this.panelIBO = WebGLUtility.createIBO(this.gl, this.panelGeometry.index);
  }

  /**
   * 頂点属性のロケーションに関するセットアップを行う
   */
  setupLocation() {
    const gl = this.gl;
    // レンダリング用のセットアップ
    this.offscreenAttLocation = [
      gl.getAttribLocation(this.offscreenProgram, 'position'),
      gl.getAttribLocation(this.offscreenProgram, 'texCoord'),
    ];
    this.offscreenAttStride = [3, 2];
    this.offscreenUniLocation = {
      mMatrix: gl.getUniformLocation(this.offscreenProgram, 'mMatrix'), // 
      mvpMatrix: gl.getUniformLocation(this.offscreenProgram, 'mvpMatrix'), // 
      textureUnit1: gl.getUniformLocation(this.offscreenProgram, 'textureUnit1'), // テクスチャユニット
      textureUnit2: gl.getUniformLocation(this.offscreenProgram, 'textureUnit2'), // テクスチャユニット
      time: gl.getUniformLocation(this.offscreenProgram, 'time'),   // 
    };

    this.renderAttLocation = [
      gl.getAttribLocation(this.renderProgram, 'position'),
      gl.getAttribLocation(this.renderProgram, 'texCoord'),
    ];
    this.renderAttStride = [3, 2];
    this.renderUniLocation = {
      // mMatrix: gl.getUniformLocation(this.renderProgram, 'mMatrix'), // 
      // mvpMatrix: gl.getUniformLocation(this.renderProgram, 'mvpMatrix'), // 
      textureUnit1: gl.getUniformLocation(this.renderProgram, 'textureUnit1'), // テクスチャユニット
      mouse: gl.getUniformLocation(this.renderProgram, 'mouse'), // テクスチャユニット
      // time: gl.getUniformLocation(this.renderProgram, 'time'),   // 
    };
  }

  /**
   * 一番最初のオフスクリーンレンダリングのためのセットアップを行う @@@
   * ※まず最初にフレームバッファ[0] に普通にシーンをレンダリングする
   */
  setupFirstOffscreenRendering() {
    const gl = this.gl;
    // ０番目のフレームバッファをバインドして描画の対象とする
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebufferArray[0].framebuffer);
    // ビューポートを設定する
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    // クリアする色と深度を設定する
    gl.clearColor(.5, .5, .5, 1.0);
    gl.clearDepth(1.0);
    // 色と深度をクリアする
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // プログラムオブジェクトを選択
    gl.useProgram(this.offscreenProgram);
    // スフィアに貼るテクスチャをバインドする
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.texture2);
  }

  setupSecondOffscreenRendering() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // １番目のフレームバッファをバインドして描画の対象とする
    // gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebufferArray[1].framebuffer);
    // 色と深度をクリアする
    gl.clearColor(1.0, .0, .0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // プログラムオブジェクトを選択
    gl.useProgram(this.renderProgram);
    // setupFirstOffscreenRendering で描画した結果をバインドする
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.framebufferArray[0].texture);
  }

  /**
   * 描画を開始する
   */
  start() {
    const gl = this.gl;
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

    // - 一番最初のオフスクリーンレンダリング ---------------------------------
    {
      // レンダリングのセットアップ
      this.setupFirstOffscreenRendering();

      const v = this.camera.update();
      const fovy   = 45;
      const aspect = window.innerWidth / window.innerHeight;
      const near   = 0.1
      const far    = 10.0;
      const p = m4.perspective(fovy, aspect, near, far);

      const vp = m4.multiply(p, v);
      const mousePosCross = v3.cross([this.offscreenMousepos.x, this.offscreenMousepos.y, .0], [.0, .0, 1.0]);
      const mousePosLength = v3.length([this.offscreenMousepos.x, this.offscreenMousepos.y, .0]);
      const angle = mousePosLength / (this.hypotenuseLenght / 2);
      const m = mousePosLength 
        ? m4.rotate(m4.identity(), -angle, mousePosCross)
        : m4.identity();
      const mvp = m4.multiply(vp, m);

      // VBO と IBO
      WebGLUtility.enableBuffer(gl, this.planeVBO, this.offscreenAttLocation, this.offscreenAttStride, this.planeIBO);
      // シェーダに各種パラメータを送る
      gl.uniformMatrix4fv(this.offscreenUniLocation.mMatrix, false, m);
      gl.uniformMatrix4fv(this.offscreenUniLocation.mvpMatrix, false, mvp);
      gl.uniform1i(this.offscreenUniLocation.textureUnit1, 0);
      gl.uniform1i(this.offscreenUniLocation.textureUnit2, 1);
      gl.uniform1f(this.offscreenUniLocation.time, (Math.sin(nowTime) + 1.0) / 2.0);

      // 描画
      gl.drawElements(gl.TRIANGLES, this.planeGeometry.index.length, gl.UNSIGNED_SHORT, 0);
    }
    // ------------------------------------------------------------------------

    {
      this.setupSecondOffscreenRendering()

      WebGLUtility.enableBuffer(gl, this.panelVBO, this.renderAttLocation, this.renderAttStride, this.panelIBO);
      // シェーダに各種パラメータを送る
      gl.uniform1i(this.renderUniLocation.textureUnit1, 0);
      gl.uniform2fv(this.renderUniLocation.mouse, this.mousepos);
      gl.uniform2fv(this.renderUniLocation.resolution, [this.canvas.width, this.canvas.height]);
      // 描画
      gl.drawElements(gl.TRIANGLES, this.panelGeometry.index.length, gl.UNSIGNED_SHORT, 0);
    }

  }
}

