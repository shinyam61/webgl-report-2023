precision mediump float;

uniform mat4 normalMatrix;
uniform vec3 eyePosition;
uniform float time;

uniform bool isReceiveLight;
uniform vec3 lightColor;
uniform vec3 lightPos[8];
uniform vec3 lightColors[8];

varying vec3 vPosition;
varying vec3 vNormal;
varying vec4 vColor;

void main() {
  float gamma = 1.0 / 2.2;
  vec4 color = vColor;
  if (isReceiveLight) {
    vec3 n = normalize(vec4(normalMatrix * vec4(normalize(vNormal), 1.0)).xyz);
    float d1 = dot(n, normalize(vec3(1.0)));
    // 0.0 ~ 0.5 に変換（ハイライトを見やすくするため）
    d1 = d1 * 0.25 + 0.25;

    // 視線ベクトル
    vec3 e = normalize(vPosition - eyePosition);
    // 視線ベクトルの反射ベクトル
    e = reflect(e, n);
    // 反射光
    vec3 s = vColor.rgb * d1;
    for(int i = 0; i < 8; i++) {
      float s1 = clamp(dot(e, normalize(lightPos[i])), 0.0, 1.0);
      s += lightColors[i] * pow(s1, 10.0);
    }

    // 最終出力
    color = vec4( s, vColor.a);
  } else {
    color = vec4(lightColor, 1.0);
  }
  vec3 rgb = pow(color.rgb, vec3(gamma));
  gl_FragColor = vec4(rgb, color.a);
}

