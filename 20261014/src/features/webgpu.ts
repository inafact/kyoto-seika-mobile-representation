import type { Feature } from '../lib/feature'
import { createKv, h, notice } from '../lib/dom'

const WGSL = /* wgsl */ `
struct Uniforms { angle: f32 };
@group(0) @binding(0) var<uniform> u: Uniforms;

struct VSOut { @builtin(position) pos: vec4f, @location(0) color: vec3f };

@vertex fn vs(@builtin(vertex_index) i: u32) -> VSOut {
  var p = array<vec2f, 3>(vec2f(0.0, 0.7), vec2f(-0.6, -0.5), vec2f(0.6, -0.5));
  var c = array<vec3f, 3>(vec3f(1.0, 0.3, 0.3), vec3f(0.3, 1.0, 0.4), vec3f(0.3, 0.5, 1.0));
  let s = sin(u.angle);
  let k = cos(u.angle);
  let v = p[i];
  var out: VSOut;
  out.pos = vec4f(v.x * k - v.y * s, v.x * s + v.y * k, 0.0, 1.0);
  out.color = c[i];
  return out;
}

@fragment fn fs(in: VSOut) -> @location(0) vec4f { return vec4f(in.color, 1.0); }
`

async function startWebGPU(canvas: HTMLCanvasElement, kv: ReturnType<typeof createKv>): Promise<() => void> {
  const adapter = await navigator.gpu.requestAdapter()
  if (!adapter) throw new Error('GPU アダプタを取得できません')
  const device = await adapter.requestDevice()
  const info = adapter.info
  kv.update({ 描画方式: 'WebGPU', ベンダー: info.vendor || '非公開', アーキテクチャ: info.architecture || '非公開' })

  const context = canvas.getContext('webgpu')!
  const format = navigator.gpu.getPreferredCanvasFormat()
  context.configure({ device, format, alphaMode: 'opaque' })

  const module = device.createShaderModule({ code: WGSL })
  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module, entryPoint: 'vs' },
    fragment: { module, entryPoint: 'fs', targets: [{ format }] },
    primitive: { topology: 'triangle-list' },
  })
  const uniform = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniform } }],
  })

  let raf = 0
  const frame = (t: number) => {
    device.queue.writeBuffer(uniform, 0, new Float32Array([t / 1000, 0, 0, 0]))
    const encoder = device.createCommandEncoder()
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.05, g: 0.07, b: 0.09, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    })
    pass.setPipeline(pipeline)
    pass.setBindGroup(0, bindGroup)
    pass.draw(3)
    pass.end()
    device.queue.submit([encoder.finish()])
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
  return () => {
    cancelAnimationFrame(raf)
    device.destroy()
  }
}

function startWebGL(canvas: HTMLCanvasElement, kv: ReturnType<typeof createKv>): () => void {
  const gl = canvas.getContext('webgl2')
  if (!gl) throw new Error('WebGL2 にも対応していません')
  const dbg = gl.getExtension('WEBGL_debug_renderer_info')
  kv.update({
    描画方式: 'WebGL2（フォールバック）',
    ベンダー: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
    アーキテクチャ: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
  })
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    return s
  }
  const prog = gl.createProgram()!
  gl.attachShader(
    prog,
    compile(
      gl.VERTEX_SHADER,
      `#version 300 es
      uniform float angle;
      out vec3 color;
      void main() {
        vec2 p[3] = vec2[](vec2(0.0, 0.7), vec2(-0.6, -0.5), vec2(0.6, -0.5));
        vec3 c[3] = vec3[](vec3(1.0, 0.3, 0.3), vec3(0.3, 1.0, 0.4), vec3(0.3, 0.5, 1.0));
        vec2 v = p[gl_VertexID];
        float s = sin(angle), k = cos(angle);
        gl_Position = vec4(v.x * k - v.y * s, v.x * s + v.y * k, 0.0, 1.0);
        color = c[gl_VertexID];
      }`,
    ),
  )
  gl.attachShader(
    prog,
    compile(
      gl.FRAGMENT_SHADER,
      `#version 300 es
      precision mediump float;
      in vec3 color;
      out vec4 outColor;
      void main() { outColor = vec4(color, 1.0); }`,
    ),
  )
  gl.linkProgram(prog)
  gl.useProgram(prog)
  const loc = gl.getUniformLocation(prog, 'angle')
  let raf = 0
  const frame = (t: number) => {
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0.05, 0.07, 0.09, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.uniform1f(loc, t / 1000)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
  return () => cancelAnimationFrame(raf)
}

export const webgpu: Feature = {
  id: 'webgpu',
  title: 'GPU 処理',
  api: 'WebGPU / WebGL',
  support: { ios: 'yes', android: 'yes' },
  note: 'WebGPU は Safari 26 で iOS・iPadOS でも提供開始。非対応環境では WebGL2 で描画する。',
  render(root) {
    const kv = createKv(['描画方式', 'ベンダー', 'アーキテクチャ'])
    const canvas = h('canvas', { width: '600', height: '600', style: 'aspect-ratio: 1; max-width: 400px; margin: 0 auto' })
    const panel = h('div', { class: 'panel' }, kv.el, canvas)
    root.append(panel)

    let stop: (() => void) | null = null
    let disposed = false
    const run = async () => {
      try {
        const s = 'gpu' in navigator ? await startWebGPU(canvas, kv) : startWebGL(canvas, kv)
        if (disposed) s()
        else stop = s
      } catch (err) {
        panel.append(notice(err instanceof Error ? err.message : String(err), 'error'))
      }
    }
    void run()
    return () => {
      disposed = true
      stop?.()
    }
  },
}
