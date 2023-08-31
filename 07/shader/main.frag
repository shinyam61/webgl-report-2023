precision mediump float;

uniform vec2 resolution;
uniform sampler2D textureUnit1;
uniform vec2 mouse;

varying vec2 vTexCoord;


void main() {
  float aspect = resolution.x / resolution.y;
  vec2 p = vec2(vTexCoord.x * aspect, vTexCoord.y);
  vec2 m = vec2(mouse.x * aspect, mouse.y);
  // こちらでもヴィネットは正円になる
  // vec2 p = vec2(vTexCoord.x, vTexCoord.y / aspect);
  // vec2 m = vec2(mouse.x, mouse.y / aspect);

  // ピクセル座標とマウス座標との距離を算出
  float distance = distance(p, m);

  // テクスチャからピクセル座標を使って色を抽出（フレームバッファに書き込まれたテクスチャは上下が逆転）
  vec4 sampleColor = texture2D(textureUnit1, vec2(vTexCoord.x, 1.0 - vTexCoord.y));
  
  // マイナスの時は黒、プラスの時はsampleColorが見える
  float vignette = 1.0 - distance * 6.;
  // float vignette = 1.0 - smoothstep(.8, .9, distance * 10.);
  vec4 color = clamp(vec4(sampleColor.rgb * vignette, 1.0), 0.0, 1.0);

  gl_FragColor = color;
}

