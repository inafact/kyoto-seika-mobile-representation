import SwiftUI

struct ContentView: View {
    @State private var canvas = PaintCanvas()

    var body: some View {
        arContent
            .ignoresSafeArea()
            .overlay(alignment: .top) {
                if ARPaintView.isSupported {
                    statusPanel
                        .padding()
                }
            }
            .overlay(alignment: .bottom) {
                if ARPaintView.isSupported {
                    BrushToolbar(canvas: canvas)
                        .padding()
                }
            }
    }

    @ViewBuilder
    private var arContent: some View {
        if ARPaintView.isSupported {
            ARPaintView(canvas: canvas)
        } else {
            ContentUnavailableView(
                "AR に対応していません",
                systemImage: "arkit",
                description: Text("ARKit に対応した iPhone / iPad の実機で実行してください。")
            )
        }
    }

    private var statusPanel: some View {
        Group {
            if canvas.detectedPlaneCount == 0 {
                Label("平面を探しています…", systemImage: "viewfinder")
            } else {
                Label("平面をなぞって色を塗れます", systemImage: "hand.draw")
            }
        }
        .font(.headline)
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.regularMaterial, in: .rect(cornerRadius: 16))
    }
}

#Preview {
    ContentView()
}
