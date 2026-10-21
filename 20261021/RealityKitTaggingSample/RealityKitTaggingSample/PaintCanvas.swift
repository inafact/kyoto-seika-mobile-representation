import ARKit
import RealityKit
import UIKit
import Observation

/// 検出した平面の表示と、タッチ操作による塗りを管理する。
@Observable
final class PaintCanvas: NSObject {
    var paintColor: PaintColor = .red
    var brushSize: BrushSize = .medium
    var showsPlanes = true {
        didSet {
            for visual in planeVisuals.values {
                visual.isEnabled = showsPlanes
            }
        }
    }

    private(set) var detectedPlaneCount = 0
    private(set) var strokeCount = 0

    @ObservationIgnored private weak var arView: ARView?
    @ObservationIgnored private var planeVisuals: [UUID: AnchorEntity] = [:]
    @ObservationIgnored private var strokes: [Stroke] = []
    @ObservationIgnored private var activeStroke: Stroke?
    @ObservationIgnored private var strokeSerial = 0

    // MARK: - ARView との接続

    func attach(to arView: ARView) {
        self.arView = arView

        let configuration = ARWorldTrackingConfiguration()
        configuration.planeDetection = [.horizontal, .vertical]
        arView.session.delegate = self
        arView.session.run(configuration)

        // 平面が見つかるまで、端末の動かし方を案内する
        let coachingOverlay = ARCoachingOverlayView()
        coachingOverlay.session = arView.session
        coachingOverlay.goal = .anyPlane
        coachingOverlay.activatesAutomatically = true
        coachingOverlay.translatesAutoresizingMaskIntoConstraints = false
        arView.addSubview(coachingOverlay)
        NSLayoutConstraint.activate([
            coachingOverlay.leadingAnchor.constraint(equalTo: arView.leadingAnchor),
            coachingOverlay.trailingAnchor.constraint(equalTo: arView.trailingAnchor),
            coachingOverlay.topAnchor.constraint(equalTo: arView.topAnchor),
            coachingOverlay.bottomAnchor.constraint(equalTo: arView.bottomAnchor),
        ])

        // 触れた瞬間から指を離すまでを 1 本の線として扱うため、待ち時間 0 の長押しを使う
        let press = UILongPressGestureRecognizer(target: self, action: #selector(handlePress(_:)))
        press.minimumPressDuration = 0
        press.allowableMovement = .greatestFiniteMagnitude
        arView.addGestureRecognizer(press)
    }

    func detach(from arView: ARView) {
        arView.session.pause()
        arView.session.delegate = nil
    }

    // MARK: - 操作

    func undo() {
        guard let stroke = strokes.popLast() else { return }
        stroke.anchor.removeFromParent()
        strokeCount = strokes.count
    }

    func clear() {
        for stroke in strokes {
            stroke.anchor.removeFromParent()
        }
        strokes.removeAll()
        activeStroke = nil
        strokeCount = 0
    }

    // MARK: - タッチ処理

    @objc private func handlePress(_ gesture: UILongPressGestureRecognizer) {
        guard let arView else { return }
        let location = gesture.location(in: arView)

        switch gesture.state {
        case .began:
            beginStroke(at: location, in: arView)
        case .changed:
            if let activeStroke, let point = activeStroke.localPoint(at: location, in: arView) {
                activeStroke.add(point)
            }
        default:
            activeStroke = nil
        }
    }

    private func beginStroke(at location: CGPoint, in arView: ARView) {
        // 触れた位置にある、検出済みの平面を探す
        let results = arView.raycast(from: location, allowing: .existingPlaneGeometry, alignment: .any)
        guard let plane = results.lazy.compactMap({ $0.anchor as? ARPlaneAnchor }).first else { return }

        // 新しい線ほど少しだけ浮かせて、重なった部分がちらつかないようにする
        let height = 0.001 + Float(strokeSerial % 200) * 0.00005
        strokeSerial += 1

        let stroke = Stroke(
            planeTransform: plane.transform,
            color: paintColor.uiColor,
            radius: brushSize.radius,
            height: height
        )
        arView.scene.addAnchor(stroke.anchor)
        if let point = stroke.localPoint(at: location, in: arView) {
            stroke.add(point)
        }

        strokes.append(stroke)
        strokeCount = strokes.count
        activeStroke = stroke
    }

    // MARK: - 平面の表示

    private func makePlaneVisual(for plane: ARPlaneAnchor) {
        guard let mesh = try? MeshFactory.plane(plane.geometry) else { return }
        var material = UnlitMaterial(color: .white)
        material.blending = .transparent(opacity: 0.25)

        let anchor = AnchorEntity(anchor: plane)
        anchor.addChild(ModelEntity(mesh: mesh, materials: [material]))
        anchor.isEnabled = showsPlanes
        arView?.scene.addAnchor(anchor)
        planeVisuals[plane.identifier] = anchor
    }

    private func updatePlaneVisual(for plane: ARPlaneAnchor) {
        guard let model = planeVisuals[plane.identifier]?.children.first as? ModelEntity,
              let mesh = try? MeshFactory.plane(plane.geometry) else { return }
        model.model?.mesh = mesh
    }
}

// MARK: - ARSessionDelegate

extension PaintCanvas: ARSessionDelegate {
    func session(_ session: ARSession, didAdd anchors: [ARAnchor]) {
        for plane in anchors.compactMap({ $0 as? ARPlaneAnchor }) {
            makePlaneVisual(for: plane)
        }
        detectedPlaneCount = planeVisuals.count
    }

