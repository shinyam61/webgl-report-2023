precision mediump float;

uniform vec2 resolution;
uniform sampler2D textureUnit1;
uniform vec2 mouse;

varying vec2 vTexCoord;


void main() {
  // vec2 r = resolution;
  float distance = distance(vTexCoord, vec2((mouse.x + 1.0) / 2.0, (-mouse.y + 1.0) / 2.0));

  vec4 sampleColor = texture2D(textureUnit1, vec2(vTexCoord.x, 1.0 - vTexCoord.y));
  
  float vignette = 1.0 - distance * 4.;
  vec4 color = clamp(vec4(sampleColor.rgb * vignette, 1.0), 0.0, 1.0);

  gl_FragColor = color;
}

