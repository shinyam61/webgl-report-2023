
attribute vec3 position;
attribute vec2 texCoord;

uniform mat4 mMatrix;
uniform mat4 mvpMatrix;

varying vec3 vPosition;
varying vec2 vTexCoord;

void main() {

  vPosition = (mMatrix * vec4(position, 1.0)).xyz;
  vTexCoord = texCoord;

  gl_Position = mvpMatrix * vec4(position, 1.0);
}

