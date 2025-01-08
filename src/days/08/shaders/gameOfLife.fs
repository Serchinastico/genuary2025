uniform sampler2D uState;
uniform vec2 uScale;
uniform int uBornRnd;
uniform int uSurviveRnd;
uniform sampler2D uWeights;

#include "../../../common/utils.glsl";

void main() {
    int sum = getIntColorAt(-1, -1) +
    getIntColorAt(-1, 0) +
    getIntColorAt(-1, 1) +
    getIntColorAt(0, -1) +
    getIntColorAt(0, 1) +
    getIntColorAt(1, -1) +
    getIntColorAt(1, 0) +
    getIntColorAt(1, 1);
    
    int sumbit;
    if (sum == 0) {
        sumbit = 0;
    } else {
        sumbit = 1 << sum;
    }

    if ((sumbit & uBornRnd) > 0) {
        gl_FragColor = vec4(vec3(1.0), 1.0);
    } else if ((sumbit & uSurviveRnd) > 0) {
        vec4 current = getColorAt(0, 0);
        gl_FragColor = vec4(current.r, current.g * 0.95, 0.0, 1.0);
    } else {
        gl_FragColor = vec4(vec3(0.0), 1.0);
    }
}
