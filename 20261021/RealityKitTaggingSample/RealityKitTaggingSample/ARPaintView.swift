import SwiftUI
import RealityKit
import ARKit

/// カメラ映像の上で、検出した平面にタッチ操作で色を塗れる AR ビュー。
struct ARPaintView: UIViewRepresentable {
    let canvas: PaintCanvas

    static var isSupported: Bool { ARWorldTrackingConfiguration.isSupported }

    func makeCoordinator() -> PaintCanvas { canvas }

    func makeUIView(context: Context) -> ARView {
        let arView = ARView(frame: .zero, cameraMode: .ar, automaticallyConfigureSession: false)
        canvas.attach(to: arView)
        return arView
    }

    func updateUIView(_ uiView: ARView, context: Context) {}

    static func dismantleUIView(_ uiView: ARView, coordinator: PaintCanvas) {
        coordinator.detach(from: uiView)
    }
}
