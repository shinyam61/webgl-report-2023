precision mediump float;

uniform sampler2D textureUnit1;
uniform sampler2D textureUnit2;
uniform float time;
uniform int effect;
uniform vec2 mouse;
uniform vec2 resolution;
uniform sampler2D noiseTexture;

varying vec2 vTexCoord;

void main() {

  vec4 t1 = texture2D(textureUnit1, vTexCoord);
  vec4 t2 = texture2D(textureUnit2, vTexCoord);
  vec4 n = texture2D(noiseTexture, vTexCoord);


  float t = min(time, 1.0);
  float interpolation = t;

  if (effect == 0) {
    interpolation = pow(
      smoothstep(
        0.0, 
        1.0, 
        (t * 0.95 + n.x * 0.05 ) * 2.0 - vTexCoord.x
      ),
      5.0
    );
  } else if (effect == 1) {
    interpolation = pow(
      smoothstep(
        0.0, 
        1.0, 
        (t * 0.95 + n.x * 0.05 ) * 2.0 - vTexCoord.x
      ),
      10000.0
    );
  } else if (effect == 2) {
    interpolation = pow(
      smoothstep(
        0.0, 
        1.0, 
        (t * 0.95 + n.x * 0.05 ) * 2.0
      ),
      250.0
    );
  } else if (effect == 3) {
    interpolation = pow(
      smoothstep(
        0.0, 
        1.0, 
        (t * 0.95 + vTexCoord.x * 0.05 ) * 2.0 - n.x
      ),
      5.0
    );
  } else if (effect == 4) {
    interpolation = pow(
      smoothstep(
        0.0, 
        1.0, 
        (t * 0.95 + vTexCoord.x * 0.05 ) * 2.0 - n.x
      ),
      10000.0
    );
  } else if (effect == 5) {
    interpolation = pow(
      smoothstep(
        0.0, 
        1.0, 
        (t * 0.95 + vTexCoord.x * 0.05 ) * 2.0
      ),
      250.0
    );
  } else if (effect == 6) {
    interpolation = pow(
      smoothstep(
        0.0, 
        1.0, 
        (t * 0.95 + n.y * 0.05 ) * 2.0 - vTexCoord.y
      ),
      5.0
    );
  } else if (effect == 7) {
    interpolation = pow(
      smoothstep(
        0.0, 
        1.0, 
        (t * 0.95 + n.y * 0.05 ) * 2.0 - vTexCoord.y
      ),
      10000.0
    );
  }

  vec4 color = mix(t1, t2, interpolation);

  gl_FragColor = color;
  // gl_FragColor = texture2D(textureUnit1, vTexCoord - vTexCoord * vec2(1.,0) * time * 0.5);
}

