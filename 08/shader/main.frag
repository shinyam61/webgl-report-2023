precision mediump float;

uniform vec2 resolution;
uniform sampler2D textureUnit[9];
uniform sampler2D noiseTexture;
uniform vec2 mouse;
uniform float time;

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
  vec2 uv = fract(vec2(vTexCoord.x, 1.0 - vTexCoord.y) * 3.0);
  vec4 n = texture2D(noiseTexture, m);
  vec4 sampleColor = vec4(vec3(0.), 1.);
  if (vTexCoord.x < (1.0 / 3.0)) {
    if (vTexCoord.y < (1.0 / 3.0)) {
      sampleColor = texture2D(textureUnit[0], uv);
    } else if (vTexCoord.y < (2.0 / 3.0)) {
      sampleColor = texture2D(textureUnit[1], uv);
    } else {
      sampleColor = texture2D(textureUnit[2], uv);
    } 
  } else if (vTexCoord.x < (2.0 / 3.0)) {
    if (vTexCoord.y < (1.0 / 3.0)) {
      sampleColor = texture2D(textureUnit[3], uv);
    } else if (vTexCoord.y < (2.0 / 3.0)) {
      sampleColor = texture2D(textureUnit[4], uv);
    } else {
      sampleColor = texture2D(textureUnit[5], uv);
    } 
  } else {
    if (vTexCoord.y < (1.0 / 3.0)) {
      sampleColor = texture2D(textureUnit[6], uv);
    } else if (vTexCoord.y < (2.0 / 3.0)) {
      sampleColor = texture2D(textureUnit[7], uv);
    } else {
      sampleColor = texture2D(textureUnit[8], uv);
    } 
  }


  // float ripple = sin(distance * 30.0 - time * 4.0) * 2.0;
    
  //   // マウス位置に波紋を適用
  // vec3 color = sampleColor.rgb;
  // color += vec3(ripple, ripple * 0.5, -ripple);

  gl_FragColor = sampleColor;
}

