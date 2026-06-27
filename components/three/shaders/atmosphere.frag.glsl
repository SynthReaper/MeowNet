// components/three/shaders/atmosphere.frag.glsl
varying vec3 vNormal;
uniform vec3  uColor;
uniform float uIntensity;

void main() {
  float rim = 1.0 - dot(normalize(vNormal), normalize(vec3(0.0, 0.0, 1.0)));
  float atm = pow(rim, 3.0) * uIntensity;
  gl_FragColor = vec4(uColor, atm);
}
