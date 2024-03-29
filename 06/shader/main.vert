
attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;

uniform mat4 mMatrix;
uniform mat4 mvpMatrix;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec4 vColor;

void main() {

  // トーラスの拡大縮小・回転・移動後の座標を算出
  vPosition = (mMatrix * vec4(position, 1.0)).xyz;

  // 色はそのまま渡す
  vNormal = normal;
  vColor = color;

  // MVP 行列と頂点座標を乗算してから出力する
  // vPosition との違いは 
  // vPosition: ワールド座標系の原点からの距離（位置）
  // gl_Position: View座標系（カメラ位置を原点とした時）の原点からの距離（位置） ?? あってる？
  gl_Position = mvpMatrix * vec4(position, 1.0);
}

