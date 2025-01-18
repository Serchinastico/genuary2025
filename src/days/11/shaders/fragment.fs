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
uniform float u_thumbToIndexDistance;
uniform float u_thumbToMiddleDistance;
uniform float u_rightHandRotation;
uniform float u_leftHandRotation;

float displacement(in vec3 position)
{
    return 100. * sin(.02 * position.x) * sin(.02 * position.y) * sin(.02 * position.z);
}

float opDisplace(in vec3 position, in float distance)
{
    return distance + displacement(position);
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


float sdBox( vec3 p, vec3 b )
{
    vec3 q = abs(p) - b;
    return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float sdRoundBox( vec3 p, vec3 b, float r )
{
    vec3 q = abs(p) - b + r;
    return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0) - r;
}


vec2 _hash( vec2 p ) // replace this by something better
{
    p = vec2( dot(p,vec2(127.1,311.7)),
    dot(p,vec2(269.5,183.3)) );
    return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

float noise( vec2 p )
{
    const float K1 = 0.366025404; // (sqrt(3)-1)/2;
    const float K2 = 0.211324865; // (3-sqrt(3))/6;
    vec2 i = floor( p + (p.x+p.y)*K1 );

    vec2 a = p - i + (i.x+i.y)*K2;
    vec2 o = step(a.yx,a.xy);
    vec2 b = a - o + K2;
    vec2 c = a - 1.0 + 2.0*K2;
    vec3 h = max( 0.5-vec3(dot(a,a), dot(b,b), dot(c,c) ), 0.0 );
    vec3 n = h*h*h*h*vec3( dot(a,_hash(i+0.0)), dot(b,_hash(i+o)), dot(c,_hash(i+1.0)));
    return dot( n, vec3(70.0) );
}

// from https://www.shadertoy.com/view/4djSRW
float _hash13(vec3 p3)
{
    p3  = fract(p3 * .1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
}

vec3 _hash33(vec3 p3)
{
    p3 = fract(p3 * vec3(.1031,.11369,.13787));
    p3 += dot(p3, p3.yxz+19.19);
    return -1.0 + 2.0 * fract(vec3((p3.x + p3.y)*p3.z, (p3.x+p3.z)*p3.y, (p3.y+p3.z)*p3.x));
}

// simplex noise from https://www.shadertoy.com/view/4sc3z2
float noise(vec3 p)
{
    const float K1 = 0.333333333;
    const float K2 = 0.166666667;

    vec3 i = floor(p + (p.x + p.y + p.z) * K1);
    vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);

    // thx nikita: https://www.shadertoy.com/view/XsX3zB
    vec3 e = step(vec3(0.0), d0 - d0.yzx);
    vec3 i1 = e * (1.0 - e.zxy);
    vec3 i2 = 1.0 - e.zxy * (1.0 - e);

    vec3 d1 = d0 - (i1 - 1.0 * K2);
    vec3 d2 = d0 - (i2 - 2.0 * K2);
    vec3 d3 = d0 - (1.0 - 3.0 * K2);

    vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
    vec4 n = h * h * h * h * vec4(dot(d0, _hash33(i)), dot(d1, _hash33(i + i1)), dot(d2, _hash33(i + i2)), dot(d3, _hash33(i + 1.0)));

    return dot(vec4(31.316), n);
}

float fractalNoise(vec3 p, float falloff, int iterations) {
    float v = 0.0;
    float amp = 1.0;
    float invFalloff = 1.0/falloff;
    for (int i=0; i<10; i++) {
        v += noise(p)*amp;
        if (i>=iterations) break;
        amp *= invFalloff;
        p *= falloff;
    }
    return v;
}

float fractalNoise(vec3 p) {
    return fractalNoise(p, 2.5, 5);
}

float scene(vec3 position)
{
    position.z -= u_time * 4.;

    position.xyz = mod(position.xyz, 1.) - .5;


    //    float sphere1Dis = distance(q, vec3(0, 0, 0)) - .01;
    //    float sphere2Dis = distance(q, vec3(0.1, 0.1, 0)) - .05;
    //
    //    return opSmoothUnion(sphere1Dis, sphere2Dis, 0.5);


//    float d1 = sdSphere(position, .2);
//    pos.xy *= rot2D(0.025 * u_rightHandRotation);

    position.xy *= rot2D(0.05 * u_rightHandRotation);
    float d1 = sdRoundBox(position, vec3(.25 + .25 * u_thumbToIndexDistance), .05 + .4 * (1. - u_thumbToMiddleDistance));

//    float d1 = opSmoothSubtraction(
//        distance(position, vec3(0, 0, 0)) - .2,
//        distance(position, vec3(0.1, 0.1, 0)) - .1,
//        0.2);
//    float d2 = noise(position);

    return d1;
//    return 0.9 * (1.0 - u_thumbToMiddleDistance) * d1 + 0.1 * u_thumbToMiddleDistance * d2;
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
        position.xy *= rot2D(0.1 * u_leftHandRotation * distance * .15 * deformation.x);
        position.y += sin(0.01 * distance * .05 * (deformation.y + 1.));
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
    vec3 rd = (u_camInvProjMat * vec4(uv * 2. - 1., 0, 1)).xyz;
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
        gl_FragColor = vec4(vec3(1.0, 0.0, 0.0), 1);
    } else {
        // Calculate Diffuse model
        float dotNL = dot(n, u_lightDir);
        float diff = max(dotNL, 0.0) * u_diffIntensity;
        float spec = pow(diff, u_shininess) * u_specIntensity;
        float ambient = u_ambientIntensity;
        vec3 diffuse = u_lightColor * (vec3(0.2, 0.1, 1.) * (spec + ambient + diff));

        float fresnel = numIterations / float(u_maxSteps);

        vec3 color = .9 * vec3(fresnel) + .05 * diffuse + .05 * palette(disTravelled * .02);
        gl_FragColor = vec4(color, 1);// color output
    }
}
