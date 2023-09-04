precision mediump float;

uniform vec2 resolution;
uniform sampler2D textureUnit1;
uniform sampler2D noiseTexture;
uniform vec2 mouse;
uniform float time;

varying vec2 vTexCoord;

void main() {
  
  vec2 fSize = 1.0 / resolution; // フラグメントあたりの大きさ
  vec2 fc = gl_FragCoord.st;     // ピクセルサイズの座標
  vec2 texCoord = vec2(0.0);     // テクスチャ座標格納用

  float aspect = resolution.x / resolution.y;
  vec2 p = vec2(vTexCoord.x * aspect, vTexCoord.y);
  vec2 m = vec2(mouse.x * aspect, mouse.y);

  float distance = distance(p, m) * ( (sin(time * 10.0) / 2.0 + 2.0) );

  vec2 uv = vec2(vTexCoord.x, 1.0 - vTexCoord.y);
  vec4 color = texture2D(textureUnit1, uv);

  if (distance > .3) {
    color *= .4;
    texCoord = (fc + vec2(1.0, 0.0)) * fSize;  // 左にシフト
    color += vec4(texture2D(textureUnit1, texCoord).rgb * .16, 1.0);
    texCoord = (fc + vec2(-1.0, 0.0)) * fSize;  // 左にシフト
    color += vec4(texture2D(textureUnit1, texCoord).rgb * .16, 1.0);
    texCoord = (fc + vec2(2.0, 0.0)) * fSize;  // 左にシフト
    color += vec4(texture2D(textureUnit1, texCoord).rgb * .09, 1.0);
    texCoord = (fc + vec2(-2.0, 0.0)) * fSize;  // 左にシフト
    color += vec4(texture2D(textureUnit1, texCoord).rgb * .09, 1.0);
    texCoord = (fc + vec2(3.0, 0.0)) * fSize;  // 左にシフト
    color += vec4(texture2D(textureUnit1, texCoord).rgb * .05, 1.0);
    texCoord = (fc + vec2(-3.0, 0.0)) * fSize;  // 左にシフト
    color += vec4(texture2D(textureUnit1, texCoord).rgb * .05, 1.0);
    texCoord = (fc + vec2(1.0, 1.0)) * fSize;  // 左にシフト
    color += vec4(texture2D(textureUnit1, texCoord).rgb * .16, 1.0);
    texCoord = (fc + vec2(0.0, -1.0)) * fSize;  // 左にシフト
    color += vec4(texture2D(textureUnit1, texCoord).rgb * .16, 1.0);
    texCoord = (fc + vec2(0.0, 2.0)) * fSize;  // 左にシフト
    color += vec4(texture2D(textureUnit1, texCoord).rgb * .09, 1.0);
    texCoord = (fc + vec2(0.0, -2.0)) * fSize;  // 左にシフト
    color += vec4(texture2D(textureUnit1, texCoord).rgb * .09, 1.0);
    texCoord = (fc + vec2(0.0, 3.0)) * fSize;  // 左にシフト
    color += vec4(texture2D(textureUnit1, texCoord).rgb * .05, 1.0);
    texCoord = (fc + vec2(0.0, -3.0)) * fSize;  // 左にシフト
    color += vec4(texture2D(textureUnit1, texCoord).rgb * .05, 1.0);
    
    // 
    color = vec4(vec3(dot(color.rgb, vec3(.15))), 1.0);
  }

  gl_FragColor = color;
}

