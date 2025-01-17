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

float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p){
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u*u*(3.0-2.0*u);

    float res = mix(
    mix(rand(ip), rand(ip+vec2(1.0, 0.0)), u.x),
    mix(rand(ip+vec2(0.0, 1.0)), rand(ip+vec2(1.0, 1.0)), u.x), u.y);
    return res*res;
}

// 2D rotation function
mat2 rot2D(in float a) {
    return mat2(cos(a), -sin(a), sin(a), cos(a));
}

vec3 palette(in float t) {
    return .5+.5*cos(6.28318*(t+vec3(.3, .416, .557)));
}

float opExtrusion(in vec3 p, in float sdf, in float h)
{
    vec2 w = vec2(sdf, abs(p.z) - h);
    return min(max(w.x, w.y), 0.0) + length(max(w, 0.0));
}

vec2 opRevolution(in vec3 p, float w)
{
    return vec2(length(p.xz) - w, p.y);
}

vec4 opElongate(in vec3 p, in vec3 h)
{
    vec3 q = abs(p)-h;
    return vec4(max(q, 0.0), min(max(q.x, max(q.y, q.z)), 0.0));
}

float opRounding(in float d, in float h)
{
    return d - h;
}

float opUnion(in float d1, in float d2)
{
    return min(d1, d2);
}

float opSubtraction(in float d1, in float d2)
{
    return max(-d1, d2);
}

float opIntersection(in float d1, in float d2)
{
    return max(d1, d2);
}

float opXor(in float d1, in float d2)
{
    return max(min(d1, d2), -max(d1, d2));
}

float opSmoothUnion(in float d1, in float d2, in float k)
{
    float h = clamp(0.5 + 0.5*(d2-d1)/k, 0.0, 1.0);
    return mix(d2, d1, h) - k*h*(1.0-h);
}

float opSmoothSubtraction(in float d1, in float d2, in float k)
{
    float h = clamp(0.5 - 0.5*(d2+d1)/k, 0.0, 1.0);
    return mix(d2, -d1, h) + k*h*(1.0-h);
}

float opSmoothIntersection(in float d1, in float d2, in float k)
{
    float h = clamp(0.5 - 0.5*(d2-d1)/k, 0.0, 1.0);
    return mix(d2, d1, h) + k*h*(1.0-h);
}

float sdSphere(vec3 position, float radius)
{
    return length(position) - radius;
}

float scene(vec3 position)
{
    position.z -= u_time * 4.0;

    position.xyz = mod(position.xyz, 1.0) - .5;

    //    float sphere1Dis = distance(q, vec3(0, 0, 0)) - .01;
    //    float sphere2Dis = distance(q, vec3(0.1, 0.1, 0)) - .05;
    //
    //    return opSmoothUnion(sphere1Dis, sphere2Dis, 0.5);
    return sdSphere(position, 0.25);
}


vec2 rayMarch(vec3 rayOrigin, vec3 rayDirection)
{
    float distance = 0.;// total distance travelled
    float sceneDistance;// current scene distance
    vec3 position;// current position of ray
    int i = 0;
    vec2 deformation = vec2(cos(u_time * .2), sin(u_time * .2));

    for (i = 0; i < u_maxSteps; ++i) { // main loop
        position = rayOrigin + distance * rayDirection;// calculate new position
        position.xy *= rot2D(distance * .15 * deformation.x);
        position.y += sin(distance * .05 * (deformation.y + 1.)) * .05;
        sceneDistance = scene(position);// get scene distance

        // if we have hit anything or our distance is too big, break loop
        if (sceneDistance < u_eps || distance >= u_maxDis) break;

        // otherwise, add new scene distance to total distance
        distance += sceneDistance;
    }

    return vec2(distance, i);// finally, return scene distance
}

vec3 sceneCol(vec3 position) {
    float sphere1Dis = distance(position, vec3(cos(u_time), sin(u_time), 0)) - 1.;
    float sphere2Dis = distance(position, vec3(-sin(u_time), sin(u_time), 0.1 * sin(u_time))) - 0.5;

    float k = 0.5;// The same parameter used in the smin function in "scene"
    float h = clamp(0.5 + 0.5 * (sphere2Dis - sphere1Dis) / k, 0.0, 1.0);

    vec3 color1 = vec3(1, 0, 0);// Red
    vec3 color2 = vec3(0, 1, 1);// Blue

    return mix(color1, color2, h);
}

vec3 normal(vec3 position)// from https://iquilezles.org/articles/normalsSDF/
{
    vec3 n = vec3(0, 0, 0);
    vec3 e;
    for (int i = 0; i < 4; i++) {
        e = 0.5773 * (2.0 * vec3((((i + 3) >> 1) & 1), ((i >> 1) & 1), (i & 1)) - 1.0);
        n += e * scene(position + e * u_eps);
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
    vec2 marchResult = rayMarch(ro, rd);
    float disTravelled = marchResult.x;
    float numIterations = marchResult.y;

    // Find the hit position
    vec3 hp = ro + disTravelled * rd;

    // Get normal of hit point
    vec3 n = normal(hp);

    if (disTravelled >= u_maxDis) { // if ray doesn't hit anything
        gl_FragColor = vec4(u_clearColor, 1);
    } else {
        // Calculate Diffuse model
        //        float dotNL = dot(n, u_lightDir);
        //        float diff = max(dotNL, 0.0) * u_diffIntensity;
        //        float spec = pow(diff, u_shininess) * u_specIntensity;
        //        float ambient = u_ambientIntensity;
        //        vec3 color = u_lightColor * (sceneCol(hp) * (spec + ambient + diff));

        float fresnel = numIterations / float(u_maxSteps);

        vec3 color = 0.5 * vec3(fresnel) + 0.5 * palette(disTravelled * 0.04 + float(numIterations) * 0.005);
        gl_FragColor = vec4(color, 1);// color output
    }
}
