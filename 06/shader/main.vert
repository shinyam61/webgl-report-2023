
attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;

uniform mat4 mMatrix;
uniform mat4 mvpMatrix;
uniform mat4 normalMatrix;
uniform mat4 lightRotateMatrix;
uniform float lightPos[12];

varying vec3 vPosition;
varying vec3 vNormal;
varying vec4 vColor;
varying float vLightPos[12];

void main() {

  // トーラスの拡大縮小・回転・移動後の座標を算出
  vPosition = (mMatrix * vec4(position, 1.0)).xyz;

  // 光源の位置を算出
  for (int i = 0; i < 4; i++) {
    vec3 lightPosRestore = vec3(lightPos[3 * i + 0], lightPos[3 * i + 1], lightPos[3 * i + 2]);
    mat4 translateMat = mat4(
      1.0, 0.0, 0.0, 0.0,
      0.0, 1.0, 0.0, 0.0,
      0.0, 0.0, 1.0, 0.0,
      lightPosRestore.x, lightPosRestore.y, lightPosRestore.z, 1.0
    );
    // 各色の光源位置
    vec3 rotatePos = (lightRotateMatrix * translateMat * vec4(vec3(.0), 1.0)).xyx;
    vLightPos[3 * i + 0] = rotatePos.x;
    vLightPos[3 * i + 1] = rotatePos.y;
    vLightPos[3 * i + 2] = rotatePos.z;
  }

  // 色はそのまま渡す
  vNormal = normal;
  vColor = color;

  // MVP 行列と頂点座標を乗算してから出力する
  // vPosition との違いは 
  // vPosition: ワールド座標系の原点からの距離（位置）
  // gl_Position: View座標系（カメラ位置を原点とした時）の原点からの距離（位置） ?? あってる？
  gl_Position = mvpMatrix * vec4(position, 1.0);
}

