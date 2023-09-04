
attribute vec3 position;
attribute vec2 texCoord;

// uniform vec2 resolution;

varying vec3 vPosition;
varying vec2 vTexCoord;

void main() {

  vPosition = position;
  vTexCoord = texCoord;

  gl_Position = vec4(position, 1.0);
}

