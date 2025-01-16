precision mediump float;

// From vertex shader
in vec2 vUv;

// From CPU
uniform vec3 u_clearColor;

uniform float u_eps;
uniform float u_maxDis;
uniform int u_maxSteps;

uniform vec3 u_camPos;
uniform mat4 u_camToWorldMat;
uniform mat4 u_camInvProjMat;

uniform vec3 u_lightDir;
uniform vec3 u_lightColor;

uniform float u_diffIntensity;
uniform float u_specIntensity;
uniform float u_ambientIntensity;
uniform float u_shininess;

uniform float u_time;

float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

float scene(vec3 p) {
    // distance to sphere 1
    float sphere1Dis = distance(p, vec3(cos(u_time), sin(u_time), 0)) - 1.;

    // distance to sphere 2
    float sphere2Dis = distance(p, vec3(sin(u_time), cos(u_time), 0)) - 0.75;

    // return the minimum distance between the two spheres smoothed by 0.5
    return smin(sphere1Dis, sphere2Dis, 0.5);
}
float rayMarch(vec3 ro, vec3 rd)
{
    float d = 0.;// total distance travelled
    float cd;// current scene distance
    vec3 p;// current position of ray

    for (int i = 0; i < u_maxSteps; ++i) { // main loop
        p = ro + d * rd;// calculate new position
        cd = scene(p);// get scene distance

        // if we have hit anything or our distance is too big, break loop
        if (cd < u_eps || d >= u_maxDis) break;

        // otherwise, add new scene distance to total distance
        d += cd;
    }

    return d;// finally, return scene distance
}

vec3 sceneCol(vec3 p) {
    float sphere1Dis = distance(p, vec3(cos(u_time), sin(u_time), 0)) - 1.;
    float sphere2Dis = distance(p, vec3(sin(u_time), cos(u_time), 0)) - 0.75;

    float k = 0.5;// The same parameter used in the smin function in "scene"
    float h = clamp(0.5 + 0.5 * (sphere2Dis - sphere1Dis) / k, 0.0, 1.0);

    vec3 color1 = vec3(1, 0, 0);// Red
    vec3 color2 = vec3(0, 0, 1);// Blue

    return mix(color1, color2, h);
}

vec3 normal(vec3 p)// from https://iquilezles.org/articles/normalsSDF/
{
    vec3 n = vec3(0, 0, 0);
    vec3 e;
    for (int i = 0; i < 4; i++) {
        e = 0.5773 * (2.0 * vec3((((i + 3) >> 1) & 1), ((i >> 1) & 1), (i & 1)) - 1.0);
        n += e * scene(p + e * u_eps);
    }
    return normalize(n);
}

void main() {
    // Get UV from vertex shader
    vec2 uv = vUv.xy;

    // Get ray origin and direction from camera uniforms
    vec3 ro = u_camPos;
    vec3 rd = (u_camInvProjMat * vec4(uv*2.-1., 0, 1)).xyz;
    rd = (u_camToWorldMat * vec4(rd, 0)).xyz;
    rd = normalize(rd);

    // Ray marching and find total distance travelled
    float disTravelled = rayMarch(ro, rd);// use normalized ray

    // Find the hit position
    vec3 hp = ro + disTravelled * rd;

    // Get normal of hit point
    vec3 n = normal(hp);

    if (disTravelled >= u_maxDis) { // if ray doesn't hit anything
        gl_FragColor = vec4(u_clearColor, 1);
    } else { // if ray hits something
        // Calculate Diffuse model
        float dotNL = dot(n, u_lightDir);
        float diff = max(dotNL, 0.0) * u_diffIntensity;
        float spec = pow(diff, u_shininess) * u_specIntensity;
        float ambient = u_ambientIntensity;

        vec3 color = u_lightColor * (sceneCol(hp) * (spec + ambient + diff));
        gl_FragColor = vec4(color, 1);// color output
    }
}
