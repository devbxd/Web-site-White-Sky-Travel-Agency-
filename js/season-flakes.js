/* White Sky — real snow crystals falling through the page.
   Each flake is a photographed crystal on a 3D plane: it tumbles as it falls, foreshortens with
   perspective, and its relief catches a moving light. Sits behind the header, in front of content. */
(function () {
  "use strict";

  var canvas = document.createElement("canvas");
  canvas.className = "season-flakes";
  canvas.setAttribute("aria-hidden", "true");
  var gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: true });
  if (!gl) return;
  document.body.appendChild(canvas);

  var VS = [
    "#version 300 es",
    "precision highp float;",
    "in vec4 aSeed;",
    "uniform vec2 uView;uniform float uT,uScroll;",
    "out vec2 vUv;out mat3 vBasis;out float vFade;",
    "mat3 rx(float a){float c=cos(a),s=sin(a);return mat3(1,0,0,0,c,s,0,-s,c);}",
    "mat3 ry(float a){float c=cos(a),s=sin(a);return mat3(c,0,-s,0,1,0,s,0,c);}",
    "mat3 rz(float a){float c=cos(a),s=sin(a);return mat3(c,s,0,-s,c,0,0,0,1);}",
    "void main(){",
    "  vec2 corner=vec2(float(gl_VertexID&1),float((gl_VertexID>>1)&1))*2.-1.;",
    "  vec4 s=aSeed;",
    "  float depth=pow(s.w,4.6);",
    "  float size=(8.+depth*60.)*clamp(uView.x/1100.,.62,1.1);",
    "  float H=uView.y+size*3.;",
    "  float fall=(26.+depth*62.)*(.75+fract(s.x*7.3)*.5);",
    "  float y=mod(s.y*H+uT*fall+uScroll*(.1+depth*.35),H)-size*1.5;",
    "  float drift=sin(uT*(.22+s.z*.2)+s.x*40.)*(18.+depth*46.);",
    "  float x=s.x*(uView.x+size*2.)-size+drift;",
    /* tumble: real crystals rock and spin slowly as they fall */
    "  float t=uT*(.35+fract(s.z*9.1)*.5);",
    "  mat3 R=rz(t*.55+s.x*6.28)*rx(sin(t*.9+s.y*20.)*.72)*ry(cos(t*.7+s.z*20.)*.72);",
    "  vec3 p=R*vec3(corner*size,0.);",
    "  float w=1.+p.z/(size*3.6+260.);",
    "  vec2 px=vec2(x,y)+p.xy;",
    "  gl_Position=vec4((px.x/uView.x*2.-1.)*w,(1.-px.y/uView.y*2.)*w,0.,w);",
    "  vUv=corner*.5+.5;vUv.y=1.-vUv.y;",
    "  vBasis=R;",
    "  vFade=mix(.72,.92,smoothstep(0.,.2,depth));",
    "}"
  ].join("\n");

  var FS = [
    "#version 300 es",
    "precision highp float;",
    "in vec2 vUv;in mat3 vBasis;in float vFade;out vec4 o;",
    "uniform sampler2D uTex;uniform float uT;uniform vec2 uTexel;",
    "float lum(vec2 uv){vec4 c=texture(uTex,uv);return dot(c.rgb,vec3(.3,.59,.11));}",
    "void main(){",
    "  vec4 c=texture(uTex,vUv);",
    "  if(c.a<.004)discard;",
    /* the crystal's own relief becomes a surface that reacts to light */
    "  float dx=lum(vUv+vec2(uTexel.x,0.))-lum(vUv-vec2(uTexel.x,0.));",
    "  float dy=lum(vUv+vec2(0.,uTexel.y))-lum(vUv-vec2(0.,uTexel.y));",
    "  vec3 n=vBasis*normalize(vec3(-dx*5.,dy*5.,1.));",
    "  if(n.z<0.)n=-n;",
    "  vec3 l=normalize(vec3(sin(uT*.17)*.5-.25,.6,.72));",
    "  vec3 h=normalize(l+vec3(0.,0.,1.));",
    "  float diff=.82+.55*max(dot(n,l),0.);",
    "  float spec=pow(max(dot(n,h),0.),46.);",
    "  vec3 rgb=c.rgb*vec3(1.06,.98,.86)*diff+vec3(1.,.98,.92)*spec*1.5*c.a;",
    "  o=vec4(rgb,c.a)*vFade;",
    "}"
  ].join("\n");

  function shader(type, source) {
    var s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  var program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, VS));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FS));
  gl.bindAttribLocation(program, 0, "aSeed");
  gl.linkProgram(program);
  gl.useProgram(program);
  var u = {};
  ["uView", "uT", "uScroll", "uTex", "uTexel"].forEach(function (name) { u[name] = gl.getUniformLocation(program, name); });

  var COUNT = Math.round(Math.min(16, Math.max(8, innerWidth * innerHeight / 70000)));
  var seeds = new Float32Array(COUNT * 4);
  for (var i = 0; i < COUNT; i++) {
    seeds[i * 4] = (i + Math.random()) / COUNT;
    seeds[i * 4 + 1] = Math.random();
    seeds[i * 4 + 2] = Math.random();
    seeds[i * 4 + 3] = Math.random();
  }
  /* spread left-to-right evenly, but keep depth independent of position */
  var vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
  gl.vertexAttribDivisor(0, 1);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  function resize() {
    var ratio = Math.min(devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(innerWidth * ratio);
    canvas.height = Math.round(innerHeight * ratio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(u.uView, innerWidth, innerHeight);
  }
  addEventListener("resize", resize);
  resize();

  var image = new Image();
  image.onload = function () {
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    var aniso = gl.getExtension("EXT_texture_filter_anisotropic");
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
    gl.uniform1i(u.uTex, 0);
    gl.uniform2f(u.uTexel, 1.5 / image.width, 1.5 / image.height);
    canvas.classList.add("on");
    requestAnimationFrame(frame);
  };
  image.src = "assets/season/snowflake.webp";

  var clock = 40 + Math.random() * 400, last = 0;
  function frame(now) {
    if (document.hidden) { last = 0; requestAnimationFrame(frame); return; }
    clock += last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(u.uT, clock);
    gl.uniform1f(u.uScroll, scrollY);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, COUNT);
    requestAnimationFrame(frame);
  }
})();
