precision mediump float;

uniform sampler2D textureUnit1;
uniform sampler2D textureUnit2;
uniform float time;

varying vec2 vTexCoord;


void main() {

  vec4 t1 = texture2D(textureUnit1, vTexCoord);
  vec4 t2 = texture2D(textureUnit2, vTexCoord);

  gl_FragColor = mix(t1, t2, time);
  // gl_FragColor = texture2D(textureUnit1, vTexCoord - vTexCoord * vec2(1.,0) * time * 0.5);
}

