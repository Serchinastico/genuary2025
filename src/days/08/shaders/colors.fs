uniform sampler2D uState;
uniform vec2 uScale;
uniform int uBornRnd;
uniform int uSurviveRnd;
uniform sampler2D uWeights;
uniform int uFrame;

#include "../../../common/utils.glsl";

void main() {
    vec4 innerSum = getColorAt(-1, -1) +
    getColorAt(-1, 0) +
    getColorAt(-1, 1) +
    getColorAt(0, -1) +
    getColorAt(0, 1) +
    getColorAt(1, -1) +
    getColorAt(1, 0) +
    getColorAt(1, 1);

    vec4 outerSum = getColorAt(-2, -2) +
    getColorAt(-2, -1) +
    getColorAt(-2, 0) +
    getColorAt(-2, 1) +
    getColorAt(-2, 2) +
    getColorAt(-1, 2) +
    getColorAt(0, 2) +
    getColorAt(1, 2) +
    getColorAt(2, 2) +
    getColorAt(2, 1) +
    getColorAt(2, 0) +
    getColorAt(2, -1) +
    getColorAt(2, -2) +
    getColorAt(1, -2) +
    getColorAt(0, -2) +
    getColorAt(-1, -2);

    vec4 weightsSum = innerSum / 8.0 + outerSum / 16.0;

    vec4 color = getColorAt(0, 0);

    vec2 st = gl_FragCoord.xy/vec2(1000.0);
    vec2 pos = vec2(st*5.0);

    float redNoise = snoise(vec3(pos, float(uFrame) * 0.01));
    float greenNoise = snoise(vec3(pos.yx, float(uFrame) * 0.01));
    float blueNoise = snoise(vec3(pos.xy + vec2(100, 100), float(uFrame) * 0.01));

    vec3 value = vec3(
    clamp(weightsSum.r * 0.5 + color.r * color.g + 0.1 * redNoise, 0.0, 1.0),
    clamp(weightsSum.g * 0.5 + color.r * color.g + 0.1 * greenNoise, 0.0, 1.0),
    clamp(weightsSum.b * 0.5 + color.r * color.g + 0.1 * blueNoise, 0.0, 1.0));

    gl_FragColor = vec4(value, 1.0);
}
