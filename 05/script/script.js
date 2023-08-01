
// = 004 ======================================================================
// このサンプルは、最初の状態では 003 とまったく同じ内容です。
// これを、みなさん自身の手で修正を加えて「描かれる図形を五角形に」してみてくだ
// さい。
// そんなの余裕じゃろ～ と思うかも知れませんが……結構最初は難しく感じる人も多い
// かもしれません。なお、正確な正五角形でなくても構いません。
// ポイントは以下の点を意識すること！
// * canvas 全体が XY 共に -1.0 ～ 1.0 の空間になっている
// * gl.TRIANGLES では頂点３個がワンセットで１枚のポリゴンになる
// * つまりいくつかの頂点は「まったく同じ位置に重複して配置される」ことになる
// * 頂点座標だけでなく、頂点カラーも同じ個数分必要になる
// * 物足りない人は、星型や円形などに挑戦してみてもいいかもしれません
// ============================================================================

// モジュールを読み込み
import { WebGLUtility } from './webgl.js';

// ドキュメントの読み込みが完了したら実行されるようイベントを設定する
window.addEventListener('DOMContentLoaded', () => {
  // アプリケーションのインスタンスを初期化し、必要なリソースをロードする
  const app = new App();
  app.init();
  app.load()
  .then(() => {
    // ジオメトリセットアップ
    app.setupGeometry();
    // ロケーションのセットアップ
    app.setupLocation();

    // セットアップが完了したら描画を開始する
    app.start();
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
    /**
     * uniform 変数のロケーションを保持するオブジェクト
     * @type {object.<WebGLUniformLocation>}
     */
    this.uniformLocation = null;
    /**
     * 頂点の座標を格納する配列
     * @type {Array.<number>}
     */
    this.position = null;
    /**
     * 頂点の座標を構成する要素数（ストライド）
     * @type {number}
     */
    this.positionStride = null;
    /**
     * 座標の頂点バッファ
     * @type {WebGLBuffer}
     */
    this.positionVBO = null;
    /**
     * 頂点の色を格納する配列
     * @type {Array.<number>}
     */
    this.color = null;
    /**
     * 頂点の色を構成する要素数（ストライド）
     * @type {number}
     */
    this.colorStride = null;
    /**
     * 色の頂点バッファ
     * @type {WebGLBuffer}
     */
    this.colorVBO = null;
    /**
     * レンダリング開始時のタイムスタンプ
     * @type {number}
     */
    this.startTime = null;
    /**
     * レンダリングを行うかどうかのフラグ
     * @type {boolean}
     */
    this.isRender = false;

    // this を固定するためのバインド処理
    this.render = this.render.bind(this);

    this.changePolygonShape = true;
    this.up = true;

    this.polygonInterval = 1000;
    this.lastTime = 0;

    this.coefficient = 1;
  }

  /**
   * 初期化処理を行う
   */
  init() {
    // canvas エレメントの取得と WebGL コンテキストの初期化
    this.canvas = document.getElementById('webgl-canvas');
    this.gl = WebGLUtility.createWebGLContext(this.canvas);

    // canvas のサイズを設定
    const size = Math.min(window.innerWidth, window.innerHeight);
    this.canvas.width  = size;
    this.canvas.height = size;

    document.querySelectorAll('input').forEach(inputEl => {
      inputEl.addEventListener('change', () => {
        console.log(inputEl.value)
        this.changePolygonShape = inputEl.value == 'polygon';
      })
    })
  }

  /**
   * 各種リソースのロードを行う
   * @return {Promise}
   */
  load() {
    return new Promise((resolve, reject) => {
      // 変数に WebGL コンテキストを代入しておく（コード記述の最適化）
      const gl = this.gl;
      // WebGL コンテキストがあるかどうか確認する
      if (gl == null) {
        // もし WebGL コンテキストがない場合はエラーとして Promise を reject する
        const error = new Error('not initialized');
        reject(error);
      } else {
        let vs = null;
        let fs = null;
        // まず頂点シェーダのソースコードを読み込む
        WebGLUtility.loadFile('./shader/main.vert')
        .then((vertexShaderSource) => {
          vs = WebGLUtility.createShaderObject(gl, vertexShaderSource, gl.VERTEX_SHADER);
          return WebGLUtility.loadFile('./shader/main.frag');
        })
        .then((fragmentShaderSource) => {
          fs = WebGLUtility.createShaderObject(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
          this.program = WebGLUtility.createProgramObject(gl, vs, fs);

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
    this.polygon = 3;
    this.createPositionVbo();
    this.createColorVbo();
  }
  createPositionVbo () {
    // 頂点座標の定義
    this.position = this.createPositionDefine();
   // 要素数は XYZ の３つ
   this.positionStride = 3;
   // VBO を生成
   this.positionVBO = WebGLUtility.createVBO(this.gl, this.position);
  }
  createPositionDefine() {

    const posNum = this.polygon * 2;
    const angle = (360 / posNum) * (Math.PI / 180);
    const radius = .5;
    const position = [...Array(posNum)].map((_, idx) => {
      const center = [0,0,0];
      const longPos = idx % 2 == 0
        ? [radius * Math.cos(angle * idx), radius * Math.sin(angle * idx), 0]
        : [(radius * Math.cos(angle)) * Math.cos(angle * idx) * this.coefficient, (radius * Math.cos(angle)) * Math.sin(angle * idx) * this.coefficient, 0]
      const shortPos = idx % 2 == 0
        ? [(radius * Math.cos(angle)) * Math.cos(angle * (idx + 1)) * this.coefficient, (radius * Math.cos(angle)) * Math.sin(angle * (idx + 1)) * this.coefficient, 0]
        : [radius * Math.cos(angle * (idx + 1)), radius * Math.sin(angle * (idx + 1)), 0]
      return [
        center,
        longPos,
        shortPos
      ].flat();
    }).flat()

    return position;
  }
  createColorVbo () {
    // 頂点の色の定義
    this.color = this.createColorDefine();
    // 要素数は RGBA の４つ
    this.colorStride = 4;
    // VBO を生成
    this.colorVBO = WebGLUtility.createVBO(this.gl, this.color);
  }
  createColorDefine() {

    const posNum = this.polygon * 2;
    const angle = (360 / posNum);
    const color = [...Array(posNum)].map((_, idx) => {
      const center = [1.0, 1.0, 1.0, 1.0];
      const longPos = this.hsl2Rgb(angle * idx).map(color => color / 255)
      longPos.push(1.0)
      const shortPos = this.hsl2Rgb(angle * (idx + 1)).map(color => color / 255)
      shortPos.push(1.0)
      return [
        center,
        longPos,
        shortPos
      ].flat();
    }).flat()

    return color;
  }

  /**
   * 頂点属性のロケーションに関するセットアップを行う
   */
  setupLocation() {
    const gl = this.gl;
    // attribute location の取得
    this.attPosition = gl.getAttribLocation(this.program, 'position');
    this.attColor = gl.getAttribLocation(this.program, 'color');
    // attribute location の有効化
    this.connectAttributeVbo();
    // uniform location の取得
    this.uniformLocation = {
      time: gl.getUniformLocation(this.program, 'time'),
    };
  }

  connectAttributeVbo () {
    WebGLUtility.enableAttribute(this.gl, this.positionVBO, this.attPosition, this.positionStride);
    WebGLUtility.enableAttribute(this.gl, this.colorVBO, this.attColor, this.colorStride);
  }

  /**
   * レンダリングのためのセットアップを行う
   */
  setupRendering() {
    const gl = this.gl;
    // ビューポートを設定する
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    // クリアする色を設定する（RGBA で 0.0 ～ 1.0 の範囲で指定する）
    gl.clearColor(0.3, 0.3, 0.3, 1.0);
    // 実際にクリアする（gl.COLOR_BUFFER_BIT で色をクリアしろ、という指定になる）
    gl.clear(gl.COLOR_BUFFER_BIT);
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

    // setInterval(() => {

    //   console.log(this.changePolygonShape, this.polygon)
      
    //   this.createPositionVbo();
    //   this.createColorVbo();
    //   this.setupLocation();

    // }, 2000)      

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

    // レンダリングのフラグの状態を見て、requestAnimationFrame を呼ぶか決める
    if (this.isRender === true) {
      requestAnimationFrame(this.render);
    }

    if (this.changePolygonShape) {
      const timestamp = Date.now();
      if (timestamp - this.lastTime >= this.polygonInterval) {

        this.polygon = this.up 
          ? this.polygon + 1
          : this.polygon - 1
  
        if ([3, 10].includes(this.polygon)) {
          this.up = !this.up;
        }

        this.createPositionVbo();
        this.createColorVbo();
        this.setupLocation();   
        
        this.lastTime = timestamp;
      }
    } else {
      this.coefficient = Math.max(.5, Math.min(this.coefficient + 0.01 * (this.up ? 1 : -1), 1.5));
      if ([.5, 1.5].includes(this.coefficient)) {
        this.up = !this.up;
      }
      console.log(this.coefficient);
      this.createPositionVbo();
      this.createColorVbo();
      this.setupLocation();   
    }


    // ビューポートの設定やクリア処理は毎フレーム呼び出す
    this.setupRendering();
    // 現在までの経過時間を計算し、秒単位に変換する
    const nowTime = (Date.now() - this.startTime) * 0.001;
    // プログラムオブジェクトを選択
    gl.useProgram(this.program);

    // ロケーションを指定して、uniform 変数の値を更新する（GPU に送る）
    gl.uniform1f(this.uniformLocation.time, nowTime);
    // ドローコール（描画命令）
    gl.drawArrays(gl.TRIANGLES, 0, this.position.length / this.positionStride);
  }

  hsl2Rgb(h, s = 100, l = 50) {
    h /= 360; // Hを0から1の範囲に変換
    s /= 100; // Sを0から1の範囲に変換
    l /= 100; // Lを0から1の範囲に変換
  
    let r, g, b;
  
    if (s === 0) {
      r = g = b = l; // Sが0の場合はRGBはすべてLと同じ値になります
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
  
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
  
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }
  
}