    func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
        for plane in anchors.compactMap({ $0 as? ARPlaneAnchor }) {
            updatePlaneVisual(for: plane)
        }
    }

    func session(_ session: ARSession, didRemove anchors: [ARAnchor]) {
        for plane in anchors.compactMap({ $0 as? ARPlaneAnchor }) {
            planeVisuals.removeValue(forKey: plane.identifier)?.removeFromParent()
        }
        detectedPlaneCount = planeVisuals.count
    }
}

// MARK: - Stroke

/// 指を置いてから離すまでに塗った 1 本の線。
///
/// 塗り始めた時点の平面の位置と向きを基準にしたローカル座標（XZ 平面）で点を持つ。
/// ARKit が平面を統合・削除しても線が消えないよう、平面のアンカーではなく
/// その時点の位置に固定したアンカーに置く。
private final class Stroke {
    let anchor: AnchorEntity

    private let planeTransform: simd_float4x4
    private let inversePlaneTransform: simd_float4x4
    private let material: UnlitMaterial
    private let radius: Float
    private let height: Float

    /// 1 つのメッシュに入れる円の上限。超えたら次のメッシュに分けて、作り直しの負荷を抑える
    private let maxStampsPerChunk = 300
    private var currentChunk: ModelEntity?
    private var currentStamps: [SIMD2<Float>] = []
    private var lastStamp: SIMD2<Float>?

    init(planeTransform: simd_float4x4, color: UIColor, radius: Float, height: Float) {
        self.planeTransform = planeTransform
        self.inversePlaneTransform = planeTransform.inverse
        self.material = UnlitMaterial(color: color)
        self.radius = radius
        self.height = height
        self.anchor = AnchorEntity(world: planeTransform)
    }

    /// 画面上の位置から視線を伸ばし、この線の平面と交わる点をローカル座標で返す。
    func localPoint(at location: CGPoint, in arView: ARView) -> SIMD2<Float>? {
        guard let ray = arView.ray(through: location) else { return nil }

        let origin = SIMD3<Float>(planeTransform.columns.3.x, planeTransform.columns.3.y, planeTransform.columns.3.z)
        let normal = SIMD3<Float>(planeTransform.columns.1.x, planeTransform.columns.1.y, planeTransform.columns.1.z)
        let denominator = dot(ray.direction, normal)
        guard abs(denominator) > 1e-4 else { return nil }

        let distance = dot(origin - ray.origin, normal) / denominator
        // 平面とほぼ平行に見ているときに、遠くまで線が飛ばないようにする
        guard distance > 0, distance < 10 else { return nil }

        let world = ray.origin + ray.direction * distance
        let local = inversePlaneTransform * SIMD4<Float>(world, 1)
        return SIMD2(local.x, local.z)
    }

    /// 点を追加する。前の点との間は、隙間ができない間隔で円を補う。
    func add(_ point: SIMD2<Float>) {
        let spacing = radius * 0.5

        if let lastStamp {
            let distance = simd_distance(lastStamp, point)
            guard distance >= spacing else { return }
            let steps = Int(distance / spacing)
            for step in 1...steps {
                appendStamp(lastStamp + (point - lastStamp) * (Float(step) / Float(steps)))
            }
        } else {
            appendStamp(point)
        }
        rebuildCurrentChunk()
    }

    private func appendStamp(_ stamp: SIMD2<Float>) {
        if currentStamps.count >= maxStampsPerChunk {
            rebuildCurrentChunk()
            currentChunk = nil
            // 継ぎ目に隙間ができないよう、直前の円から次のメッシュを始める
            currentStamps = lastStamp.map { [$0] } ?? []
        }
        currentStamps.append(stamp)
        lastStamp = stamp
    }

    private func rebuildCurrentChunk() {
        guard !currentStamps.isEmpty,
              let mesh = try? MeshFactory.brushStamps(centers: currentStamps, radius: radius, height: height)
        else { return }

        if let currentChunk {
            currentChunk.model?.mesh = mesh
        } else {
            let chunk = ModelEntity(mesh: mesh, materials: [material])
            anchor.addChild(chunk)
            currentChunk = chunk
        }
    }
}
