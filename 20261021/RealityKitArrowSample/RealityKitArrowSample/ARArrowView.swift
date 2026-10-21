import SwiftUI
import RealityKit
import ARKit
import Combine

/// カメラ映像の上に、指定した方位を指す 3D 矢印を常に表示する AR ビュー。
struct ARArrowView: UIViewRepresentable {
    /// 真北から時計回りの方位角（ラジアン）。nil の場合は矢印を非表示にする。
    var bearing: Double?

    static var isSupported: Bool { ARWorldTrackingConfiguration.isSupported }

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> ARView {
        let arView = ARView(frame: .zero, cameraMode: .ar, automaticallyConfigureSession: false)

        // gravityAndHeading: ワールド座標の -Z が真北、+X が東、+Y が上になる
        let configuration = ARWorldTrackingConfiguration()
        configuration.worldAlignment = .gravityAndHeading
        arView.session.run(configuration)

        context.coordinator.install(in: arView)
        return arView
    }

    func updateUIView(_ uiView: ARView, context: Context) {
        context.coordinator.bearing = bearing
    }

    static func dismantleUIView(_ uiView: ARView, coordinator: Coordinator) {
        coordinator.uninstall()
        uiView.session.pause()
    }

    final class Coordinator {
        var bearing: Double?

        private let arrow = ArrowEntity.make()
        private var updateSubscription: (any Cancellable)?

        func install(in arView: ARView) {
            // カメラに追従させ、常に画面中央やや下に表示する
            let cameraAnchor = AnchorEntity(.camera)
            arrow.position = [0, -0.08, -0.5]
            cameraAnchor.addChild(arrow)
            arView.scene.addAnchor(cameraAnchor)

            updateSubscription = arView.scene.subscribe(to: SceneEvents.Update.self) { [weak self] _ in
                self?.updateArrowOrientation()
            }
        }

        func uninstall() {
            updateSubscription?.cancel()
            updateSubscription = nil
        }

        private func updateArrowOrientation() {
            guard let bearing else {
                arrow.isEnabled = false
                return
            }
            arrow.isEnabled = true
            // 位置はカメラに追従させつつ、向きはワールド座標で固定する。
            // Y 軸まわりに -bearing 回転すると、-Z（真北）向きの矢印が方位 bearing を指す。
            let orientation = simd_quatf(angle: -Float(bearing), axis: [0, 1, 0])
            arrow.setOrientation(orientation, relativeTo: nil)
        }
    }
}

/// -Z 方向を指す矢印のエンティティ。
enum ArrowEntity {
    static func make() -> Entity {
        let material = SimpleMaterial(color: .systemOrange, roughness: 0.3, isMetallic: false)

        let shaft = ModelEntity(
            mesh: .generateBox(size: [0.025, 0.012, 0.16], cornerRadius: 0.004),
            materials: [material]
        )
        shaft.position = [0, 0, 0.02]

        // 円錐は +Y 向きに生成されるので、X 軸まわりに -90° 回して -Z 向きにする
        let head = ModelEntity(
            mesh: .generateCone(height: 0.08, radius: 0.035),
            materials: [material]
        )
        head.orientation = simd_quatf(angle: -.pi / 2, axis: [1, 0, 0])
        head.position = [0, 0, -0.1]

        let arrow = Entity()
        arrow.addChild(shaft)
        arrow.addChild(head)
        return arrow
    }
}
